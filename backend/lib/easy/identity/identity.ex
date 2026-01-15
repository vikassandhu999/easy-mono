defmodule Easy.Identity do
  alias Easy.Identity.UserSessions
  alias Easy.Identity.UserSession
  alias Easy.Identity.User
  alias Easy.Identity.Users
  alias Easy.Identity.OneTimeTokens
  alias Easy.Repo
  alias Easy.Identity.AuthToken

  # TODO: Add rate limiting to signup and otp sending
  @spec signup(map()) :: {:ok, User.t()} | {:error, any()}
  def signup(attrs) do
    otp = generate_otp()

    user_attrs =
      Map.merge(attrs, %{
        "confirmation_sent_at" => DateTime.utc_now(:second)
      })

    Repo.transaction(fn ->
      with {:ok, user} <- Users.create(user_attrs),
           {:ok, _token} <- OneTimeTokens.create_token(user, :email_confirmation, otp) do
        send_otp_email(user.email, otp)
        user
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  @spec verify(String.t(), map()) :: {:ok, {AuthToken.t()}} | {:error, any()}
  def verify(token_hash, opts) do
    Repo.transaction(fn ->
      with {:ok, token} <- verify_confirmation_hash(token_hash),
           {:ok, user} <- Users.confirm_user_email(token.user),
           {:ok, _} <- OneTimeTokens.delete(token) do
        session = UserSessions.create_session!(user, opts.ip || "", opts.user_agent || "")
        generate_auth_token(user, session)
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  # TODO: Add rate limiting to send_otp

  @spec send_otp(String.t(), String.t()) :: {:ok, :sent} | {:error, any()}
  def send_otp(email, type) do
    otp = generate_otp()

    otp_type =
      case type do
        "email_confirmation" -> :email_confirmation
        "authentication" -> :authentication
        _ -> :authentication
      end

    Repo.transaction(fn ->
      with {:ok, user} <- Users.get_by_email(email),
           {:ok, _} <- validate_can_send_otp?(user, otp_type),
           _ <- OneTimeTokens.delete_all_for_user_and_type(user, otp_type),
           {:ok, _} <- OneTimeTokens.create_token(user, otp_type, otp) do
        send_otp_email(user.email, otp)
        {:ok, :sent}
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  @spec token(atom(), map()) :: {:ok, AuthToken.t()} | {:error, any()}

  def token(:refresh_token, refresh_token) do
    with {:ok, session} <- UserSessions.get_by_refresh_token(refresh_token),
         {:ok, _} <- validate_session(session),
         {:ok, user} <- Users.get_by_id(session.user_id),
         auth_token <- generate_auth_token(user, session),
         {:ok, _} <- UserSessions.touch_session(session) do
      {:ok, auth_token}
    end
  end

  def token(:otp, token_hash, opts \\ %{}) do
    Repo.transaction(fn ->
      with {:ok, token} <- OneTimeTokens.get_by_hash(token_hash, :authentication),
           {:ok, _} <- validate_email_confirmed(token.user),
           {:ok, _} <- OneTimeTokens.delete(token) do
        session = UserSessions.create_session!(token.user, opts.ip || "", opts.user_agent || "")
        generate_auth_token(token.user, session)
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp validate_session(session) do
    if UserSession.is_expired?(session) do
      {:error, Easy.Error.new("session_expired", "The session has expired")}
    end

    if UserSession.is_revoked?(session) do
      {:error, Easy.Error.new("session_revoked", "The session has been revoked")}
    end

    {:ok, session}
  end

  @spec validate_can_send_otp?(User.t(), atom()) :: {:ok, true} | {:error, any()}

  defp validate_can_send_otp?(user, :email_confirmation) do
    if User.is_email_confirmed?(user) do
      {:error,
       Easy.Error.new(
         "email_already_confirmed",
         "The email address is already confirmed"
       )}
    else
      {:ok, true}
    end
  end

  defp validate_can_send_otp?(user, :authentication) do
    if User.is_email_confirmed?(user) do
      {:ok, true}
    else
      {:error,
       Easy.Error.new(
         "email_not_confirmed",
         "The email address is not confirmed, please confirm your email first"
       )}
    end
  end

  @spec validate_email_confirmed(User.t()) :: {:ok, User.t()} | {:error, any()}
  defp validate_email_confirmed(user) do
    if !User.is_email_confirmed?(user) do
      {:error,
       Easy.Error.new(
         "email_not_confirmed",
         "The email address is not confirmed, please confirm your email first"
       )}
    else
      {:ok, user}
    end
  end

  @spec generate_auth_token(User.t(), UserSession.t()) :: AuthToken.t()
  defp generate_auth_token(user, session) do
    %AuthToken{
      access_token: Easy.Identity.Token.generate_access_token(user, session),
      token_type: "Bearer",
      expires_in: 86_400,
      refresh_token: session.refresh_token,
      scope: session.role |> Atom.to_string()
    }
  end

  defp verify_confirmation_hash(token_hash) do
    with {:ok, token} <- OneTimeTokens.get_by_hash(token_hash, :email_confirmation),
         false <- User.is_confirmation_expired?(token.user) do
      {:ok, token}
    else
      {:error, :token_not_found} -> {:error, :token_invalid}
      true -> {:error, :token_expired}
    end
  end

  defp send_otp_email(email, code) do
    email_struct =
      Easy.Emails.otp_verification_email(email, code)

    Easy.MailerDelivery.deliver_async(email_struct,
      metadata: %{email: email}
    )
  end

  @spec generate_otp() :: String.t()
  defp generate_otp() do
    :crypto.strong_rand_bytes(4)
    |> :binary.decode_unsigned()
    |> rem(900_000)
    |> Kernel.+(100_000)
    |> Integer.to_string()
  end
end
