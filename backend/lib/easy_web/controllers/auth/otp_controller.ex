defmodule EasyWeb.Auth.OTPController do
  use EasyWeb, :controller

  alias Easy.Identity
  alias Easy.Auth.JWT
  alias Easy.ApiError

  action_fallback EasyWeb.FallbackController

  @doc """
  POST /api/v1/auth/request-otp
  Request an OTP code for authentication

  Body:
  {
    "email": "user@example.com",
    "role": "coach" | "client"
  }
  """
  def request(conn, %{"email" => email, "role" => role})
      when is_binary(email) and role in ["coach", "client"] do
    case Identity.request_otp(email: email) do
      {:ok, token} ->
        json(conn, %{
          token_id: token.id,
          message: "OTP sent to your email",
          expires_in: 900
        })

      {:error, :rate_limited} ->
        error =
          ApiError.unprocessable_entity("Please wait 60 seconds before requesting a new OTP")

        render_error(conn, error)

      {:error, %Ecto.Changeset{} = changeset} ->
        error = ApiError.from_changeset(changeset)
        render_error(conn, error)

      {:error, _reason} ->
        error = ApiError.unprocessable_entity("Failed to send OTP. Please try again.")
        render_error(conn, error)
    end
  end

  def request(conn, %{"phone" => phone, "role" => role})
      when is_binary(phone) and role in ["coach", "client"] do
    case Identity.request_otp(phone: phone) do
      {:ok, token} ->
        json(conn, %{
          token_id: token.id,
          message: "OTP sent to your phone",
          expires_in: 900
        })

      {:error, :rate_limited} ->
        error =
          ApiError.unprocessable_entity("Please wait 60 seconds before requesting a new OTP")

        render_error(conn, error)

      {:error, _reason} ->
        error = ApiError.unprocessable_entity("Failed to send OTP. Please try again.")
        render_error(conn, error)
    end
  end

  def request(conn, _params) do
    error = ApiError.bad_request("email/phone and role (coach/client) are required")
    render_error(conn, error)
  end

  @doc """
  POST /api/v1/auth/verify-otp
  Verify OTP code and authenticate user

  Body:
  {
    "token_id": "uuid",
    "otp": "123456",
    "role": "coach" | "client",
    "device_info": {...}
  }
  """
  def verify(conn, %{"token_id" => token_id, "otp" => otp, "role" => role} = params)
      when role in ["coach", "client"] do
    device_info = Map.get(params, "device_info", %{})

    case Identity.verify_otp_and_authenticate(token_id, otp, device_info) do
      {:ok, %{user: user, session: session, user_status: user_status}} ->
        handle_successful_auth(conn, user, session, user_status, role)

      {:error, :token_not_found} ->
        error = ApiError.not_found("Token")
        render_error(conn, error)

      {:error, :token_expired} ->
        error = ApiError.unprocessable_entity("Token has expired. Please request a new OTP.")
        render_error(conn, error)

      {:error, :token_already_used} ->
        error =
          ApiError.unprocessable_entity("Token has already been used. Please request a new OTP.")

        render_error(conn, error)

      {:error, :invalid_otp} ->
        error = ApiError.unauthorized("Invalid OTP code. Please try again.")
        render_error(conn, error)

      {:error, _reason} ->
        error = ApiError.internal_server_error("Authentication failed. Please try again.")
        render_error(conn, error)
    end
  end

  def verify(conn, _params) do
    error = ApiError.bad_request("token_id, otp, and role are required")
    render_error(conn, error)
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  defp handle_successful_auth(conn, user, session, user_status, role) do
    case Identity.get_user_role_info(user, role) do
      {:ok, role_info} ->
        {:ok, access_token} = JWT.create_access_token(user, session)

        response = %{
          access_token: access_token,
          refresh_token: session.refresh_token,
          expires_in: 3600,
          user: serialize_user(user),
          role: role
        }

        response =
          if user_status == :created do
            Map.put(response, :needs_onboarding, true)
          else
            response
            |> Map.put(:needs_onboarding, false)
            |> Map.put(String.to_atom(role), role_info)
          end

        conn
        |> set_auth_cookies(access_token, session.refresh_token)
        |> json(response)

      {:error, :role_not_found} when user_status == :created and role == "coach" ->
        # New user trying to be coach - allow onboarding
        {:ok, access_token} = JWT.create_access_token(user, session)

        response = %{
          access_token: access_token,
          refresh_token: session.refresh_token,
          expires_in: 3600,
          user: serialize_user(user),
          needs_onboarding: true,
          role: role
        }

        conn
        |> set_auth_cookies(access_token, session.refresh_token)
        |> json(response)

      {:error, :role_not_found} when role == "coach" ->
        error =
          ApiError.forbidden(
            "This account is not registered as a coach. Please use the client app or contact support."
          )

        render_error(conn, error)

      {:error, :role_not_found} when role == "client" and user_status == :created ->
        error =
          ApiError.forbidden(
            "Client accounts require an invitation from a coach. Please contact your coach."
          )

        render_error(conn, error)

      {:error, :role_not_found} ->
        error = ApiError.forbidden("This account is not registered as a #{role}.")
        render_error(conn, error)
    end
  end

  defp set_auth_cookies(conn, access_token, refresh_token) do
    # Use secure: false for development, will be true in production
    secure = Mix.env() == :prod

    conn
    |> put_resp_cookie("access_token", access_token,
      http_only: true,
      secure: secure,
      same_site: "Lax",
      # 1 hour
      max_age: 60 * 60
    )
    |> put_resp_cookie("refresh_token", refresh_token,
      http_only: true,
      secure: secure,
      same_site: "Lax",
      # 30 days
      max_age: 60 * 60 * 24 * 30
    )
  end

  defp serialize_user(user) do
    %{
      id: user.id,
      email: user.email,
      phone: user.phone,
      email_confirmed: not is_nil(user.email_confirmed_at),
      phone_confirmed: not is_nil(user.phone_confirmed_at)
    }
  end

  defp render_error(conn, %ApiError{} = error) do
    conn
    |> put_status(error.status)
    |> json(%{
      code: error.code,
      error: error.message,
      details: error.details
    })
  end
end
