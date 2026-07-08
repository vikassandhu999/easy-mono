defmodule Easy.Identity.UserSessions do
  import Ecto.Query

  alias Easy.Identity.UserSession
  alias Easy.Identity.User
  alias Easy.Repo

  @refresh_token_expiration 7 * 24 * 60 * 60
  @refresh_token_bytes 64

  @spec create_session!(User.t(), map()) :: UserSession.t()
  def create_session!(user, attrs) do
    business_id = Map.get(attrs, :business_id) || Map.get(attrs, "business_id")

    session_attrs =
      attrs
      |> Map.drop([:business_id, "business_id"])
      |> Map.merge(%{
        expires_at: DateTime.add(DateTime.utc_now(), @refresh_token_expiration, :second),
        refresh_token: generate_refresh_token()
      })

    UserSession.new_session(user.id, business_id, session_attrs)
    |> Repo.insert!()
  end

  @spec get_by_refresh_token(String.t()) :: {:ok, UserSession.t()} | {:error, any()}
  def get_by_refresh_token(refresh_token) do
    case Repo.get_by(UserSession, refresh_token: refresh_token) do
      nil -> {:error, Easy.Error.new("session_not_found", "Session not found")}
      session -> {:ok, session}
    end
  end

  @spec refresh_session!(UserSession.t(), binary() | nil, map()) :: UserSession.t()
  def refresh_session!(%UserSession{} = session, business_id, attrs) do
    session
    |> UserSession.refresh_changeset(business_id, attrs)
    |> Repo.update!()
  end

  @spec revoke_all_for_user(String.t()) :: {non_neg_integer(), nil}
  def revoke_all_for_user(user_id) do
    from(s in UserSession, where: s.user_id == ^user_id and is_nil(s.revoked_at))
    |> Repo.update_all(set: [revoked_at: DateTime.utc_now(:second)])
  end

  @spec generate_refresh_token() :: String.t()
  def generate_refresh_token() do
    :crypto.strong_rand_bytes(@refresh_token_bytes)
    |> Base.url_encode64(padding: false)
    |> String.downcase()
  end
end
