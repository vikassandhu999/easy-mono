defmodule EasyWeb.AuthController do
  use EasyWeb, :controller

  alias Easy.{Accounts, ApiError}
  alias EasyWeb.ResponseHelpers

  action_fallback EasyWeb.FallbackController

  @moduledoc """
  Authentication controller for user registration and authentication flows.

  Handles:
  - Coach registration (POST /api/auth/register)
  - OTP generation (POST /api/auth/send-otp)
  - OTP verification (POST /api/auth/verify-otp)
  - Token refresh (POST /api/auth/refresh)
  - Logout (POST /api/auth/logout)
  """

  @doc """
  POST /api/auth/register

  Registers a new coach user and initiates email verification.

  This is the first step in the coach signup flow. The user provides their
  email and full name, and receives an OTP code via email for verification.

  ## Parameters
  - email: User's email address (required)
  - full_name: User's full name (required)

  ## Response

  Success (201):
  ```json
  {
    "token_id": "550e8400-e29b-41d4-a716-446655440000",
    "expires_at": "2024-01-01T12:10:00Z",
    "status": "verification_pending"
  }
  ```

  ## Error Responses

  Validation error (422):
  ```json
  {
    "error": {
      "message": "Validation failed",
      "code": "validation_error",
      "details": {
        "email": ["has already been taken"],
        "full_name": ["can't be blank"]
      }
    }
  }
  ```

  Rate limit exceeded (429):
  ```json
  {
    "error": {
      "message": "Rate limit exceeded. Please try again in 300 seconds",
      "code": "rate_limited",
      "details": {
        "retry_after": 300
      }
    }
  }
  ```
  """
  def register(conn, params) do
    email = params["email"]
    full_name = params["full_name"]

    case Accounts.register_user(email, full_name) do
      {:ok, %{user: _user, token_uuid: token_uuid}} ->
        # Get the full token record to retrieve id and expires_at
        token = Accounts.get_token_by_uuid(token_uuid)

        response = ResponseHelpers.format_token_response(token, "verification_pending")

        conn
        |> put_status(:created)
        |> json(response)

      {:error, :rate_limited, retry_after} ->
        error = ApiError.from_code(:rate_limit_exceeded, retry_after, %{retry_after: retry_after})
        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        error = ApiError.validation_error(changeset)
        render_error(conn, error)

      {:error, reason} ->
        error = ApiError.unprocessable_entity("Registration failed", %{reason: to_string(reason)})
        render_error(conn, error)
    end
  end

  @doc """
  POST /api/auth/verify-otp

  Verifies an OTP code and creates a session for the user.

  This endpoint accepts a token_id (received from send-otp or register endpoints)
  and the OTP code. On successful verification, it returns the user profile with
  roles and session tokens.

  ## Parameters
  - token_id: The UUID of the OTP token (required)
  - code: The 6-digit OTP code (required)

  ## Response

  Success (200):
  ```json
  {
    "user": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "email": "user@example.com",
      "full_name": "John Doe",
      "email_verified": true,
      "roles": ["coach"],
      "coach_profile": {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "business_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "status": "active",
        "bio": null,
        "specialties": [],
        "credentials": {}
      }
    },
    "session": {
      "access_token": "eyJhbGc...",
      "refresh_token": "eyJhbGc...",
      "expires_at": "2024-01-08T12:00:00Z",
      "expires_in": 604800
    }
  }
  ```

  ## Error Responses

  Validation error (400):
  ```json
  {
    "error": {
      "message": "Invalid request parameters",
      "code": "VALIDATION_ERROR",
      "details": {
        "token_id": "is required",
        "code": "is required"
      }
    }
  }
  ```

  Invalid OTP (400):
  ```json
  {
    "error": {
      "message": "The provided code is invalid or has expired",
      "code": "INVALID_OTP",
      "details": {
        "attempts_remaining": 2
      }
    }
  }
  ```

  Token expired (410):
  ```json
  {
    "error": {
      "message": "The token has expired",
      "code": "TOKEN_EXPIRED"
    }
  }
  ```

  Token used (410):
  ```json
  {
    "error": {
      "message": "The token has already been used",
      "code": "TOKEN_USED"
    }
  }
  ```

  Max attempts exceeded (429):
  ```json
  {
    "error": {
      "message": "Maximum verification attempts exceeded",
      "code": "MAX_ATTEMPTS_EXCEEDED"
    }
  }
  ```

  Token not found (404):
  ```json
  {
    "error": {
      "message": "Token not found",
      "code": "TOKEN_NOT_FOUND"
    }
  }
  ```
  """
  def verify_otp(conn, params) do
    with {:ok, token_id, code} <- validate_verify_otp_params(params),
         {:ok, result} <- Accounts.verify_otp_and_create_session(token_id, code) do
      conn
      |> put_status(:ok)
      |> json(result)
    else
      {:error, :validation_error, details} ->
        error = ApiError.bad_request("Invalid request parameters", details)
        render_error(conn, error)

      {:error, :invalid_otp} ->
        # Get remaining attempts if possible
        token = if params["token_id"], do: Accounts.get_token_by_id(params["token_id"]), else: nil
        auth_config = Application.get_env(:easy, :auth, [])
        max_attempts = Keyword.get(auth_config, :otp_max_attempts, 3)
        attempts_remaining = if token, do: max(max_attempts - token.attempts, 0), else: 0

        error = ApiError.from_code(:invalid_otp, nil, %{attempts_remaining: attempts_remaining})
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
        # Handle changeset errors
        error = ApiError.unprocessable_entity("Failed to create session", changeset)
        render_error(conn, error)

      {:error, reason} when is_atom(reason) or is_binary(reason) ->
        error =
          ApiError.unprocessable_entity("Failed to verify OTP", %{reason: to_string(reason)})

        render_error(conn, error)

      {:error, _reason} ->
        # Fallback for other error types
        error = ApiError.internal_server_error("An unexpected error occurred")
        render_error(conn, error)
    end
  end

  @doc """
  POST /api/auth/refresh

  Refreshes an access token using a valid refresh token.

  This endpoint accepts a refresh token and returns a new access token
  with updated expiration time. The refresh token remains valid and can
  be used again until it expires.

  ## Parameters
  - refresh_token: The refresh token string (required)

  ## Response

  Success (200):
  ```json
  {
    "access_token": "eyJhbGc...",
    "expires_at": "2024-01-08T12:00:00Z",
    "expires_in": 604800
  }
  ```

  ## Error Responses

  Validation error (400):
  ```json
  {
    "error": {
      "message": "Invalid request parameters",
      "code": "VALIDATION_ERROR",
      "details": {
        "refresh_token": "is required"
      }
    }
  }
  ```

  Invalid refresh token (401):
  ```json
  {
    "error": {
      "message": "The refresh token is invalid or has expired",
      "code": "INVALID_REFRESH_TOKEN"
    }
  }
  ```

  Session not found (401):
  ```json
  {
    "error": {
      "message": "Session not found or has been revoked",
      "code": "SESSION_NOT_FOUND"
    }
  }
  ```
  """
  def refresh(conn, params) do
    with {:ok, refresh_token} <- validate_refresh_params(params),
         {:ok, result} <- Accounts.refresh_session(refresh_token) do
      # Calculate expires_at from expires_in
      expires_at =
        DateTime.utc_now()
        |> DateTime.add(result.expires_in, :second)

      response = %{
        access_token: result.access_token,
        expires_at: ResponseHelpers.format_timestamp(expires_at),
        expires_in: result.expires_in
      }

      conn
      |> put_status(:ok)
      |> json(response)
    else
      {:error, :validation_error, details} ->
        error = ApiError.bad_request("Invalid request parameters", details)
        render_error(conn, error)

      {:error, :invalid_token} ->
        error = ApiError.from_code(:invalid_refresh_token, nil, nil)
        render_error(conn, error)

      {:error, :session_not_found} ->
        error = ApiError.from_code(:session_not_found, nil, nil)
        render_error(conn, error)

      {:error, reason} ->
        error = ApiError.unauthorized("Failed to refresh token")
        render_error(conn, %{error | details: %{reason: to_string(reason)}})
    end
  end

  @doc """
  POST /api/auth/send-otp

  Generates and sends an OTP code to the specified email address.

  This endpoint supports both registration and login flows. For registration,
  it will create a new user if one doesn't exist. For login, it requires an
  existing user.

  ## Parameters
  - email: User's email address (required)
  - type: OTP type - "registration" or "login" (required)

  ## Response

  Success (201):
  ```json
  {
    "token_id": "550e8400-e29b-41d4-a716-446655440000",
    "expires_at": "2024-01-01T12:10:00Z",
    "status": "pending"
  }
  ```

  ## Error Responses

  Validation error (400):
  ```json
  {
    "error": {
      "message": "Invalid request parameters",
      "code": "VALIDATION_ERROR",
      "details": {
        "email": "is required",
        "type": "must be either 'registration' or 'login'"
      }
    }
  }
  ```

  Rate limit exceeded (429):
  ```json
  {
    "error": {
      "message": "Rate limit exceeded. Please try again in 300 seconds",
      "code": "RATE_LIMIT_EXCEEDED",
      "details": {
        "retry_after": 300
      }
    }
  }
  ```

  User not found (404) - only for login type:
  ```json
  {
    "error": {
      "message": "User not found",
      "code": "USER_NOT_FOUND"
    }
  }
  ```
  """
  def send_otp(conn, params) do
    with {:ok, email, type} <- validate_send_otp_params(params),
         {:ok, otp_type} <- map_type_to_otp_type(type),
         {:ok, token_id, expires_at} <- generate_otp_for_type(email, type, otp_type) do
      response = %{
        token_id: ResponseHelpers.format_uuid(token_id),
        expires_at: ResponseHelpers.format_timestamp(expires_at),
        status: "pending"
      }

      conn
      |> put_status(:created)
      |> json(response)
    else
      {:error, :validation_error, details} ->
        error = ApiError.bad_request("Invalid request parameters", details)
        render_error(conn, error)

      {:error, :user_not_found} ->
        error = ApiError.from_code(:user_not_found, nil, nil)
        render_error(conn, error)

      {:error, :rate_limited, retry_after} ->
        error = ApiError.from_code(:rate_limit_exceeded, retry_after, %{retry_after: retry_after})
        render_error(conn, error)

      {:error, reason} ->
        error =
          ApiError.unprocessable_entity("Failed to generate OTP", %{reason: to_string(reason)})

        render_error(conn, error)
    end
  end

  @doc """
  POST /api/auth/logout

  Revokes the current session, logging the user out.

  This endpoint requires a valid Bearer token in the Authorization header.
  Upon successful logout, the session is revoked and the access token
  becomes invalid.

  ## Headers
  - Authorization: Bearer <access_token> (required)

  ## Response

  Success (200):
  ```json
  {
    "status": "logged_out"
  }
  ```

  ## Error Responses

  Unauthorized (401):
  ```json
  {
    "error": {
      "message": "Missing or invalid authorization header",
      "code": "UNAUTHORIZED"
    }
  }
  ```

  Session not found (401):
  ```json
  {
    "error": {
      "message": "Session not found or already revoked",
      "code": "SESSION_NOT_FOUND"
    }
  }
  ```
  """
  def logout(conn, _params) do
    # Extract the Bearer token from the Authorization header
    with {:ok, token} <- extract_bearer_token(conn),
         {:ok, _session} <- Accounts.revoke_session(token) do
      conn
      |> put_status(:ok)
      |> json(%{status: "logged_out"})
    else
      {:error, :missing_token} ->
        error = ApiError.unauthorized("Missing or invalid authorization header")
        render_error(conn, error)

      {:error, :invalid_token} ->
        error = ApiError.from_code(:invalid_token, nil, nil)
        render_error(conn, error)

      {:error, :session_not_found} ->
        error =
          ApiError.from_code(:session_not_found, "Session not found or already revoked", nil)

        render_error(conn, error)

      {:error, reason} ->
        error = ApiError.unprocessable_entity("Failed to logout", %{reason: to_string(reason)})
        render_error(conn, error)
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Extracts Bearer token from Authorization header
  defp extract_bearer_token(conn) do
    case Plug.Conn.get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> {:ok, token}
      _ -> {:error, :missing_token}
    end
  end

  # Validates verify-otp request parameters
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

  # Validates refresh request parameters
  defp validate_refresh_params(params) do
    refresh_token = params["refresh_token"]

    if is_nil(refresh_token) or refresh_token == "" do
      {:error, :validation_error, %{refresh_token: "is required"}}
    else
      {:ok, refresh_token}
    end
  end

  # Validates send-otp request parameters
  defp validate_send_otp_params(params) do
    email = params["email"]
    type = params["type"]

    errors = %{}

    errors =
      if is_nil(email) or email == "" do
        Map.put(errors, :email, "is required")
      else
        errors
      end

    errors =
      if is_nil(type) or type == "" do
        Map.put(errors, :type, "is required")
      else
        if type not in ["registration", "login"] do
          Map.put(errors, :type, "must be either 'registration' or 'login'")
        else
          errors
        end
      end

    if map_size(errors) > 0 do
      {:error, :validation_error, errors}
    else
      {:ok, email, type}
    end
  end

  # Maps the API type parameter to internal OTP type
  defp map_type_to_otp_type("registration"), do: {:ok, "email_verification"}
  defp map_type_to_otp_type("login"), do: {:ok, "login"}
  defp map_type_to_otp_type(_), do: {:error, :invalid_type}

  # Generates OTP based on the type (registration or login)
  defp generate_otp_for_type(email, "registration", otp_type) do
    # For registration, check if user exists
    case Accounts.get_user_by_email(email) do
      nil ->
        # User doesn't exist, generate OTP for email verification
        case Accounts.generate_otp(email, otp_type) do
          {:ok, token_uuid} ->
            # Get the token to retrieve id and expires_at
            token = Accounts.get_token_by_uuid(token_uuid)
            {:ok, token.id, token.expires_at}

          {:error, :rate_limited, retry_after} ->
            {:error, :rate_limited, retry_after}

          {:error, reason} ->
            {:error, reason}
        end

      _user ->
        # User already exists, return error
        {:error, :validation_error, %{email: "has already been taken"}}
    end
  end

  defp generate_otp_for_type(email, "login", otp_type) do
    # For login, user must exist
    case Accounts.get_user_by_email(email) do
      nil ->
        {:error, :user_not_found}

      _user ->
        case Accounts.generate_otp(email, otp_type) do
          {:ok, token_uuid} ->
            # Get the token to retrieve id and expires_at
            token = Accounts.get_token_by_uuid(token_uuid)
            {:ok, token.id, token.expires_at}

          {:error, :rate_limited, retry_after} ->
            {:error, :rate_limited, retry_after}

          {:error, reason} ->
            {:error, reason}
        end
    end
  end

  # Renders an API error response
  defp render_error(conn, %ApiError{} = error) do
    conn = maybe_add_headers(conn, error)

    conn
    |> put_status(error.status)
    |> json(ApiError.to_json(error))
  end

  # Adds headers from ApiError to the connection if present
  defp maybe_add_headers(conn, %ApiError{headers: nil}), do: conn

  defp maybe_add_headers(conn, %ApiError{headers: headers}) do
    Enum.reduce(headers, conn, fn {key, value}, acc ->
      put_resp_header(acc, key, value)
    end)
  end
end
