defmodule EasyWeb.AuthController do
  use EasyWeb, :controller

  alias Easy.{Accounts, ApiError, Repo}
  alias EasyWeb.{ResponseHelpers, CookieHelper}

  action_fallback(EasyWeb.FallbackController)

  # POST /api/auth/register
  def register(conn, params) do
    with {:ok, email, full_name} <- validate_register_params(params),
         {:ok, result} <- Accounts.register_user(email, full_name) do
      response = %{
        token_id: result.token_id,
        expires_at: ResponseHelpers.format_timestamp(result.expires_at),
        status: "pending_verification"
      }

      conn
      |> put_status(:created)
      |> json(response)
    else
      {:error, :validation_error, details} ->
        error = ApiError.from_code(:validation_error, "Invalid request parameters", details)
        render_error(conn, error)

      {:error, :email_already_exists, user_data} ->
        error = ApiError.from_code(:email_already_exists, nil, user_data)
        render_error(conn, error)

      {:error, :rate_limit_exceeded, retry_after} ->
        error = ApiError.from_code(:rate_limit_exceeded, nil, %{retry_after: retry_after})
        render_error(conn, error)

      {:error, reason} ->
        error = ApiError.internal_server_error("Registration failed: #{inspect(reason)}")
        render_error(conn, error)
    end
  end

  # POST /api/auth/verify-otp
  def verify_otp(conn, params) do
    with {:ok, token_id, code} <- validate_verify_otp_params(params),
         {:ok, result} <- Accounts.verify_otp_and_create_session(token_id, code) do
      session = result.session || result[:session]
      access_token = session.access_token
      refresh_token = session.refresh_token
      expires_in = session.expires_in

      conn
      |> CookieHelper.set_access_token_cookie(access_token, expires_in)
      |> CookieHelper.set_refresh_token_cookie(refresh_token)
      |> put_status(:ok)
      |> json(result)
    else
      {:error, :validation_error, details} ->
        error = ApiError.from_code(:validation_error, "Invalid request parameters", details)
        render_error(conn, error)

      {:error, :invalid_otp} ->
        token = fetch_token_for_feedback(params["token_id"])
        auth_config = Application.get_env(:easy, :auth, [])
        max_attempts = Keyword.get(auth_config, :otp_max_attempts, 3)
        attempts_remaining = if token, do: max(max_attempts - token.attempts, 0), else: 0

        error =
          ApiError.from_code(
            :invalid_otp,
            "The provided code is invalid or has expired",
            %{attempts_remaining: attempts_remaining}
          )

        render_error(conn, error)

      {:error, :token_expired} ->
        error = ApiError.from_code(:token_expired, nil, nil)
        render_error(conn, error)

      {:error, :token_used} ->
        error = ApiError.from_code(:token_used, nil, nil)
        render_error(conn, error)

      {:error, :max_attempts} ->
        error = ApiError.from_code(:max_attempts_exceeded, nil, nil)
        render_error(conn, error)

      {:error, :token_not_found} ->
        error = ApiError.from_code(:token_not_found, nil, nil)
        render_error(conn, error)

      {:error, :invalid_token_type} ->
        error = ApiError.from_code(:invalid_token_type, nil, nil)
        render_error(conn, error)

      {:error, :user_not_found} ->
        error = ApiError.from_code(:user_not_found, nil, nil)
        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        error = ApiError.unprocessable_entity("Failed to create session", changeset)
        render_error(conn, error)

      {:error, reason} when is_atom(reason) or is_binary(reason) ->
        error =
          ApiError.unprocessable_entity("Failed to verify OTP", %{reason: to_string(reason)})

        render_error(conn, error)

      {:error, _reason} ->
        error = ApiError.internal_server_error("An unexpected error occurred")
        render_error(conn, error)
    end
  end

  # POST /api/auth/refresh
  def refresh(conn, params) do
    require Logger

    conn = fetch_cookies(conn)
    cookie_token = conn.cookies["refresh_token"]
    Logger.info("[REFRESH DEBUG] Cookie token present: #{!is_nil(cookie_token)}")

    if cookie_token do
      Logger.info("[REFRESH DEBUG] Cookie token length: #{String.length(cookie_token)}")
      Logger.info("[REFRESH DEBUG] Cookie token prefix: #{String.slice(cookie_token, 0..50)}")
    end

    Logger.info("[REFRESH DEBUG] Body refresh_token present: #{!is_nil(params["refresh_token"])}")

    params_with_conn = Map.put(params, :conn, conn)

    with {:ok, refresh_token} <- validate_refresh_params(params_with_conn) do
      Logger.info("[REFRESH DEBUG] Token to verify length: #{String.length(refresh_token)}")
      Logger.info("[REFRESH DEBUG] Token to verify prefix: #{String.slice(refresh_token, 0..50)}")

      case Accounts.refresh_session(refresh_token) do
        {:ok, result} ->
          user = Accounts.get_user(result.user.id) |> Repo.preload([:coach, :client])
          user_response = Accounts.build_user_response(user)

          response = %{user: user_response}

          Logger.info("[REFRESH DEBUG] Success!")

          conn
          |> CookieHelper.set_access_token_cookie(result.access_token, result.expires_in)
          |> put_status(:ok)
          |> json(response)

        {:error, reason} = error ->
          Logger.error("[REFRESH DEBUG] Accounts.refresh_session failed: #{inspect(reason)}")
          error
      end
    end
    |> case do
      {:ok, _} = success ->
        success

      conn when is_map(conn) ->
        conn

      {:error, :validation_error, details} ->
        Logger.warning("[REFRESH DEBUG] Validation error: #{inspect(details)}")
        error = ApiError.from_code(:validation_error, "Invalid request parameters", details)
        render_error(conn, error)

      {:error, :invalid_token} ->
        Logger.warning("[REFRESH DEBUG] Invalid token - signature verification failed")
        error = ApiError.from_code(:invalid_refresh_token, nil, nil)
        render_error(conn, error)

      {:error, :session_not_found} ->
        Logger.warning("[REFRESH DEBUG] Session not found in database")
        error = ApiError.from_code(:session_not_found, nil, nil)
        render_error(conn, error)

      {:error, reason} ->
        Logger.error("[REFRESH DEBUG] Generic error: #{inspect(reason)}")
        details = format_refresh_error_details(reason)
        error = ApiError.from_code(:invalid_refresh_token, nil, details)
        render_error(conn, error)
    end
  end

  # POST /api/auth/send-otp
  def send_otp(conn, params) do
    with {:ok, email, type} <- validate_send_otp_params(params),
         otp_type <- map_type_to_otp_type(type),
         {:ok, result} <- generate_otp_for_type(email, type, otp_type) do
      response = %{
        token_id: result.token_id,
        expires_at: ResponseHelpers.format_timestamp(result.expires_at),
        status: "pending_verification"
      }

      conn
      |> put_status(:ok)
      |> json(response)
    else
      {:error, :validation_error, details} ->
        error = ApiError.from_code(:validation_error, "Invalid request parameters", details)
        render_error(conn, error)

      {:error, :rate_limit_exceeded, retry_after} ->
        error = ApiError.from_code(:rate_limit_exceeded, nil, %{retry_after: retry_after})
        render_error(conn, error)

      {:error, :user_not_found} ->
        error = ApiError.not_found("User")
        render_error(conn, error)

      {:error, reason} ->
        error = ApiError.internal_server_error("Failed to send OTP: #{inspect(reason)}")
        render_error(conn, error)
    end
  end

  # POST /api/auth/logout
  def logout(conn, _params) do
    with {:ok, access_token} <- extract_bearer_token(conn),
         {:ok, claims} <- Easy.Accounts.Token.verify_token(access_token),
         session_id <- Easy.Accounts.Token.get_session_id(claims),
         %Easy.Accounts.Session{} = session <- Accounts.get_session_by_id(session_id),
         :ok <- check_session_not_revoked(session),
         {:ok, _session} <- Accounts.revoke_session(session.id) do
      conn
      |> CookieHelper.clear_auth_cookies()
      |> put_status(:ok)
      |> json(%{status: "success"})
    else
      {:error, :no_auth_header} ->
        error = ApiError.unauthorized("Missing authorization header")
        render_error(conn, error)

      {:error, :invalid_auth_format} ->
        error = ApiError.unauthorized("Invalid authorization format")
        render_error(conn, error)

      {:error, _jwt_error} ->
        error = ApiError.unauthorized("Invalid or expired token")
        render_error(conn, error)

      nil ->
        error = ApiError.not_found("Session")
        render_error(conn, error)

      {:error, :already_revoked} ->
        error = ApiError.from_code(:session_revoked, nil, nil)
        render_error(conn, error)

      {:error, reason} ->
        error = ApiError.internal_server_error("Logout failed: #{inspect(reason)}")
        render_error(conn, error)
    end
  end

  # POST /api/auth/switch-context
  def switch_context(conn, params) do
    with {:ok, business_id} <- validate_switch_context_params(params),
         {:ok, access_token} <- extract_bearer_token(conn),
         {:ok, result} <- Accounts.switch_business_context(access_token, business_id) do
      conn
      |> CookieHelper.set_access_token_cookie(result.access_token, result.expires_in)
      |> CookieHelper.set_refresh_token_cookie(result.refresh_token)
      |> put_status(:ok)
      |> json(result)
    else
      {:error, :validation_error, details} ->
        error = ApiError.from_code(:validation_error, "Invalid request parameters", details)
        render_error(conn, error)

      {:error, :no_auth_header} ->
        error = ApiError.unauthorized("Missing authorization header")
        render_error(conn, error)

      {:error, :not_found} ->
        error = ApiError.not_found("Business", %{business_id: params["business_id"]})
        render_error(conn, error)

      {:error, :forbidden} ->
        error = ApiError.forbidden()
        render_error(conn, error)

      {:error, reason} ->
        error = ApiError.internal_server_error("Context switch failed: #{inspect(reason)}")
        render_error(conn, error)
    end
  end

  # GET /api/auth/contexts
  def list_contexts(conn, _params) do
    with {:ok, access_token} <- extract_bearer_token(conn),
         {:ok, contexts} <- Accounts.list_user_contexts(access_token) do
      conn
      |> put_status(:ok)
      |> json(%{contexts: contexts})
    else
      {:error, :no_auth_header} ->
        error = ApiError.unauthorized("Missing authorization header")
        render_error(conn, error)

      {:error, reason} ->
        error = ApiError.internal_server_error("Failed to list contexts: #{inspect(reason)}")
        render_error(conn, error)
    end
  end

  # Private helpers

  defp extract_bearer_token(conn) do
    case Plug.Conn.get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> {:ok, token}
      _ -> {:error, :no_auth_header}
    end
  end

  defp check_session_not_revoked(%{revoked_at: nil}), do: :ok
  defp check_session_not_revoked(%{revoked_at: _}), do: {:error, :already_revoked}

  defp validate_verify_otp_params(params) do
    token_id = params["token_id"]
    code = params["code"]

    errors = %{}

    errors =
      if is_nil(token_id) or token_id == "" do
        Map.put(errors, :token_id, "is required")
      else
        errors
      end

    errors =
      if is_nil(code) or code == "" do
        Map.put(errors, :code, "is required")
      else
        errors
      end

    if map_size(errors) > 0 do
      {:error, :validation_error, errors}
    else
      {:ok, token_id, code}
    end
  end

  defp validate_refresh_params(params) do
    refresh_token =
      case CookieHelper.get_refresh_token_from_cookie(params[:conn] || params["conn"]) do
        {:ok, token} -> token
        {:error, :not_found} -> params["refresh_token"]
      end

    if is_nil(refresh_token) or refresh_token == "" do
      {:error, :validation_error, %{refresh_token: "is required"}}
    else
      {:ok, refresh_token}
    end
  end

  defp validate_send_otp_params(params) do
    email = params["email"]
    type = params["type"]

    errors = %{}

    errors =
      cond do
        is_nil(email) or email == "" ->
          Map.put(errors, :email, "is required")

        not valid_email_format?(email) ->
          Map.put(errors, :email, "must be a valid email address")

        true ->
          errors
      end

    errors =
      cond do
        is_nil(type) or type == "" ->
          Map.put(errors, :type, "is required")

        type not in ["login", "registration"] ->
          Map.put(errors, :type, "must be either 'login' or 'registration'")

        true ->
          errors
      end

    if map_size(errors) > 0 do
      {:error, :validation_error, errors}
    else
      {:ok, email, type}
    end
  end

  defp validate_switch_context_params(params) do
    business_id = params["business_id"]

    if is_nil(business_id) or business_id == "" do
      {:error, :validation_error, %{business_id: "is required"}}
    else
      {:ok, business_id}
    end
  end

  defp validate_register_params(params) do
    email = params["email"]
    full_name = params["full_name"]

    errors = %{}

    errors =
      cond do
        is_nil(email) or email == "" ->
          Map.put(errors, :email, "is required")

        not valid_email_format?(email) ->
          Map.put(errors, :email, "must be a valid email address")

        true ->
          errors
      end

    errors =
      if is_nil(full_name) or full_name == "" do
        Map.put(errors, :full_name, "is required")
      else
        errors
      end

    if map_size(errors) > 0 do
      {:error, :validation_error, errors}
    else
      {:ok, email, full_name}
    end
  end

  defp valid_email_format?(email) when is_binary(email) do
    String.match?(email, ~r/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  end

  defp valid_email_format?(_email), do: false

  defp format_refresh_error_details(reason) when is_map(reason) do
    %{reason: extract_reason(reason)}
  end

  defp format_refresh_error_details(reason), do: %{reason: to_string(reason)}

  defp extract_reason(%{message: message}) when is_binary(message), do: message
  defp extract_reason(%{reason: reason}) when is_binary(reason), do: reason
  defp extract_reason(reason) when is_atom(reason), do: Atom.to_string(reason)
  defp extract_reason(reason) when is_binary(reason), do: reason
  defp extract_reason(_reason), do: "unknown_error"

  defp fetch_token_for_feedback(nil), do: nil

  defp fetch_token_for_feedback(token_id) do
    case Accounts.get_verification_token(token_id) do
      nil -> nil
      token -> token
    end
  end

  defp map_type_to_otp_type("registration"), do: "registration"
  defp map_type_to_otp_type("login"), do: "login"
  defp map_type_to_otp_type(_), do: "login"

  defp generate_otp_for_type(email, "registration", otp_type) do
    case Accounts.get_user_by_email(email) do
      nil ->
        Accounts.generate_otp(email, otp_type)

      _user ->
        {:error, :email_already_exists,
         %{
           email: email,
           message: "An account with this email already exists. Please login instead."
         }}
    end
  end

  defp generate_otp_for_type(email, "login", otp_type) do
    case Accounts.get_user_by_email(email) do
      nil ->
        {:error, :user_not_found}

      _user ->
        Accounts.generate_otp(email, otp_type)
    end
  end

  defp render_error(conn, %ApiError{} = error) do
    conn
    |> maybe_add_headers(error)
    |> put_status(error.status)
    |> json(%{error: ApiError.to_map(error)})
  end

  defp maybe_add_headers(conn, %ApiError{headers: nil}), do: conn

  defp maybe_add_headers(conn, %ApiError{headers: headers}) do
    Enum.reduce(headers, conn, fn {key, value}, conn ->
      Plug.Conn.put_resp_header(conn, key, value)
    end)
  end
end
