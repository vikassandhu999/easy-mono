defmodule Easy.Identity.SessionFactory do
  alias Easy.Clients.Client
  alias Easy.Coaches
  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.Identity.UserSessions
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Repo

  @type session_opts :: %{
          optional(:ip) => String.t() | nil,
          optional(:user_agent) => String.t() | nil,
          optional(:role) => UserSession.role() | nil
        }

  @type membership_error() :: :coach_membership_not_found | :client_membership_not_found
  @type session_error() :: :session_expired | :session_revoked
  @type write_error() :: membership_error() | Ecto.Changeset.t()
  @type scope() :: UserSession.scope()

  @spec create_session(User.t(), session_opts()) :: {:ok, UserSession.t()} | {:error, write_error()}
  def create_session(user, opts) do
    with {:ok, scope} <- validate_role(opts[:role] || :guest, user) do
      UserSessions.create_session(user, scope, session_metadata(opts))
    end
  end

  @spec refresh_session(User.t(), UserSession.t(), session_opts()) ::
          {:ok, UserSession.t()} | {:error, session_error() | write_error()}
  def refresh_session(user, session, opts) do
    with :ok <- validate_session(session),
         {:ok, scope} <- validate_role(opts[:role] || session.role || :guest, user) do
      UserSessions.refresh_session(session, scope, session_metadata(opts))
    end
  end

  defp validate_session(session) do
    cond do
      UserSession.expired?(session, DateTime.utc_now()) ->
        {:error, :session_expired}

      UserSession.revoked?(session) ->
        {:error, :session_revoked}

      true ->
        :ok
    end
  end

  defp validate_role(:coach, user) do
    case Coaches.get_active_coach_by_user_id(user.id) do
      {:ok, %Coach{} = coach} ->
        is_owner = Repo.exists?(Business.owned_by(coach.business_id, user.id))

        {:ok, %{role: :coach, business_id: coach.business_id, coach_id: coach.id, is_owner: is_owner}}

      {:error, :not_found} ->
        {:error, :coach_membership_not_found}
    end
  end

  defp validate_role(:client, user) do
    case Client |> Client.for_user(user.id) |> Client.active() |> Repo.one() do
      %Client{business_id: business_id} ->
        {:ok, %{role: :client, business_id: business_id}}

      nil ->
        {:error, :client_membership_not_found}
    end
  end

  defp validate_role(_role, _user), do: {:ok, %{role: :guest, business_id: nil}}

  defp session_metadata(opts), do: %{ip: opts[:ip] || "", user_agent: opts[:user_agent] || ""}
end
