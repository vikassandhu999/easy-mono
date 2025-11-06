defmodule EasyWeb.OAuthController do
  use EasyWeb, :controller

  alias Easy.Accounts
  alias Easy.OAuthError

  import EasyWeb.OAuthHelpers

  @moduledoc """
  OAuth 2.0-style token endpoint for authentication.

  Implements RFC 6749 compliant token endpoint with support for:
  - OTP-based authentication (grant_type=otp)
  - Refresh token flow (grant_type=refresh_token)
  """

  @doc """
  POST /oauth/authorize

  OAuth 2.0-style authorization endpoint for initiating OTP authentication.

  This endpoint initiates the OTP authentication flow by sending a verification
  code to the user's email address. The user must then exchange the OTP code
  for tokens using the /oauth/token endpoint.

  ## Parameters
  - email: User's email address (required)
  - resend: Set to "true" to resend OTP (optional)

  ## Response

  Success (200):
  ```json
  {
    "status": "verification_pending"
  }
  ```

  ## Error Responses

  Rate limit exceeded (429):
  ```json
  {
    "error": "slow_down",
    "error_description": "Rate limit exceeded. Please try again in 300 seconds"
  }
  ```

  Invalid request (400):
  ```json
  {
    "error": "invalid_request",
    "error_description": "Missing required parameter: email"
  }
  ```
  """
  def authorize(conn, params) do
    with {:ok, email} <- validate_required_param(params, "email") do
      # Determine if this is a resend request
      is_resend = params["resend"] == "true" || params["resend"] == true

      # Request OTP (either new or resend)
      result =
        if is_resend do
          # For resend, we use resend_otp which invalidates old tokens
          # We try login type first, then fall back to email_verification
          case Accounts.resend_otp(email, "login") do
            {:ok, _token_uuid} ->
              {:ok, :sent}

            {:error, :rate_limited, retry_after} ->
              {:error, :rate_limited, retry_after}

            # If no login token exists, try email_verification
            _ ->
              case Accounts.resend_otp(email, "email_verification") do
                {:ok, _token_uuid} -> {:ok, :sent}
                {:error, :rate_limited, retry_after} -> {:error, :rate_limited, retry_after}
                error -> error
              end
          end
        else
          # For new requests, use request_login_otp which checks if user exists
          case Accounts.request_login_otp(email) do
            {:ok, _token_uuid} ->
              {:ok, :sent}

            {:error, :user_not_found} ->
              # User doesn't exist, return success anyway (don't leak user existence)
              {:ok, :sent}

            {:error, :rate_limited, retry_after} ->
              {:error, :rate_limited, retry_after}

            error ->
              error
          end
        end

      case result do
        {:ok, :sent} ->
          conn
          |> put_status(:ok)
          |> json(%{status: "verification_pending"})

        {:error, :rate_limited, retry_after} ->
          render_oauth_error(conn, OAuthError.slow_down(retry_after))

        {:error, _reason} ->
          render_oauth_error(conn, OAuthError.invalid_request("Failed to send verification code"))
      end
    else
      {:error, %OAuthError{} = error} ->
        render_oauth_error(conn, error)
    end
  end

  @doc """
  POST /oauth/token

  OAuth 2.0 token endpoint supporting multiple grant types.

  ## Grant Types

  ### OTP Grant (grant_type=otp)
  Exchanges an OTP code for access and refresh tokens.

  Parameters:
  - grant_type: "otp" (required)
  - email: User's email address (required)
  - code: 6-digit OTP code (required)

  Response:
  ```json
  {
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 604800
  }
  ```

  ### Refresh Token Grant (grant_type=refresh_token)
  Exchanges a refresh token for a new access token.

  Parameters:
  - grant_type: "refresh_token" (required)
  - refresh_token: Valid refresh token (required)

  Response:
  ```json
  {
    "access_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 604800
  }
  ```

  ## Error Responses

  All errors follow OAuth 2.0 error format:
  ```json
  {
    "error": "invalid_grant",
    "error_description": "The provided OTP code is invalid or has expired"
  }
  ```

  Error codes:
  - invalid_request: Missing or invalid parameters
  - invalid_grant: Invalid OTP code or expired token
  - invalid_token: Invalid or expired refresh token
  - slow_down: Rate limit exceeded
  """
  def token(conn, params) do
    case params["grant_type"] do
      "otp" ->
        handle_otp_grant(conn, params)

      "refresh_token" ->
        handle_refresh_token_grant(conn, params)

      nil ->
        render_oauth_error(conn, OAuthError.invalid_request("Missing grant_type parameter"))

      _ ->
        render_oauth_error(conn, OAuthError.invalid_request("Unsupported grant_type"))
    end
  end

  # ============================================
  # PRIVATE FUNCTIONS - Grant Type Handlers
  # ============================================

  # Handles OTP grant type
  defp handle_otp_grant(conn, params) do
    with {:ok, email} <- validate_required_param(params, "email"),
         {:ok, code} <- validate_required_param(params, "code") do
      # Try login first (most common case), then fall back to email verification
      result =
        case Accounts.login_with_otp(email, code) do
          {:ok, session_data} ->
            {:ok, session_data}

          {:error, :token_not_found} ->
            # Try email verification flow (for registration completion)
            Accounts.verify_and_login(email, code)

          {:error, reason} ->
            {:error, reason}
        end

      case result do
        {:ok, %{access_token: access_token, refresh_token: refresh_token, expires_in: expires_in}} ->
          conn
          |> put_status(:ok)
          |> json(%{
            access_token: access_token,
            refresh_token: refresh_token,
            token_type: "Bearer",
            expires_in: expires_in
          })

        {:error, :user_not_found} ->
          render_oauth_error(conn, OAuthError.invalid_grant("User not found"))

        {:error, :invalid_otp} ->
          render_oauth_error(conn, OAuthError.invalid_grant("The provided OTP code is invalid"))

        {:error, :token_expired} ->
          render_oauth_error(conn, OAuthError.invalid_grant("The OTP code has expired"))

        {:error, :token_used} ->
          render_oauth_error(conn, OAuthError.invalid_grant("The OTP code has already been used"))

        {:error, :max_attempts} ->
          render_oauth_error(
            conn,
            OAuthError.invalid_grant(
              "Maximum verification attempts exceeded. Please request a new code"
            )
          )

        {:error, :token_not_found} ->
          render_oauth_error(conn, OAuthError.invalid_grant("No valid OTP found for this email"))

        {:error, _reason} ->
          render_oauth_error(conn, OAuthError.invalid_grant("Authentication failed"))
      end
    else
      {:error, %OAuthError{} = error} ->
        render_oauth_error(conn, error)
    end
  end

  # Handles refresh token grant type
  defp handle_refresh_token_grant(conn, params) do
    with {:ok, refresh_token} <- validate_required_param(params, "refresh_token") do
      case Accounts.refresh_session(refresh_token) do
        {:ok, %{access_token: access_token, expires_in: expires_in}} ->
          conn
          |> put_status(:ok)
          |> json(%{
            access_token: access_token,
            token_type: "Bearer",
            expires_in: expires_in
          })

        {:error, :invalid_token} ->
          render_oauth_error(
            conn,
            OAuthError.invalid_token("The refresh token is invalid or has expired")
          )

        {:error, :session_not_found} ->
          render_oauth_error(
            conn,
            OAuthError.invalid_token("Session not found or has been revoked")
          )

        {:error, _reason} ->
          render_oauth_error(conn, OAuthError.invalid_token("Token refresh failed"))
      end
    else
      {:error, %OAuthError{} = error} ->
        render_oauth_error(conn, error)
    end
  end

  @doc """
  POST /oauth/revoke

  OAuth 2.0 token revocation endpoint.

  Revokes an access token or refresh token, invalidating the session.

  ## Parameters
  - token: The access token or refresh token to revoke (required)

  ## Response

  Success (200):
  ```json
  {
    "status": "revoked"
  }
  ```

  ## Error Responses

  Invalid token (400):
  ```json
  {
    "error": "invalid_request",
    "error_description": "Invalid or expired token"
  }
  ```
  """
  def revoke(conn, params) do
    with {:ok, token} <- validate_required_param(params, "token") do
      case Accounts.revoke_session(token) do
        {:ok, _session} ->
          conn
          |> put_status(:ok)
          |> json(%{status: "revoked"})

        {:error, :invalid_token} ->
          render_oauth_error(conn, OAuthError.invalid_request("Invalid or expired token"))

        {:error, :session_not_found} ->
          # Return success even if session not found (idempotent)
          conn
          |> put_status(:ok)
          |> json(%{status: "revoked"})

        {:error, _reason} ->
          render_oauth_error(conn, OAuthError.invalid_request("Token revocation failed"))
      end
    else
      {:error, %OAuthError{} = error} ->
        render_oauth_error(conn, error)
    end
  end

  @doc """
  GET /oauth/userinfo

  OAuth 2.0 UserInfo endpoint.

  Returns the current user's profile information. Requires a valid Bearer token.

  ## Headers
  - Authorization: Bearer <access_token> (required)

  ## Response

  Success (200):
  ```json
  {
    "sub": "123",
    "email": "user@example.com",
    "name": "John Doe",
    "email_verified": true,
    "roles": ["coach", "client"]
  }
  ```

  ## Error Responses

  Missing token (401):
  ```json
  {
    "error": "invalid_token",
    "error_description": "Missing or invalid authorization header"
  }
  ```

  Invalid token (401):
  ```json
  {
    "error": "invalid_token",
    "error_description": "The access token is invalid or has expired"
  }
  ```
  """
  def userinfo(conn, _params) do
    with {:ok, token} <- extract_bearer_token(conn),
         {:ok, claims} <- Accounts.Token.verify_token(token),
         user_id <- claims["sub"],
         %Accounts.User{} = user <- Accounts.get_user(user_id) do
      # Preload associations to get roles
      user = Easy.Repo.preload(user, [:coach, :client])

      # Build roles list
      roles = []
      roles = if user.coach, do: ["coach" | roles], else: roles
      roles = if user.client, do: ["client" | roles], else: roles

      conn
      |> put_status(:ok)
      |> json(%{
        sub: to_string(user.id),
        email: user.email,
        name: user.full_name,
        email_verified: user.email_verified,
        roles: roles
      })
    else
      {:error, %OAuthError{} = error} ->
        render_oauth_error(conn, error)

      {:error, _reason} ->
        render_oauth_error(
          conn,
          OAuthError.invalid_token("The access token is invalid or has expired")
        )

      nil ->
        render_oauth_error(conn, OAuthError.invalid_token("User not found"))
    end
  end
end
