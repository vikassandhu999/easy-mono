defmodule Easy.Identity.UserSessions do
  alias Easy.Identity.UserSession
  alias Easy.Identity.User
  alias Easy.Repo

  @refresh_token_expiration 7 * 24 * 60 * 60
  @refresh_token_bytes 32

  @spec create_session!(User.t(), String.t(), String.t()) :: UserSession.t()
  def create_session!(user, ip, user_agent) do
    %{
      ip: ip,
      user_agent: user_agent,
      expires_at: DateTime.add(DateTime.utc_now(), @refresh_token_expiration, :second),
      refresh_token:
        :crypto.strong_rand_bytes(@refresh_token_bytes) |> Base.url_encode64(padding: false),
      user_id: user.id,
      role: :guest
    }
    |> UserSession.new_session()
    |> Repo.insert!()
  end

  @spec get_by_refresh_token(String.t()) :: {:ok, UserSession.t()} | {:error, any()}
  def get_by_refresh_token(refresh_token) do
    case Repo.get_by(UserSession, refresh_token: refresh_token) do
      nil -> {:error, Easy.Error.new("session_not_found", "Session not found")}
      session -> {:ok, session}
    end
  end

  @spec touch_session(UserSession.t()) :: {:ok, UserSession.t()} | {:error, any()}
  def touch_session(%UserSession{} = session) do
    session
    |> UserSession.touch_session()
    |> Repo.update()
  end
end
