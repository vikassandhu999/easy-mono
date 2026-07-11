defmodule Easy.Identity.SessionFactory do
  alias Easy.Clients.Client
  alias Easy.Coaches
  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.Identity.UserSessions
  alias Easy.Orgs
  alias Easy.Orgs.Coach
  alias Easy.Repo
  import Ecto.Query

  @type session_opts :: %{
          required(:ip) => String.t() | nil,
          required(:user_agent) => String.t() | nil,
          optional(:role) => atom() | nil,
          optional(atom()) => any()
        }

  @spec create_session(User.t(), session_opts()) :: {:ok, UserSession.t()} | {:error, any()}
  def create_session(user, opts) do
    with {:ok, attrs_with_role} <- validate_role(opts[:role] || :guest, user) do
      UserSessions.create_session(
        user,
        attrs_with_role[:business_id],
        attrs_with_role[:role],
        attrs_with_role[:coach_id],
        attrs_with_role[:is_owner] || false,
        %{ip: opts[:ip] || "", user_agent: opts[:user_agent] || ""}
      )
    end
  end

  @spec refresh_session(User.t(), UserSession.t(), session_opts()) ::
          {:ok, UserSession.t()} | {:error, any()}
  def refresh_session(user, session, opts) do
    role = opts[:role] || session.role

    with {:ok, attrs_with_role} <- validate_role(role || :guest, user) do
      business_id = attrs_with_role[:business_id]

      UserSessions.refresh_session(
        session,
        business_id,
        attrs_with_role[:role],
        attrs_with_role[:coach_id],
        attrs_with_role[:is_owner] || false,
        %{ip: opts[:ip] || "", user_agent: opts[:user_agent] || ""}
      )
    end
  end

  @spec validate_session(UserSession.t()) :: {:ok, UserSession.t()} | {:error, any()}
  def validate_session(session) do
    cond do
      UserSession.expired?(session) ->
        {:error, :session_expired}

      UserSession.revoked?(session) ->
        {:error, :session_revoked}

      true ->
        {:ok, session}
    end
  end

  @spec validate_role(atom(), User.t()) :: {:ok, map()} | {:error, any()}
  def validate_role(:coach, user) do
    case Coaches.get_active_coach_by_user_id(user.id) do
      %Coach{} = coach ->
        is_owner =
          Repo.exists?(from b in Orgs.Business, where: b.id == ^coach.business_id and b.owner_id == ^user.id)

        {:ok, %{role: :coach, business_id: coach.business_id, coach_id: coach.id, is_owner: is_owner}}

      nil ->
        {:error, :coach_membership_not_found}
    end
  end

  def validate_role(:client, user) do
    case Client |> Client.for_user(user.id) |> Client.accepted() |> Repo.one() do
      %Client{business_id: business_id} ->
        {:ok, %{role: :client, business_id: business_id}}

      nil ->
        {:error, :client_membership_not_found}
    end
  end

  def validate_role(_role, _user), do: {:ok, %{role: :guest, business_id: nil}}
end
