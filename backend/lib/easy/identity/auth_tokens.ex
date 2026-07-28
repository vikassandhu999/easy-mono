defmodule Easy.Identity.AuthTokens do
  require Logger

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
           :ok <- validate_fresh(token),
           {:ok, _} <- validate_email_confirmed(token.user),
           {:ok, _} <- OneTimeTokens.delete(token),
           {:ok, session} <- SessionFactory.create_session(token.user, opts) do
        build(token.user, session)
      else
        # A hash miss means the code the caller typed is wrong or already spent.
        # That is `invalid_otp` at the API boundary, not a storage-layer detail —
        # the same mapping Invitations.verify_invitation/1 makes. Without it the
        # raw `:token_not_found` reaches FallbackController, which has no clause
        # for it, so every mistyped login code answered 500 "An internal error
        # occurred" instead of 400 "Invalid code. Please check and try again."
        {:error, :token_not_found} -> Repo.rollback(:invalid_otp)
        {:error, :otp_expired} -> Repo.rollback(:otp_expired)
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

  # Requesting a new code deletes the previous one (OtpDelivery.send_otp/2), but
  # a code nobody re-requests was good forever — a 2-day-old login OTP still
  # minted a session. Invitation acceptance has always checked this; the login
  # path never did.
  @spec validate_fresh(OneTimeToken.t()) :: :ok | {:error, :otp_expired}
  defp validate_fresh(token) do
    if OneTimeTokens.expired?(token), do: {:error, :otp_expired}, else: :ok
  end

  @spec validate_email_confirmed(User.t()) :: {:ok, User.t()} | {:error, any()}
  defp validate_email_confirmed(user) do
    if User.email_confirmed?(user) do
      {:ok, user}
    else
      {:error, :email_not_confirmed}
    end
  end
end
