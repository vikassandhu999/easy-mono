defmodule Easy.Identity.AuthTokens do
  require Logger

  alias Easy.Error
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.SessionFactory
  alias Easy.Identity.Token
  alias Easy.Identity.User
  alias Easy.Identity.UserSession
  alias Easy.Identity.Users
  alias Easy.Identity.UserSessions
  alias Easy.Repo

  @type auth_token :: %{
          access_token: String.t(),
          token_type: String.t(),
          expires_in: pos_integer(),
          refresh_token: String.t(),
          scope: String.t()
        }

  @type refresh_token_opts :: %{
          refresh_token: String.t(),
          ip: String.t(),
          user_agent: String.t(),
          role: atom() | nil
        }

  @type otp_token_opts :: %{
          token_hash: String.t(),
          ip: String.t(),
          user_agent: String.t(),
          role: atom() | nil
        }

  @spec token(:refresh_token, refresh_token_opts()) :: {:ok, auth_token()} | {:error, any()}
  @spec token(:otp, otp_token_opts()) :: {:ok, auth_token()} | {:error, any()}
  def token(:refresh_token, %{refresh_token: refresh_token} = opts) do
    Logger.info("Generating token using refresh_token grant type #{inspect(opts)}")

    Repo.transaction(fn ->
      with {:ok, session} <- UserSessions.get_by_refresh_token(refresh_token),
           {:ok, _} <- SessionFactory.validate_session(session),
           {:ok, user} <- Users.get_by_id(session.user_id),
           {:ok, refreshed_session} <- SessionFactory.refresh_session(user, session, opts) do
        build(user, refreshed_session)
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  def token(:otp, %{token_hash: token_hash} = opts) do
    Repo.transaction(fn ->
      with {:ok, token} <- OneTimeTokens.get_by_hash(token_hash, :authentication),
           {:ok, _} <- validate_email_confirmed(token.user),
           {:ok, _} <- OneTimeTokens.delete(token),
           {:ok, session} <- SessionFactory.create_session(token.user, opts) do
        build(token.user, session)
      else
        {:error, reason} -> Repo.rollback(reason)
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
      scope: session.role |> Atom.to_string()
    }
  end

  @spec validate_email_confirmed(User.t()) :: {:ok, User.t()} | {:error, any()}
  defp validate_email_confirmed(user) do
    if User.is_email_confirmed?(user) do
      {:ok, user}
    else
      {:error,
       Error.new(
         "email_not_confirmed",
         "The email address is not confirmed, please confirm your email first"
       )}
    end
  end
end
