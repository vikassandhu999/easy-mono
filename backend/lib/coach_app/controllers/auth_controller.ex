defmodule CoachApp.AuthController do
  use CoachApp, :controller

  alias Easy.Whoami
  alias Easy.Whoami.OneTimeToken
  alias Easy.Repo

  action_fallback CoachApp.FallbackController

  @doc """
  Sign up - Create user and send verification code
  POST /api/auth/signup
  Body: %{email: "...", phone_number: "..."}
  """
  def signup(conn, params) do
    with {:ok, token_id} <- create_user_and_token(params) do
      conn
      |> put_status(:ok)
      |> json(%{token_id: token_id})
    end
  end

  @doc """
  Verify user - Confirm signup with OTP/passcode
  POST /api/auth/verify
  Body: %{token_id: "...", passcode: "..."}
  """
  def verify(conn, %{"token_id" => token_id, "passcode" => passcode}) do
    with {:ok, user, token} <- get_and_verify_token(token_id, passcode),
         {:ok, user} <- confirm_user(user, token),
         {:ok, session} <- create_session(user, conn),
         {:ok, access_token} <- generate_access_token(user, session) do
      conn
      |> put_refresh_token_cookie(session.refresh_token)
      |> put_status(:ok)
      |> json(access_token)
    end
  end

  @doc """
  Resend verification code
  POST /api/auth/resend
  Body: %{token_id: "..."}
  """
  def resend(conn, %{"token_id" => token_id}) do
    with {:ok, user, token} <- get_user_and_token(token_id) do
      # Send verification in background
      Task.start(fn ->
        if OneTimeToken.phone_token?(token) do
          send_phone_verification(user.phone || "", token.secret)
        else
          send_email_verification(user.email || "", token.secret)
        end
      end)

      conn
      |> put_status(:ok)
      |> json(%{token_id: token.id})
    end
  end

  @doc """
  Send login passcode - Email or phone OTP for login
  POST /api/auth/login/send
  Body: %{email: "..."} OR %{phone_number: "..."}
  """
  def send_login_passcode(conn, params) do
    with {:ok, token_id} <- create_login_token(params) do
      conn
      |> put_status(:ok)
      |> json(%{token_id: token_id})
    end
  end

  @doc """
  Generate token - Login with passcode, password, or refresh token
  POST /api/auth/token
  Body: %{grant_type: "passcode|password|refresh_token", ...}
  """
  def generate_token(conn, %{"grant_type" => grant_type} = params) do
    with {:ok, user, session, coach} <- authenticate_user(grant_type, params, conn),
         {:ok, access_token} <- generate_access_token(user, session, coach) do
      conn
      |> put_refresh_token_cookie(session.refresh_token)
      |> put_status(:ok)
      |> json(access_token)
    end
  end

  @doc """
  Send password reset code
  POST /api/auth/password/reset/send
  Body: %{email: "..."}
  """
  def send_password_reset(conn, %{"email" => email}) do
    with {:ok, token_id} <- create_password_reset_token(email) do
      conn
      |> put_status(:ok)
      |> json(%{token_id: token_id})
    end
  end

  @doc """
  Confirm password reset with code and new password
  POST /api/auth/password/reset/confirm
  Body: %{token_id: "...", passcode: "...", password: "..."}
  """
  def confirm_password_reset(conn, %{
        "token_id" => token_id,
        "passcode" => passcode,
        "password" => password
      }) do
    with {:ok, _user} <- reset_password(token_id, passcode, password) do
      conn
      |> put_status(:ok)
      |> json(%{message: "Password reset successfully"})
    end
  end

  @doc """
  Logout - Clear refresh token cookie
  POST /api/auth/logout
  """
  def logout(conn, _params) do
    conn
    |> clear_refresh_token_cookie()
    |> put_status(:ok)
    |> json(%{message: "Logged out successfully"})
  end

  # Private functions

  defp create_user_and_token(%{"email" => email}) when is_binary(email) and email != "" do
    create_user_and_token_by_email(email)
  end

  defp create_user_and_token(%{"phone_number" => phone}) when is_binary(phone) and phone != "" do
    create_user_and_token_by_phone(phone)
  end

  defp create_user_and_token(_) do
    {:error, :email_or_phone_required}
  end

  defp create_user_and_token_by_email(email) do
    email = String.downcase(email)

    # Validate email format early
    with :ok <- validate_email_format(email) do
      Repo.transaction(fn ->
        # Check if user exists
        user =
          case Whoami.get_user_by_email(email) do
            nil ->
              # Create new user
              case Whoami.create_user(%{
                     email: email,
                     raw_user_meta_data: %{}
                   }) do
                {:ok, user} ->
                  user

                {:error, changeset} ->
                  Repo.rollback(changeset)
              end

            existing_user ->
              if Easy.Whoami.User.email_confirmed?(existing_user) do
                Repo.rollback(:user_already_exists)
              end

              existing_user
          end

        # Create confirmation token
        {:ok, token} =
          Whoami.create_email_token(
            user.id,
            OneTimeToken.token_types().confirmation,
            email
          )

        # Send email in background
        Task.start(fn ->
          send_email_verification(email, token.secret)
        end)

        token.id
      end)
      |> case do
        {:ok, token_id} -> {:ok, token_id}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  defp create_user_and_token_by_phone(phone) do
    # Normalize phone (basic - can enhance with ExPhoneNumber)
    normalized_phone = normalize_phone(phone)

    Repo.transaction(fn ->
      # Check if user exists
      user =
        case Whoami.get_user_by_phone(normalized_phone) do
          nil ->
            # Create new user
            {:ok, user} =
              Whoami.create_user(%{
                phone: normalized_phone,
                raw_user_meta_data: %{}
              })

            user

          existing_user ->
            if Easy.Whoami.User.phone_confirmed?(existing_user) do
              Repo.rollback({:error, :user_already_exists})
            end

            existing_user
        end

      # Create OTP token
      {:ok, token} =
        Whoami.create_phone_token(
          user.id,
          OneTimeToken.token_types().phone_verification,
          normalized_phone
        )

      # Send SMS in background
      Task.start(fn ->
        send_phone_verification(normalized_phone, token.secret)
      end)

      token.id
    end)
    |> case do
      {:ok, token_id} -> {:ok, token_id}
      {:error, reason} -> {:error, reason}
    end
  end

  defp get_and_verify_token(token_id, passcode) do
    with {:ok, user, token} <-
           Whoami.get_user_and_token(
             token_id,
             OneTimeToken.token_types().confirmation
           ),
         true <- verify_passcode(passcode, token.secret) do
      {:ok, user, token}
    else
      false -> {:error, :invalid_passcode}
      error -> error
    end
  end

  defp get_user_and_token(token_id) do
    Whoami.get_user_and_token(
      token_id,
      OneTimeToken.token_types().confirmation
    )
  end

  defp confirm_user(user, token) do
    Repo.transaction(fn ->
      # Confirm based on token type
      result =
        if OneTimeToken.phone_token?(token) do
          Whoami.confirm_user_phone(user)
        else
          Whoami.confirm_user_email(user)
        end

      case result do
        {:ok, confirmed_user} ->
          # Clear all confirmation tokens
          Whoami.clear_user_tokens(user.id, OneTimeToken.token_types().confirmation)
          confirmed_user

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
    |> case do
      {:ok, user} -> {:ok, user}
      {:error, reason} -> {:error, reason}
    end
  end

  defp create_session(user, conn) do
    user_agent = get_user_agent(conn)
    ip = get_client_ip(conn)

    Whoami.create_session(%{
      user_id: user.id,
      user_agent: user_agent,
      ip: ip,
      not_after: DateTime.add(DateTime.utc_now(), 30, :day)
    })
  end

  defp generate_access_token(_user, session) do
    # TODO: Implement JWT token generation
    # For now, return basic token info
    {:ok,
     %{
       access_token: session.refresh_token,
       token_type: "Bearer",
       expires_in: 30 * 24 * 60 * 60
     }}
  end

  defp generate_access_token(user, session, _coach) do
    # Calculate expiry
    expires_in = 365 * 24 * 60 * 60
    expires_at = DateTime.add(DateTime.utc_now(), expires_in, :second)

    # Build token response with coach info if available
    {:ok,
     %{
       access_token: session.refresh_token,
       token_type: "Bearer",
       expires_in: expires_in,
       expires_at: DateTime.to_iso8601(expires_at),
       refresh_token: session.refresh_token,
       user: %{
         id: user.id,
         email: user.email,
         phone_number: user.phone
       }
     }}
  end

  # Login token creation
  defp create_login_token(%{"email" => email}) when is_binary(email) and email != "" do
    create_login_token_by_email(email)
  end

  defp create_login_token(%{"phone_number" => phone})
       when is_binary(phone) and phone != "" do
    create_login_token_by_phone(phone)
  end

  defp create_login_token(_) do
    {:error, :email_or_phone_required}
  end

  defp create_login_token_by_email(email) do
    email = String.downcase(email)

    with :ok <- validate_email_format(email) do
      case Whoami.get_user_by_email(email) do
        nil ->
          # User doesn't exist - don't reveal this for security
          {:ok, Ecto.UUID.generate()}

        user ->
          if not Easy.Whoami.User.email_confirmed?(user) do
            {:error, :user_not_found}
          else
            # Create login token
            {:ok, token} =
              Whoami.create_email_token(
                user.id,
                OneTimeToken.token_types().login,
                email
              )

            # Send email in background
            Task.start(fn ->
              send_login_email(email, token.secret)
            end)

            {:ok, token.id}
          end
      end
    end
  end

  defp create_login_token_by_phone(phone) do
    normalized_phone = normalize_phone(phone)

    case Whoami.get_user_by_phone(normalized_phone) do
      nil ->
        # User doesn't exist - don't reveal this for security
        {:ok, Ecto.UUID.generate()}

      user ->
        if not Easy.Whoami.User.phone_confirmed?(user) do
          {:error, :user_not_found}
        else
          # Create OTP token
          {:ok, token} =
            Whoami.create_phone_token(
              user.id,
              OneTimeToken.token_types().phone_login,
              normalized_phone
            )

          # Send SMS in background
          Task.start(fn ->
            send_phone_otp(normalized_phone, token.secret)
          end)

          {:ok, token.id}
        end
    end
  end

  # Authentication methods
  defp authenticate_user("passcode", params, conn) do
    with {:ok, token_id} <- get_param(params, "token_id"),
         {:ok, passcode} <- get_param(params, "passcode"),
         {:ok, user, _token} <- get_and_verify_login_token(token_id, passcode),
         {:ok, session} <- create_session(user, conn),
         coach <- get_coach_by_user_id(user.id) do
      {:ok, user, session, coach}
    end
  end

  defp authenticate_user("password", params, conn) do
    with {:ok, email} <- get_param(params, "email"),
         {:ok, password} <- get_param(params, "password"),
         {:ok, user} <- authenticate_by_password(email, password),
         {:ok, session} <- create_session(user, conn),
         coach <- get_coach_by_user_id(user.id) do
      {:ok, user, session, coach}
    end
  end

  defp authenticate_user("refresh_token", _params, conn) do
    with {:ok, refresh_token} <- get_refresh_token_from_cookie(conn),
         {:ok, user, session} <- Whoami.get_user_and_session(refresh_token),
         {:ok, session} <- Whoami.refresh_session(session),
         coach <- get_coach_by_user_id(user.id) do
      {:ok, user, session, coach}
    end
  end

  defp authenticate_user(_grant_type, _params, _conn) do
    {:error, :invalid_grant_type}
  end

  defp get_and_verify_login_token(token_id, passcode) do
    with {:ok, user, token} <-
           Whoami.get_user_and_token(
             token_id,
             OneTimeToken.token_types().login
           ),
         true <- verify_user_confirmed(user, token),
         true <- verify_passcode(passcode, token.secret) do
      {:ok, user, token}
    else
      false -> {:error, :invalid_passcode}
      error -> error
    end
  end

  defp verify_user_confirmed(user, token) do
    if OneTimeToken.phone_token?(token) do
      Easy.Whoami.User.phone_confirmed?(user)
    else
      Easy.Whoami.User.email_confirmed?(user)
    end
  end

  defp authenticate_by_password(email, password) do
    email = String.downcase(email)

    with :ok <- validate_email_format(email) do
      case Whoami.authenticate_by_email_password(email, password) do
        {:ok, user} ->
          if Easy.Whoami.User.email_confirmed?(user) do
            {:ok, user}
          else
            {:error, :user_not_found}
          end

        {:error, :invalid_credentials} ->
          {:error, :invalid_email_or_password}
      end
    end
  end

  defp get_coach_by_user_id(_user_id) do
    # TODO: Implement coach lookup
    # For now, return nil
    nil
  end

  # Password reset
  defp create_password_reset_token(email) do
    email = String.downcase(email)

    with :ok <- validate_email_format(email) do
      case Whoami.get_user_by_email(email) do
        nil ->
          {:error, :cannot_reset_password}

        user ->
          if not Easy.Whoami.User.email_confirmed?(user) do
            {:error, :cannot_reset_password}
          else
            # Create password reset token
            {:ok, token} =
              Whoami.create_email_token(
                user.id,
                OneTimeToken.token_types().password_change,
                email
              )

            # Send email in background
            Task.start(fn ->
              send_password_reset_email(email, token.secret)
            end)

            {:ok, token.id}
          end
      end
    end
  end

  defp reset_password(token_id, passcode, new_password) do
    Repo.transaction(fn ->
      with {:ok, user, token} <-
             Whoami.get_user_and_token(
               token_id,
               OneTimeToken.token_types().password_change
             ),
           true <- verify_passcode(passcode, token.secret),
           {:ok, user} <- update_user_password(user, new_password) do
        # Clear all password reset tokens
        Whoami.clear_user_tokens(user.id, OneTimeToken.token_types().password_change)
        user
      else
        false -> Repo.rollback(:invalid_passcode)
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
    |> case do
      {:ok, user} -> {:ok, user}
      {:error, reason} -> {:error, reason}
    end
  end

  defp update_user_password(user, password) do
    user
    |> Easy.Whoami.User.changeset(%{})
    |> Ecto.Changeset.put_change(:encrypted_password, Bcrypt.hash_pwd_salt(password))
    |> Repo.update()
  end

  # Helper functions
  
  # Email regex matching the one in User schema
  @email_regex ~r/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

  defp validate_email_format(email) when is_binary(email) do
    if String.match?(email, @email_regex) and String.length(email) <= 160 do
      :ok
    else
      {:error, :invalid_email_format}
    end
  end

  defp validate_email_format(_), do: {:error, :invalid_email_format}

  defp get_param(params, key) do
    case Map.get(params, key) do
      nil -> {:error, String.to_atom("#{key}_required")}
      "" -> {:error, String.to_atom("#{key}_required")}
      value -> {:ok, value}
    end
  end

  defp get_refresh_token_from_cookie(conn) do
    case conn.cookies["_easych_refresh"] do
      nil -> {:error, :refresh_token_missing}
      token -> {:ok, token}
    end
  end

  defp clear_refresh_token_cookie(conn) do
    is_dev = Mix.env() == :dev

    conn
    |> put_resp_cookie("_easych_refresh", "", [
      {:http_only, !is_dev},
      {:secure, !is_dev},
      {:same_site, if(is_dev, do: "Lax", else: "None")},
      {:max_age, -1}
    ])
  end

  # Email/SMS sending functions
  defp send_login_email(email, passcode) do
    require Logger
    Logger.info("Sending login email to #{email} with code: #{passcode}")
    # TODO: Integrate with email service
  end

  defp send_phone_otp(phone, otp) do
    require Logger
    Logger.info("Sending login OTP to #{phone}: #{otp}")
    # TODO: Integrate with SMS service
  end

  defp send_password_reset_email(email, passcode) do
    require Logger
    Logger.info("Sending password reset email to #{email} with code: #{passcode}")
    # TODO: Integrate with email service
  end

  defp put_refresh_token_cookie(conn, refresh_token) do
    conn
    |> put_resp_cookie("refresh_token", refresh_token,
      http_only: true,
      secure: true,
      same_site: "Lax",
      max_age: 30 * 24 * 60 * 60
    )
  end

  defp verify_passcode(passcode, secret) do
    # In development, accept 123456
    if Mix.env() == :dev && passcode == "123456" do
      true
    else
      # TODO: Implement TOTP verification with time window
      # For now, direct comparison
      passcode == secret
    end
  end

  defp send_email_verification(email, passcode) do
    # TODO: Integrate with email service (Swoosh)
    # For now, just log
    require Logger
    Logger.info("Sending verification email to #{email} with code: #{passcode}")
  end

  defp send_phone_verification(phone, otp) do
    # TODO: Integrate with SMS service
    # For now, just log
    require Logger
    Logger.info("Sending verification SMS to #{phone} with OTP: #{otp}")
  end

  defp normalize_phone(phone) do
    # Basic normalization - remove spaces and dashes
    # TODO: Use ExPhoneNumber for full E.164 normalization
    phone
    |> String.replace(~r/[\s\-\(\)]/, "")
    |> String.trim()
  end

  defp get_user_agent(conn) do
    case Plug.Conn.get_req_header(conn, "user-agent") do
      [user_agent | _] -> user_agent
      _ -> "unknown"
    end
  end

  defp get_client_ip(conn) do
    # Try X-Forwarded-For first, then remote_ip
    case Plug.Conn.get_req_header(conn, "x-forwarded-for") do
      [ip | _] ->
        ip

      _ ->
        case conn.remote_ip do
          {a, b, c, d} -> "#{a}.#{b}.#{c}.#{d}"
          _ -> "unknown"
        end
    end
  end
end
