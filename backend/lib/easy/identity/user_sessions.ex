defmodule Easy.Identity.UserSessions do
  import Ecto.Query

  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.Repo

  @refresh_token_expiration 7 * 24 * 60 * 60
  @refresh_token_bytes 64

  @spec create_session(User.t(), binary() | nil, UserSession.role(), binary() | nil, boolean(), map()) ::
          {:ok, UserSession.t()} | {:error, Ecto.Changeset.t()}
  def create_session(user, business_id, role, coach_id, owner?, attrs) do
    session_attrs =
      attrs
      |> Map.merge(%{
        expires_at: DateTime.add(DateTime.utc_now(), @refresh_token_expiration, :second),
        refresh_token: generate_refresh_token()
      })

    business_id
    |> UserSession.insert_changeset(user.id, role, coach_id, owner?, session_attrs)
    |> Repo.insert()
  end

  @spec get_by_refresh_token(String.t()) :: {:ok, UserSession.t()} | {:error, any()}
  def get_by_refresh_token(refresh_token) do
    case Repo.get_by(UserSession, refresh_token: refresh_token) do
      nil -> {:error, :session_not_found}
      session -> {:ok, session}
    end
  end

  @spec refresh_session(UserSession.t(), binary() | nil, UserSession.role(), binary() | nil, boolean(), map()) ::
          {:ok, UserSession.t()} | {:error, Ecto.Changeset.t()}
  def refresh_session(%UserSession{} = session, business_id, role, coach_id, owner?, attrs) do
    session
    |> UserSession.update_changeset(business_id, role, coach_id, owner?, attrs)
    |> Repo.update()
  end

  @spec revoke_user_sessions(String.t()) :: {:ok, non_neg_integer()}
  def revoke_user_sessions(user_id) do
    {count, _} =
      from(s in UserSession, where: s.user_id == ^user_id and is_nil(s.revoked_at))
      |> Repo.update_all(set: [revoked_at: DateTime.utc_now(:second)])

    {:ok, count}
  end

  @spec generate_refresh_token() :: String.t()
  def generate_refresh_token do
    :crypto.strong_rand_bytes(@refresh_token_bytes)
    |> Base.url_encode64(padding: false)
    |> String.downcase()
  end
end
