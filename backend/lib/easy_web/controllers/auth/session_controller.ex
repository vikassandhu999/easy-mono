defmodule EasyWeb.Auth.SessionController do
  use EasyWeb, :controller

  alias Easy.Identity
  alias Easy.ApiError

  @doc """
  POST /api/v1/auth/logout
  Logout user and revoke session
  """
  def logout(conn, _params) do
    # Get refresh token from cookie
    refresh_token = conn.cookies["refresh_token"]

    if refresh_token do
      case Identity.get_session_by_refresh_token(refresh_token) do
        nil ->
          # Session not found, still clear cookies
          clear_auth_cookies_and_respond(conn)

        session ->
          # Revoke the session
          Identity.revoke_session(session)
          clear_auth_cookies_and_respond(conn)
      end
    else
      clear_auth_cookies_and_respond(conn)
    end
  end

  @doc """
  POST /api/v1/auth/refresh
  Refresh access token using refresh token from cookie
  """
  def refresh(conn, _params) do
    refresh_token = conn.cookies["refresh_token"]

    if refresh_token do
      case Identity.refresh_access_token(refresh_token) do
        {:ok, access_token, new_refresh_token} ->
          conn
          |> set_auth_cookies(access_token, new_refresh_token)
          |> json(%{
            access_token: access_token,
            expires_in: 3600,
            message: "Token refreshed successfully"
          })

        {:error, :session_not_found} ->
          error = ApiError.unauthorized("Invalid refresh token")
          render_error(conn, error)

        {:error, :session_expired} ->
          error = ApiError.unauthorized("Session expired. Please login again.")
          render_error(conn, error)

        {:error, _reason} ->
          error = ApiError.internal_server_error("Failed to refresh token")
          render_error(conn, error)
      end
    else
      error = ApiError.unauthorized("No refresh token provided")
      render_error(conn, error)
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  defp clear_auth_cookies_and_respond(conn) do
    conn
    |> delete_resp_cookie("access_token")
    |> delete_resp_cookie("refresh_token")
    |> json(%{message: "Logged out successfully"})
  end

  defp set_auth_cookies(conn, access_token, refresh_token) do
    conn
    |> put_resp_cookie("access_token", access_token,
      http_only: true,
      secure: true,
      same_site: "Lax",
      max_age: 60 * 60  # 1 hour
    )
    |> put_resp_cookie("refresh_token", refresh_token,
      http_only: true,
      secure: true,
      same_site: "Lax",
      max_age: 60 * 60 * 24 * 30  # 30 days
    )
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
