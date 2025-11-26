defmodule Easy.Clients do
  import Ecto.Query

  alias Easy.Repo
  alias Easy.Clients.Client
  alias Easy.Accounts
  alias Easy.Accounts.User
  alias Easy.Organizations.Coach
  alias Easy.Auth.Scope
  alias Easy.QueryHelpers

  @spec list_clients(Scope.t(), keyword()) :: {:ok, [Client.t()], integer()} | {:error, atom()}
  def list_clients(%Scope{} = scope, opts \\ []) do
    unless Scope.has_business_context?(scope) do
      {:error, :forbidden}
    else
      base_query =
        from(c in Client, order_by: [desc: c.inserted_at])
        |> QueryHelpers.scope_to_business(scope)

      query =
        case opts[:status] do
          nil -> base_query
          status -> from(c in base_query, where: c.status == ^status)
        end

      query =
        case opts[:search] do
          nil ->
            query

          search_term ->
            search = "%#{search_term}%"
            from(c in query, where: ilike(c.full_name, ^search) or ilike(c.email, ^search))
        end

      total = Repo.aggregate(query, :count)

      query =
        case opts[:limit] do
          nil -> query
          limit -> from(c in query, limit: ^limit, offset: ^(opts[:offset] || 0))
        end

      clients = Repo.all(query)
      {:ok, clients, total}
    end
  end

  @spec get_client(Scope.t(), String.t()) :: {:ok, Client.t()} | {:error, atom()}
  def get_client(%Scope{} = scope, client_id) when is_binary(client_id) do
    case Repo.get(Client, client_id) do
      nil ->
        {:error, :not_found}

      client ->
        cond do
          scope.client_id == client_id ->
            {:ok, client}

          scope.business_id == client.business_id and Scope.is_coach?(scope) ->
            {:ok, client}

          true ->
            {:error, :forbidden}
        end
    end
  end

  @spec get_my_profile(Scope.t()) :: {:ok, Client.t()} | {:error, atom()}
  def get_my_profile(%Scope{client_id: nil}), do: {:error, :not_found}

  def get_my_profile(%Scope{client_id: client_id}) do
    case Repo.get(Client, client_id) do
      nil -> {:error, :not_found}
      client -> {:ok, Repo.preload(client, [:business])}
    end
  end

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

  @spec archive_client(Scope.t(), String.t()) ::
          {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def archive_client(%Scope{} = scope, client_id) do
    update_client_status(scope, client_id, "archived")
  end

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

  @spec invite_client(Scope.t(), map()) ::
          {:ok, Client.t()} | {:error, atom() | Ecto.Changeset.t()}
  def invite_client(%Scope{business_id: nil}, _attrs), do: {:error, :forbidden}
  def invite_client(%Scope{coach_id: nil}, _attrs), do: {:error, :forbidden}

  def invite_client(%Scope{business_id: business_id, coach_id: coach_id} = _scope, attrs) do
    with {:ok, coach} <- get_coach_with_details(coach_id) do
      coach_name = User.full_name(coach.user)
      business_name = coach.business.name

      attrs_normalized = normalize_attrs(attrs) |> Map.put("business_id", business_id)
      email = attrs_normalized["email"]

      case find_existing_pending_client(email, business_id) do
        {:ok, existing_client} ->
          {:ok, existing_client}

        nil ->
          case create_client_with_coach_assignment(attrs_normalized, coach_id) do
            {:ok, client} ->
              send_invitation_email(
                client.email,
                client.invitation_token,
                coach_name,
                business_name
              )

              {:ok, client}

            {:error, changeset} ->
              {:error, changeset}
          end
      end
    end
  end

  defp create_client_with_coach_assignment(attrs, coach_id) do
    Ecto.Multi.new()
    |> Ecto.Multi.insert(:client, Client.create_changeset(%Client{}, attrs))
    |> Ecto.Multi.run(:assignment, fn _repo, %{client: client} ->
      assign_coach_to_client(coach_id, client.id)
    end)
    |> Repo.transaction()
    |> case do
      {:ok, %{client: client}} -> {:ok, client}
      {:error, :client, changeset, _} -> {:error, changeset}
      {:error, _, reason, _} -> {:error, reason}
    end
  end

  @spec get_invitation(String.t()) :: {:ok, Client.t()} | {:error, atom()}
  def get_invitation(invitation_token) do
    query =
      from(c in Client,
        where: c.invitation_token == ^invitation_token and c.status == "pending",
        preload: [:business]
      )

    case Repo.one(query) do
      nil ->
        {:error, :invalid_token}

      client ->
        if Client.invitation_valid?(client) do
          {:ok, client}
        else
          {:error, :token_expired}
        end
    end
  end

  @spec get_invitation_with_coach(String.t()) :: {:ok, map()} | {:error, atom()}
  def get_invitation_with_coach(invitation_token) do
    with {:ok, client} <- get_invitation(invitation_token) do
      coach_assignment =
        from(ca in Easy.Clients.CoachClientAssignment,
          where: ca.client_id == ^client.id,
          limit: 1,
          preload: [coach: [:user]]
        )
        |> Repo.one()

      inviting_coach = if coach_assignment, do: coach_assignment.coach, else: nil

      {:ok, %{client: client, inviting_coach: inviting_coach}}
    end
  end

  @spec complete_client_signup(String.t(), String.t()) ::
          {:ok, %{user: User.t(), client: Client.t(), session: map()}}
          | {:error, atom() | Ecto.Changeset.t()}
  def complete_client_signup(invitation_token, user_id) do
    with {:ok, client} <- get_invitation(invitation_token),
         {:ok, user} <- get_user(user_id),
         {:ok, updated_client} <- link_user_to_client(client, user),
         {:ok, session_data} <- Accounts.create_session(user) do
      client_with_coaches = Repo.preload(updated_client, coaches: [:user], business: [])
      {:ok, %{user: user, client: client_with_coaches, session: session_data}}
    end
  end

  @spec resend_invitation(Scope.t(), String.t()) :: {:ok, Client.t()} | {:error, atom()}
  def resend_invitation(%Scope{} = scope, client_id) do
    with :ok <- require_coach(scope),
         {:ok, client} <- get_client(scope, client_id),
         true <- client.status == "pending" || {:error, :already_active},
         {:ok, coach} <- get_coach_with_details(scope.coach_id) do
      {:ok, updated_client} =
        client
        |> Client.regenerate_invitation_changeset()
        |> Repo.update()

      send_invitation_email(
        updated_client.email,
        updated_client.invitation_token,
        User.full_name(coach.user),
        coach.business.name
      )

      {:ok, updated_client}
    end
  end

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

  defp find_existing_pending_client(email, business_id) do
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
      nil -> nil
      client -> {:ok, client}
    end
  end

  defp send_invitation_email(email, invitation_token, coach_name, business_name) do
    email_struct =
      Easy.Emails.client_invitation_email(email, invitation_token, coach_name, business_name)

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

  defp get_user(user_id) do
    case Repo.get(User, user_id) do
      nil -> {:error, :user_not_found}
      user -> {:ok, user}
    end
  end

  defp link_user_to_client(client, user) do
    client
    |> Client.link_user_changeset(user.id)
    |> Ecto.Changeset.change(%{invitation_token: nil, invitation_expires_at: nil})
    |> Repo.update()
  end

  defp assign_coach_to_client(coach_id, client_id) do
    alias Easy.Clients.CoachClientAssignment

    %CoachClientAssignment{}
    |> CoachClientAssignment.changeset(%{coach_id: coach_id, client_id: client_id})
    |> Repo.insert()
  end

  defp require_coach(%Scope{coach_id: nil}), do: {:error, :forbidden}
  defp require_coach(%Scope{coach_id: _coach_id}), do: :ok
end
