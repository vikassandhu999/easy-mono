defmodule Easy.Clients do
  @moduledoc """
  Clients context handles client management and invitation flows.

  This is the public API for:
  - Client CRUD operations
  - Client invitation flow
  - Client-coach relationships
  """

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Clients.Client
  alias Easy.Accounts
  alias Easy.Coaches.Coach

  # ============================================
  # CLIENT INVITATION FLOW
  # ============================================

  @doc """
  Creates a client invitation.

  This function:
  1. Creates a client record with pending status
  2. Generates an invitation token (OTP) with 7-day expiration
  3. Sends an invitation email with the token

  ## Parameters
    - coach: The coach struct or coach_id who is inviting the client
    - attrs: Map of client attributes (email, full_name, phone, notes, business_id)

  ## Returns
    - {:ok, %{client: client, invitation_token: token_uuid, expires_at: datetime}} on success
    - {:error, changeset} on validation failure
    - {:error, :rate_limited, retry_after} if rate limit exceeded

  ## Examples

      iex> create_invitation(coach, %{
        email: "client@example.com",
        full_name: "Jane Client",
        business_id: 123
      })
      {:ok, %{client: %Client{}, invitation_token: "550e8400-...", expires_at: ~U[2024-01-08 12:00:00Z]}}
  """
  def create_invitation(%Coach{id: coach_id, business_id: business_id} = coach, attrs) do
    # Preload user and business for email
    coach = Repo.preload(coach, [:user, :business])

    create_invitation_with_details(
      coach_id,
      business_id,
      attrs,
      coach.user.full_name,
      coach.business.name
    )
  end

  def create_invitation(coach_id, business_id, attrs)
      when is_integer(coach_id) and is_integer(business_id) do
    # Load coach with user and business for email details
    coach =
      Easy.Coaches.get_coach(coach_id)
      |> Repo.preload([:user, :business])

    if coach do
      create_invitation_with_details(
        coach_id,
        business_id,
        attrs,
        coach.user.full_name,
        coach.business.name
      )
    else
      {:error, :coach_not_found}
    end
  end

  defp create_invitation_with_details(coach_id, business_id, attrs, coach_name, business_name) do
    # Ensure business_id is set in attrs
    attrs_with_business = Map.put(attrs, :business_id, business_id)
    email = attrs_with_business["email"] || attrs_with_business[:email]

    # Check for existing pending invitation (idempotency)
    case get_existing_pending_invitation(email, business_id) do
      {:ok, existing_client, existing_token} ->
        # Return existing invitation
        {:ok,
         %{
           client: existing_client,
           invitation_token: existing_token.token,
           expires_at: existing_token.expires_at
         }}

      nil ->
        # No existing invitation, create new one
        create_new_invitation(
          attrs_with_business,
          coach_id,
          business_id,
          coach_name,
          business_name
        )
    end
  end

  # Gets an existing pending invitation for the same email and business
  defp get_existing_pending_invitation(email, business_id) do
    # Find pending client with this email in this business
    client =
      from(c in Client,
        where:
          c.email == ^String.downcase(email) and c.business_id == ^business_id and
            c.status == "pending",
        limit: 1
      )
      |> Repo.one()

    case client do
      nil ->
        nil

      client ->
        # Find active invitation token for this client
        token =
          from(t in Easy.Accounts.OneTimeToken,
            where:
              t.type == "client_invitation" and
                is_nil(t.used_at) and
                t.expires_at > ^DateTime.utc_now() and
                fragment("?->>'client_id' = ?", t.metadata, ^to_string(client.id)),
            order_by: [desc: t.inserted_at],
            limit: 1
          )
          |> Repo.one()

        case token do
          nil -> nil
          token -> {:ok, client, token}
        end
    end
  end

  # Creates a new invitation
  defp create_new_invitation(
         attrs_with_business,
         coach_id,
         business_id,
         coach_name,
         business_name
       ) do
    # Create client with pending status
    case %Client{}
         |> Client.create_changeset(attrs_with_business)
         |> Repo.insert() do
      {:ok, client} ->
        # Generate invitation token with client metadata
        metadata = %{
          client_id: client.id,
          business_id: business_id,
          inviting_coach_id: coach_id
        }

        # Generate the token without sending email
        case generate_invitation_token(client.email, metadata) do
          {:ok, token_uuid, expires_at} ->
            # Send invitation email with proper template
            send_invitation_email(client.email, token_uuid, coach_name, business_name)
            {:ok, %{client: client, invitation_token: token_uuid, expires_at: expires_at}}

          {:error, :rate_limited, retry_after} ->
            # Clean up the client record if token generation fails
            Repo.delete(client)
            {:error, :rate_limited, retry_after}

          {:error, reason} ->
            # Clean up the client record if token generation fails
            Repo.delete(client)
            {:error, reason}
        end

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  # Generate invitation token without sending email
  defp generate_invitation_token(email, metadata) do
    # Check rate limit
    case Accounts.check_rate_limit(email) do
      {:ok, :allowed} ->
        # Generate 6-digit OTP code (for later verification)
        otp_code = generate_otp_code()

        # Generate UUID token for invitation links
        token_uuid = Ecto.UUID.generate()

        # Set expiration to 7 days for invitations
        expires_at = DateTime.add(DateTime.utc_now(), 7 * 24 * 60 * 60, :second)

        attrs = %{
          token: token_uuid,
          code: otp_code,
          type: "client_invitation",
          email: email,
          expires_at: expires_at,
          metadata: metadata
        }

        case %Easy.Accounts.OneTimeToken{}
             |> Easy.Accounts.OneTimeToken.changeset(attrs)
             |> Repo.insert() do
          {:ok, _token} ->
            {:ok, token_uuid, expires_at}

          {:error, changeset} ->
            {:error, changeset}
        end

      {:error, :rate_limited, retry_after} ->
        {:error, :rate_limited, retry_after}
    end
  end

  # Send invitation email with proper template
  defp send_invitation_email(email, token_uuid, coach_name, business_name) do
    email_struct =
      Easy.Emails.client_invitation_email(email, token_uuid, coach_name, business_name)

    # Send email asynchronously with error handling
    Easy.MailerDelivery.deliver_async(email_struct,
      metadata: %{
        type: "client_invitation",
        email: email,
        coach_name: coach_name,
        business_name: business_name
      }
    )

    :ok
  end

  # Generate a random 6-digit OTP code
  defp generate_otp_code do
    :rand.uniform(999_999)
    |> Integer.to_string()
    |> String.pad_leading(6, "0")
  end

  @doc """
  Gets an invitation by token UUID.

  Validates that:
  - The invitation token exists
  - The token is of type "client_invitation"
  - The token has not been used
  - The token has not expired
  - The token metadata is valid (client_id, business_id, inviting_coach_id)

  Returns the invitation token with preloaded client data.

  ## Parameters
    - token_uuid: The invitation token UUID

  ## Returns
    - {:ok, %{token: token, client: client}} on success
    - {:error, :invalid_token} if token doesn't exist or is invalid
    - {:error, :token_expired} if token has expired
    - {:error, :token_used} if token was already used
    - {:error, :metadata_validation_failed, reason} if metadata validation fails

  ## Examples

      iex> get_invitation("550e8400-e29b-41d4-a716-446655440000")
      {:ok, %{token: %OneTimeToken{}, client: %Client{}}}

      iex> get_invitation("invalid-uuid")
      {:error, :invalid_token}
  """
  def get_invitation(token_uuid) do
    case Accounts.get_invitation_token(token_uuid) do
      nil ->
        {:error, :invalid_token}

      token ->
        cond do
          token.used_at != nil ->
            {:error, :token_used}

          DateTime.compare(token.expires_at, DateTime.utc_now()) == :lt ->
            {:error, :token_expired}

          true ->
            # Validate metadata
            case validate_invitation_metadata(token.metadata) do
              {:ok, client_id} ->
                case get_client(client_id) do
                  nil ->
                    {:error, :metadata_validation_failed, "Client not found"}

                  client ->
                    # Preload business for invitation display
                    client = Repo.preload(client, :business)
                    {:ok, %{token: token, client: client}}
                end

              {:error, reason} ->
                {:error, :metadata_validation_failed, reason}
            end
        end
    end
  end

  @doc """
  Validates invitation token metadata.

  Checks that:
  - client_id exists in metadata
  - business_id exists in metadata
  - inviting_coach_id exists in metadata and references a valid coach

  ## Parameters
    - metadata: The token metadata map

  ## Returns
    - {:ok, client_id} on success
    - {:error, reason} on validation failure

  ## Examples

      iex> validate_invitation_metadata(%{"client_id" => "123", "business_id" => "456", "inviting_coach_id" => "789"})
      {:ok, "123"}

      iex> validate_invitation_metadata(%{})
      {:error, "Missing client_id in invitation metadata"}
  """
  def validate_invitation_metadata(metadata) do
    cond do
      is_nil(metadata["client_id"]) ->
        {:error, "Missing client_id in invitation metadata"}

      is_nil(metadata["business_id"]) ->
        {:error, "Missing business_id in invitation metadata"}

      is_nil(metadata["inviting_coach_id"]) ->
        {:error, "Missing inviting_coach_id in invitation metadata"}

      true ->
        # Validate that inviting coach exists
        case Easy.Coaches.get_coach(metadata["inviting_coach_id"]) do
          nil ->
            {:error, "Inviting coach not found"}

          _coach ->
            {:ok, metadata["client_id"]}
        end
    end
  end

  @doc """
  Completes client registration by verifying OTP and creating user account.

  This function combines the previous "accept" and "complete" steps into a single operation.
  It:
  1. Validates the invitation token
  2. Verifies the OTP code against the invitation token
  3. Creates a user account for the client
  4. Links the user to the existing client record
  5. Activates the client (changes status to "active")
  6. Automatically creates a coach-client assignment to the inviting coach
  7. Creates a session for the new user
  8. Marks the invitation token as used

  ## Parameters
    - token_id: The invitation token UUID
    - code: The 6-digit OTP code

  ## Returns
    - {:ok, %{user: user, client: client, session: session_data}} on success
    - {:error, reason} on failure

  ## Examples

      iex> complete_client_registration("550e8400-...", "123456")
      {:ok, %{
        user: %User{},
        client: %Client{status: "active"},
        session: %{access_token: "...", refresh_token: "..."}
      }}

      iex> complete_client_registration("550e8400-...", "wrong")
      {:error, :invalid_otp}
  """
  def complete_client_registration(token_id, code) do
    # Get the invitation token to retrieve client and coach info
    case get_invitation(token_id) do
      {:ok, %{token: invitation_token, client: client}} ->
        # Verify the OTP code against the invitation token
        # The invitation token itself contains the OTP code
        if not Easy.Accounts.OneTimeToken.verify_code(invitation_token, code) do
          # Increment attempts on the invitation token
          invitation_token
          |> Easy.Accounts.OneTimeToken.increment_attempts_changeset()
          |> Repo.update()

          {:error, :invalid_otp}
        else
          # Check if max attempts exceeded
          auth_config = Application.get_env(:easy, :auth, [])
          max_attempts = Keyword.get(auth_config, :otp_max_attempts, 3)

          if invitation_token.attempts >= max_attempts do
            {:error, :max_attempts}
          else
            # Extract metadata from invitation token
            client_id = invitation_token.metadata["client_id"]
            inviting_coach_id = invitation_token.metadata["inviting_coach_id"]

            # Verify the client_id matches
            if client.id != client_id do
              {:error, :metadata_validation_failed, "Client ID mismatch"}
            else
              # Use a transaction to ensure all operations succeed or fail together
              Ecto.Multi.new()
              |> Ecto.Multi.run(:user, fn _repo, _changes ->
                # Create user account
                Accounts.create_user(%{
                  email: client.email,
                  full_name: client.full_name,
                  email_verified: true,
                  email_verified_at: DateTime.utc_now() |> DateTime.truncate(:second)
                })
              end)
              |> Ecto.Multi.run(:client, fn _repo, %{user: user} ->
                # Link user to client and activate
                client
                |> Client.link_user_changeset(user.id)
                |> Repo.update()
              end)
              |> Ecto.Multi.run(:assignment, fn _repo, %{client: updated_client} ->
                # Create coach-client assignment to inviting coach
                if inviting_coach_id do
                  case Easy.Coaches.assign_client(inviting_coach_id, updated_client.id) do
                    {:ok, assignment} -> {:ok, assignment}
                    {:error, changeset} -> {:error, changeset}
                  end
                else
                  # No inviting coach, skip assignment
                  {:ok, nil}
                end
              end)
              |> Ecto.Multi.run(:mark_used, fn _repo, _changes ->
                # Mark invitation token as used
                invitation_token
                |> Easy.Accounts.OneTimeToken.mark_used_changeset()
                |> Repo.update()
              end)
              |> Ecto.Multi.run(:session, fn _repo, %{user: user} ->
                # Create session for the new user
                Accounts.create_session(user)
              end)
              |> Repo.transaction()
              |> case do
                {:ok, %{user: user, client: client, session: session_data}} ->
                  {:ok,
                   %{
                     user: user,
                     client: client,
                     session: session_data
                   }}

                {:error, _step, reason, _changes} ->
                  {:error, reason}
              end
            end
          end
        end

      {:error, :metadata_validation_failed, reason} ->
        {:error, :metadata_validation_failed, reason}

      {:error, reason} ->
        {:error, reason}
    end
  end

  # ============================================
  # CLIENT MANAGEMENT
  # ============================================

  @doc """
  Gets a client by ID.
  Returns the client struct or nil if not found.

  ## Examples

      iex> get_client(123)
      %Client{}

      iex> get_client(999)
      nil
  """
  def get_client(id), do: Repo.get(Client, id)

  @doc """
  Gets a client by ID and preloads associations.

  ## Parameters
    - id: The client ID
    - preloads: List of associations to preload (default: [:user, :business])

  ## Examples

      iex> get_client_with_preloads(123)
      %Client{user: %User{}, business: %Business{}}

      iex> get_client_with_preloads(123, [:user])
      %Client{user: %User{}}
  """
  def get_client_with_preloads(id, preloads \\ [:user, :business]) do
    case get_client(id) do
      nil -> nil
      client -> Repo.preload(client, preloads)
    end
  end

  @doc """
  Updates a client with the given attributes.

  ## Examples

      iex> update_client(client, %{notes: "Updated notes"})
      {:ok, %Client{}}

      iex> update_client(client, %{email: "invalid"})
      {:error, %Ecto.Changeset{}}
  """
  def update_client(%Client{} = client, attrs) do
    client
    |> Client.update_changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Updates a client's status.

  ## Parameters
    - client: The client struct
    - status: The new status ("pending", "active", "inactive", "archived")

  ## Examples

      iex> update_client_status(client, "active")
      {:ok, %Client{status: "active"}}
  """
  def update_client_status(%Client{} = client, status) do
    client
    |> Client.status_changeset(status)
    |> Repo.update()
  end

  @doc """
  Lists clients with optional filtering and pagination.

  ## Parameters
    - business_id: The business ID to filter by
    - opts: Keyword list of options
      - :status - Filter by status
      - :limit - Number of results per page (default: 50)
      - :offset - Number of results to skip (default: 0)

  ## Examples

      iex> list_clients(123, status: "active", limit: 10)
      [%Client{}, %Client{}]
  """
  def list_clients(business_id, opts \\ []) do
    status = Keyword.get(opts, :status)
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from c in Client,
        where: c.business_id == ^business_id,
        order_by: [desc: c.inserted_at],
        limit: ^limit,
        offset: ^offset

    query =
      if status do
        from c in query, where: c.status == ^status
      else
        query
      end

    Repo.all(query)
  end

  @doc """
  Lists all coaches assigned to a client.

  ## Parameters
    - client_id: The client ID

  ## Returns
    - List of coaches assigned to the client

  ## Examples

      iex> list_client_coaches(123)
      [%Coach{}, %Coach{}]
  """
  def list_client_coaches(client_id) do
    case get_client(client_id) do
      nil ->
        []

      client ->
        client
        |> Repo.preload(:coaches)
        |> Map.get(:coaches)
    end
  end

  @doc """
  Gets a client by user_id and business_id.

  ## Examples

      iex> get_client_by_user_and_business(123, 456)
      %Client{}

      iex> get_client_by_user_and_business(999, 888)
      nil
  """
  def get_client_by_user_and_business(user_id, business_id) do
    from(c in Client,
      where: c.user_id == ^user_id and c.business_id == ^business_id
    )
    |> Repo.one()
  end

  @doc """
  Checks if a client exists by email in a business.

  ## Examples

      iex> client_exists_by_email?("client@example.com", 123)
      true

      iex> client_exists_by_email?("new@example.com", 123)
      false
  """
  def client_exists_by_email?(email, business_id) do
    query =
      from c in Client,
        where: c.email == ^String.downcase(email) and c.business_id == ^business_id

    Repo.exists?(query)
  end
end
