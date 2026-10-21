defmodule Easy.Identity.AuthTokens do
  alias Easy.Identity.OneTimeToken
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.SessionFactory
  alias Easy.Identity.Token
  alias Easy.Identity.User
  alias Easy.Identity.Users
  alias Easy.Identity.UserSession
  alias Easy.Identity.UserSessions
  alias Easy.Repo

  @type auth_token :: %{
          access_token: String.t(),
          token_type: String.t(),
          expires_in: pos_integer(),
          refresh_token: String.t(),
          full_name: String.t(),
          scope: String.t()
        }

  @type refresh_token_opts :: %{
          required(:refresh_token) => String.t(),
          optional(:ip) => String.t() | nil,
          optional(:user_agent) => String.t() | nil,
          optional(:role) => UserSession.role() | nil
        }

  @type otp_token_opts :: %{
          required(:email) => String.t(),
          required(:otp) => String.t(),
          optional(:ip) => String.t() | nil,
          optional(:user_agent) => String.t() | nil,
          optional(:role) => UserSession.role() | nil
        }

  @type refresh_error() ::
          :session_not_found | :user_not_found | SessionFactory.session_error() | SessionFactory.write_error()
  @type otp_error() :: :invalid_otp | :otp_expired | :email_not_confirmed | SessionFactory.write_error()

  @spec token(:refresh_token, refresh_token_opts()) :: {:ok, auth_token()} | {:error, refresh_error()}
  @spec token(:otp, otp_token_opts()) :: {:ok, auth_token()} | {:error, otp_error()}
  def token(:refresh_token, %{refresh_token: refresh_token} = opts) do
    Repo.transact(fn ->
      with {:ok, session} <- UserSessions.get_by_refresh_token(refresh_token),
           {:ok, user} <- Users.get_by_id(session.user_id),
           {:ok, refreshed_session} <- SessionFactory.refresh_session(user, session, opts) do
        {:ok, build(user, refreshed_session)}
      end
    end)
  end

  def token(:otp, %{email: email, otp: otp} = opts) do
    token_hash = OneTimeTokens.generate_token_hash(email <> otp)

    Repo.transact(fn ->
      with {:ok, token} <- OneTimeTokens.lock_by_hash(token_hash, :authentication),
           :ok <- validate_fresh(token),
           :ok <- validate_email_confirmed(token.user),
           {:ok, _} <- OneTimeTokens.delete(token),
           {:ok, session} <- SessionFactory.create_session(token.user, opts) do
        {:ok, build(token.user, session)}
      else
        # Missing and already-consumed codes share the public invalid-OTP error.
        {:error, :token_not_found} -> {:error, :invalid_otp}
        {:error, reason} -> {:error, reason}
      end
    end)
  end

  @spec build(User.t(), UserSession.t()) :: auth_token()
  def build(user, session) do
    %{
      access_token: Token.generate_access_token(user, session),
      token_type: "Bearer",
      expires_in: 300,
      refresh_token: session.refresh_token,
      full_name: user.full_name,
      scope: session.role |> Atom.to_string()
    }
  end

  @spec validate_fresh(OneTimeToken.t()) :: :ok | {:error, :otp_expired}
  defp validate_fresh(token) do
    if OneTimeToken.expired?(token, DateTime.utc_now()), do: {:error, :otp_expired}, else: :ok
  end

  @spec validate_email_confirmed(User.t()) :: :ok | {:error, :email_not_confirmed}
  defp validate_email_confirmed(user) do
    if User.email_confirmed?(user), do: :ok, else: {:error, :email_not_confirmed}
  end
end
