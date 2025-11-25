defmodule Easy.Clients do
  @moduledoc """
  The Clients context manages client profiles within a business.

  This context handles:
  - Client CRUD operations (scoped to business)
  - Client invitation workflow
  - Client profile management (self-service)

  ## Tenant Isolation
  All operations require a `Scope` and enforce `business_id` isolation.

  ## Client Lifecycle
  1. Coach invites client → Client created with `pending` status
  2. Client accepts invitation → User account created, client becomes `active`
  3. Coach can update client status to `inactive` or `archived`
  """

  import Ecto.Query

  alias Easy.Repo
  alias Easy.Clients.Client
  alias Easy.Accounts
  alias Easy.Accounts.{User, OneTimeToken}
  alias Easy.Organizations.Coach
  alias Easy.Auth.Scope
  alias Easy.QueryHelpers

  # ===========================================================================
  # Client Listing & Retrieval
  # ===========================================================================

  @doc """
  Lists clients for the current business with optional filters.

  ## Options
  - `:status` - Filter by client status ("pending", "active", "inactive", "archived")
  - `:limit` - Maximum number of results (default: 50, max: 100)
  - `:offset` - Offset for pagination (default: 0)
  - `:search` - Search by name or email

  ## Returns
  - `{:ok, clients, total}` - List of clients and total count
  - `{:error, :forbidden}` - No business context
  """
  @spec list_clients(Scope.t(), keyword()) :: {:ok, [Client.t()], integer()} | {:error, atom()}
  def list_clients(%Scope{} = scope, opts \\ []) do
    unless Scope.has_business_context?(scope) do
      {:error, :forbidden}
    else
      base_query =
        from(c in Client, order_by: [desc: c.inserted_at])
        |> QueryHelpers.scope_to_business(scope)

      # Apply status filter
      query =
        case opts[:status] do
          nil -> base_query
          status -> from(c in base_query, where: c.status == ^status)
        end

      # Apply search filter
      query =
        case opts[:search] do
          nil ->
            query

          search_term ->
            search = "%#{search_term}%"
            from(c in query, where: ilike(c.full_name, ^search) or ilike(c.email, ^search))
        end

      # Get total before pagination
      total = Repo.aggregate(query, :count)

      # Apply pagination
      query =
        case opts[:limit] do
          nil -> query
          limit -> from(c in query, limit: ^limit, offset: ^(opts[:offset] || 0))
        end

      clients = Repo.all(query)
      {:ok, clients, total}
    end
  end

  @doc """
  Gets a client by ID with proper access control.

  Access is granted if:
  - User owns this client profile (client_id matches)
  - User is a coach in the same business

  ## Returns
  - `{:ok, client}` - Client found and accessible
  - `{:error, :not_found}` - Client doesn't exist
  - `{:error, :forbidden}` - No access to this client
  """
  @spec get_client(Scope.t(), String.t()) :: {:ok, Client.t()} | {:error, atom()}
  def get_client(%Scope{} = scope, client_id) when is_binary(client_id) do
    case Repo.get(Client, client_id) do
      nil ->
        {:error, :not_found}

      client ->
        cond do
          # Client accessing their own profile
          scope.client_id == client_id ->
            {:ok, client}

          # Coach in the same business
          scope.business_id == client.business_id and Scope.is_coach?(scope) ->
            {:ok, client}

          true ->
            {:error, :forbidden}
        end
    end
  end

  @doc """
  Gets the client's own profile (for client users).
  Preloads business association for profile display.
  """
  @spec get_my_profile(Scope.t()) :: {:ok, Client.t()} | {:error, atom()}
  def get_my_profile(%Scope{client_id: nil}), do: {:error, :not_found}

  def get_my_profile(%Scope{client_id: client_id}) do
    case Repo.get(Client, client_id) do
      nil -> {:error, :not_found}
      client -> {:ok, Repo.preload(client, [:business])}
    end
  end

  # ===========================================================================
  # Client Updates (Coach Actions)
  # ===========================================================================

  @doc """
  Updates a client (coach action).
  Coaches can update all client fields except business_id.
  """
  @spec update_client(Scope.t(), String.t(), map()) ::
          {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def update_client(%Scope{} = scope, client_id, attrs) when is_binary(client_id) do
    with :ok <- require_coach(scope),
         {:ok, client} <- get_client(scope, client_id),
         true <- Client.editable?(client) || {:error, :archived} do
      client
      |> Client.update_changeset(attrs)
      |> Repo.update()
    end
  end

  @doc """
  Updates client status (coach action).
  """
  @spec update_client_status(Scope.t(), String.t(), String.t()) ::
          {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def update_client_status(%Scope{} = scope, client_id, status) do
    with :ok <- require_coach(scope),
         {:ok, client} <- get_client(scope, client_id) do
      client
      |> Client.status_changeset(status)
      |> Repo.update()
    end
  end

  @doc """
  Archives a client (soft delete).
  """
  @spec archive_client(Scope.t(), String.t()) ::
          {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def archive_client(%Scope{} = scope, client_id) do
    update_client_status(scope, client_id, "archived")
  end

  # ===========================================================================
  # Client Profile Updates (Client Self-Service)
  # ===========================================================================

  @doc """
  Updates the client's own profile (client action).
  Clients can only update their own profile with restricted fields.
  """
  @spec update_my_profile(Scope.t(), map()) ::
          {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def update_my_profile(%Scope{client_id: nil}, _attrs), do: {:error, :forbidden}

  def update_my_profile(%Scope{client_id: client_id} = scope, attrs) do
    with {:ok, client} <- get_client(scope, client_id) do
      client
      |> Client.profile_changeset(attrs)
      |> Repo.update()
    end
  end

  # ===========================================================================
  # Client Invitation
  # ===========================================================================

  @doc """
  Creates a client invitation (coach action).

  This creates:
  1. A client record with `pending` status
  2. An invitation token (OneTimeToken) with 7-day expiration
  3. Sends an invitation email

  ## Idempotency
  If an active invitation already exists for this email/business,
  returns the existing invitation.

  ## Returns
  - `{:ok, %{client: client, invitation_token: token_id, expires_at: datetime}}`
  - `{:error, reason}`
  """
  @spec invite_client(Scope.t(), map()) :: {:ok, map()} | {:error, atom() | Ecto.Changeset.t()}
  def invite_client(%Scope{business_id: nil}, _attrs), do: {:error, :forbidden}
  def invite_client(%Scope{coach_id: nil}, _attrs), do: {:error, :forbidden}

  def invite_client(%Scope{business_id: business_id, coach_id: coach_id} = _scope, attrs) do
    with {:ok, coach} <- get_coach_with_details(coach_id) do
      coach_name = User.full_name(coach.user)
      business_name = coach.business.name

      attrs_normalized = normalize_attrs(attrs) |> Map.put("business_id", business_id)
      email = attrs_normalized["email"]

      # Check for existing pending invitation (idempotency)
      case find_existing_invitation(email, business_id) do
        {:ok, existing_client, existing_token} ->
          {:ok,
           %{
             client: existing_client,
             invitation_token: existing_token.id,
             expires_at: existing_token.expires_at
           }}

        nil ->
          create_new_invitation(
            attrs_normalized,
            coach_id,
            business_id,
            coach_name,
            business_name
          )
      end
    end
  end

  @doc """
  Gets invitation details by token ID (public endpoint).
  Returns invitation, client, and business info for display.
  """
  @spec get_invitation(String.t()) ::
          {:ok, %{token: OneTimeToken.t(), client: Client.t()}} | {:error, atom()}
  def get_invitation(token_id) do
    query =
      from(t in OneTimeToken,
        where: t.id == ^token_id and t.type == "client_invitation" and is_nil(t.used_at)
      )

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
            with {:ok, client_id} <- validate_invitation_metadata(token.metadata),
                 client when not is_nil(client) <- Repo.get(Client, client_id) do
              {:ok, %{token: token, client: Repo.preload(client, :business)}}
            else
              nil -> {:error, :client_not_found}
              {:error, reason} -> {:error, reason}
            end
        end
    end
  end

  @doc """
  Completes client registration by accepting an invitation.

  This:
  1. Verifies the OTP code
  2. Creates a user account
  3. Links user to client, activates client
  4. Creates a session and returns tokens

  ## Returns
  - `{:ok, %{user: user, client: client, session: session_data}}`
  - `{:error, reason}`
  """
  @spec accept_invitation(String.t(), String.t()) ::
          {:ok, %{user: User.t(), client: Client.t(), session: map()}} | {:error, atom()}
  def accept_invitation(token_id, code) do
    with {:ok, %{token: token, client: client}} <- get_invitation(token_id),
         :ok <- verify_otp_code(token, code),
         :ok <- check_max_attempts(token),
         {:ok, result} <- complete_registration(token, client) do
      {:ok, result}
    end
  end

  @doc """
  Resends the invitation email for a pending client.
  Generates a new OTP code but uses the same token.
  """
  @spec resend_invitation(Scope.t(), String.t()) :: {:ok, Client.t()} | {:error, atom()}
  def resend_invitation(%Scope{} = scope, client_id) do
    with :ok <- require_coach(scope),
         {:ok, client} <- get_client(scope, client_id),
         true <- client.status == "pending" || {:error, :already_active} do
      # Find the existing invitation token
      token =
        from(t in OneTimeToken,
          where:
            t.type == "client_invitation" and
              is_nil(t.used_at) and
              fragment("?->>'client_id' = ?", t.metadata, ^client.id),
          order_by: [desc: t.inserted_at],
          limit: 1
        )
        |> Repo.one()

      case token do
        nil ->
          {:error, :no_invitation_found}

        token ->
          # Generate new OTP and update token
          new_code = generate_otp_code()
          new_expires_at = DateTime.add(DateTime.utc_now(), 7 * 24 * 60 * 60, :second)

          token
          |> OneTimeToken.changeset(%{code: new_code, expires_at: new_expires_at})
          |> Repo.update()

          # Get coach details for email
          coach = Repo.get(Coach, scope.coach_id) |> Repo.preload([:user, :business])

          send_invitation_email(
            client.email,
            token.id,
            User.full_name(coach.user),
            coach.business.name
          )

          {:ok, client}
      end
    end
  end

  # ===========================================================================
  # Private Helpers - Invitation
  # ===========================================================================

  defp get_coach_with_details(coach_id) do
    case Repo.get(Coach, coach_id) do
      nil -> {:error, :coach_not_found}
      coach -> {:ok, Repo.preload(coach, [:user, :business])}
    end
  end

  defp normalize_attrs(attrs) when is_map(attrs) do
    Enum.reduce(attrs, %{}, fn
      {key, value}, acc when is_atom(key) -> Map.put(acc, Atom.to_string(key), value)
      {key, value}, acc when is_binary(key) -> Map.put(acc, key, value)
      {key, value}, acc -> Map.put(acc, to_string(key), value)
    end)
  end

  defp find_existing_invitation(email, business_id) do
    client =
      from(c in Client,
        where:
          c.email == ^String.downcase(email) and
            c.business_id == ^business_id and
            c.status == "pending",
        limit: 1
      )
      |> Repo.one()

    case client do
      nil ->
        nil

      client ->
        token =
          from(t in OneTimeToken,
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

  defp create_new_invitation(attrs, coach_id, business_id, coach_name, business_name) do
    case %Client{} |> Client.create_changeset(attrs) |> Repo.insert() do
      {:ok, client} ->
        metadata = %{
          client_id: client.id,
          business_id: business_id,
          coach_id: coach_id,
          inviting_coach_id: coach_id
        }

        case generate_invitation_token(client.email, metadata) do
          {:ok, token_id, expires_at} ->
            send_invitation_email(client.email, token_id, coach_name, business_name)
            {:ok, %{client: client, invitation_token: token_id, expires_at: expires_at}}

          {:error, reason} ->
            Repo.delete(client)
            {:error, reason}
        end

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  defp generate_invitation_token(_email, metadata) do
    otp_code = generate_otp_code()
    expires_at = DateTime.add(DateTime.utc_now(), 7 * 24 * 60 * 60, :second)

    attrs = %{
      code: otp_code,
      type: "client_invitation",
      expires_at: expires_at,
      metadata: metadata
    }

    case %OneTimeToken{} |> OneTimeToken.changeset(attrs) |> Repo.insert() do
      {:ok, token} -> {:ok, token.id, expires_at}
      {:error, changeset} -> {:error, changeset}
    end
  end

  defp send_invitation_email(email, token_id, coach_name, business_name) do
    email_struct = Easy.Emails.client_invitation_email(email, token_id, coach_name, business_name)

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

  defp validate_invitation_metadata(nil), do: {:error, :invalid_metadata}

  defp validate_invitation_metadata(metadata) do
    cond do
      is_nil(metadata["client_id"]) -> {:error, :invalid_metadata}
      is_nil(metadata["business_id"]) -> {:error, :invalid_metadata}
      is_nil(metadata["inviting_coach_id"]) -> {:error, :invalid_metadata}
      true -> {:ok, metadata["client_id"]}
    end
  end

  defp verify_otp_code(token, code) do
    if OneTimeToken.verify_code?(token, code) do
      :ok
    else
      # Increment attempts
      token |> OneTimeToken.increment_attempts_changeset() |> Repo.update()
      {:error, :invalid_otp}
    end
  end

  defp check_max_attempts(token) do
    max_attempts = Application.get_env(:easy, :auth, []) |> Keyword.get(:otp_max_attempts, 3)

    if token.attempts >= max_attempts do
      {:error, :max_attempts}
    else
      :ok
    end
  end

  defp complete_registration(token, client) do
    {first_name, last_name} = split_full_name(client.full_name)
    inviting_coach_id = token.metadata["inviting_coach_id"]

    Ecto.Multi.new()
    |> Ecto.Multi.run(:user, fn _repo, _changes ->
      Accounts.create_user(%{
        email: client.email,
        first_name: first_name,
        last_name: last_name,
        email_verified: true,
        email_verified_at: DateTime.utc_now() |> DateTime.truncate(:second)
      })
    end)
    |> Ecto.Multi.run(:client, fn _repo, %{user: user} ->
      client
      |> Client.link_user_changeset(user.id)
      |> Repo.update()
    end)
    |> Ecto.Multi.run(:assign_coach, fn _repo, %{client: updated_client} ->
      assign_coach_to_client(inviting_coach_id, updated_client.id)
    end)
    |> Ecto.Multi.run(:mark_used, fn _repo, _changes ->
      token
      |> OneTimeToken.mark_used_changeset()
      |> Repo.update()
    end)
    |> Ecto.Multi.run(:session, fn _repo, %{user: user} ->
      Accounts.create_session(user)
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{user: user, client: client, session: session_data}} ->
        # Preload coaches for the response
        client_with_coaches = Repo.preload(client, coaches: [:user])
        {:ok, %{user: user, client: client_with_coaches, session: session_data}}

      {:error, _step, reason, _changes} ->
        {:error, reason}
    end
  end

  defp assign_coach_to_client(coach_id, client_id) do
    alias Easy.Clients.CoachClientAssignment

    %CoachClientAssignment{}
    |> CoachClientAssignment.changeset(%{coach_id: coach_id, client_id: client_id})
    |> Repo.insert()
  end

  defp split_full_name(full_name) do
    case String.split(full_name, " ", parts: 2) do
      [first, last] -> {first, last}
      [first] -> {first, nil}
      _ -> {full_name, nil}
    end
  end

  defp generate_otp_code do
    :rand.uniform(999_999)
    |> Integer.to_string()
    |> String.pad_leading(6, "0")
  end

  # ===========================================================================
  # Private Helpers - Authorization
  # ===========================================================================

  defp require_coach(%Scope{coach_id: nil}), do: {:error, :forbidden}
  defp require_coach(%Scope{coach_id: _coach_id}), do: :ok
end
