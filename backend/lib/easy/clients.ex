defmodule Easy.Clients do
  import Ecto.Query

  alias Easy.Repo
  alias Easy.Clients.Client
  alias Easy.Accounts
  alias Easy.Organizations.Coach
  alias Easy.Auth.Scope
  alias Easy.QueryHelpers
  alias EasyWeb.Authorization

  def list_clients(%Scope{} = scope) do
    if Scope.has_business_context?(scope) do
      clients =
        from(c in Client, order_by: [desc: c.inserted_at])
        |> QueryHelpers.scope_to_business(scope)
        |> Repo.all()

      {:ok, clients}
    else
      {:error, :forbidden}
    end
  end

  def get_client(%Scope{} = scope, client_id) when is_binary(client_id) do
    case Repo.get(Client, client_id) do
      nil ->
        {:error, :not_found}

      client ->
        # Check if scope has access to this client
        # Access granted if: user owns the client profile OR client is in scope's business
        cond do
          scope.client_id == client_id ->
            {:ok, client}

          scope.business_id == client.business_id ->
            {:ok, client}

          true ->
            {:error, :forbidden}
        end
    end
  end

  def create_client(%Scope{business_id: business_id} = _scope, attrs)
      when not is_nil(business_id) do
    attrs_with_business =
      attrs
      |> Map.put(:business_id, business_id)

    %Client{}
    |> Client.create_changeset(attrs_with_business)
    |> Repo.insert()
  end

  def create_client(%Scope{}, _attrs), do: {:error, :forbidden}

  def update_client(%Scope{} = scope, client_id, attrs) when is_binary(client_id) do
    with {:ok, client} <- get_client(scope, client_id),
         :ok <- verify_client_update_access(scope, client_id, client.business_id) do
      client
      |> Client.update_changeset(attrs)
      |> Repo.update()
    end
  end

  # Helper to verify update access - client can update themselves, or coach can update clients in their business
  defp verify_client_update_access(
         %Scope{client_id: client_id},
         requested_client_id,
         _business_id
       )
       when client_id == requested_client_id do
    :ok
  end

  defp verify_client_update_access(
         %Scope{coach_id: coach_id, business_id: business_id},
         _client_id,
         client_business_id
       )
       when not is_nil(coach_id) and business_id == client_business_id do
    :ok
  end

  defp verify_client_update_access(_scope, _client_id, _business_id), do: {:error, :forbidden}

  def delete_client(%Scope{} = scope, client_id) when is_binary(client_id) do
    with {:ok, client} <- get_client(scope, client_id) do
      Repo.delete(client)
    end
  end

  def invite_client(%Scope{business_id: business_id, coach_id: coach_id} = _scope, attrs)
      when not is_nil(business_id) and not is_nil(coach_id) do
    # Load coach with user and business for email details
    case Repo.get(Coach, coach_id) do
      nil ->
        {:error, :coach_not_found}

      coach ->
        coach = Repo.preload(coach, [:user, :business])

        create_invitation_with_details(
          coach_id,
          business_id,
          attrs,
          coach.user.full_name,
          coach.business.name
        )
    end
  end

  def invite_client(%Scope{}, _attrs), do: {:error, :forbidden}

  defp create_invitation_with_details(coach_id, business_id, attrs, coach_name, business_name) do
    # Ensure business_id is set in attrs with consistent string keys to avoid mixed-key maps
    attrs_with_business =
      attrs
      |> normalize_invitation_attrs()
      |> Map.put("business_id", business_id)

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

  defp normalize_invitation_attrs(attrs) when is_map(attrs) do
    Enum.reduce(attrs, %{}, fn
      {key, value}, acc when is_atom(key) -> Map.put(acc, Atom.to_string(key), value)
      {key, value}, acc when is_binary(key) -> Map.put(acc, key, value)
      {key, value}, acc -> Map.put(acc, to_string(key), value)
    end)
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
  end

  defp send_invitation_email(email, token_uuid, coach_name, business_name) do
    email_struct =
      Easy.Emails.client_invitation_email(email, token_uuid, coach_name, business_name)

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

  def get_invitation(token_uuid) do
    query =
      from t in OneTimeToken,
        where: t.token == ^token_uuid and t.type == "client_invitation" and is_nil(t.used_at)

    case Repo.one(query) do
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
                case Repo.get(Client, client_id) do
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
        case Easy.Organizations.get_coach_legacy(metadata["inviting_coach_id"]) do
          nil ->
            {:error, "Inviting coach not found"}

          _coach ->
            {:ok, metadata["client_id"]}
        end
    end
  end

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
                  case Easy.Organizations.assign_client(inviting_coach_id, updated_client.id) do
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
end
