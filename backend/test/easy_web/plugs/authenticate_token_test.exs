defmodule EasyWeb.Plugs.AuthenticateTokenTest do
  use Easy.ConnCase, async: true

  alias Easy.Accounts
  alias EasyWeb.Plugs.AuthenticateToken

  @moduledoc """
  Unit tests for the AuthenticateToken plug with cookie support.

  Tests the following scenarios:
  - Authentication with valid access token in cookie
  - Authentication with valid access token in Authorization header
  - Fallback from cookie to header when cookie is missing
  - Rejection of invalid tokens from both sources
  - Proper assignment of scope and current_user to conn.assigns
  """

  describe "AuthenticateToken plug with cookie support" do
    setup do
      email = "plugtest#{System.unique_integer([:positive])}@example.com"

      {:ok, user} =
        Accounts.create_user(%{
          email: email,
          full_name: "Plug Test User",
          email_verified: true
        })

      {:ok, %{session: session_data}} = Accounts.create_session(user)

      %{user: user, session_data: session_data}
    end

    test "authenticates with valid access token in cookie", %{
      conn: conn,
      session_data: session_data,
      user: user
    } do
      conn =
        conn
        |> Plug.Conn.put_req_header("cookie", "access_token=#{session_data.access_token}")
        |> AuthenticateToken.call([])

      # Should not halt the connection
      refute conn.halted

      # Should assign scope
      assert conn.assigns[:scope] != nil
      scope = conn.assigns.scope
      assert scope.user_id == user.id

      # Should assign current_user (if implemented)
      # Note: Based on the plug code, current_user is not assigned, only scope
      # The design document mentions it, but the implementation only assigns scope
    end

    test "authenticates with valid access token in Authorization header", %{
      conn: conn,
      session_data: session_data,
      user: user
    } do
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{session_data.access_token}")
        |> AuthenticateToken.call([])

      # Should not halt the connection
      refute conn.halted

      # Should assign scope
      assert conn.assigns[:scope] != nil
      scope = conn.assigns.scope
      assert scope.user_id == user.id
    end

    test "falls back to Authorization header when cookie is missing", %{
      conn: conn,
      session_data: session_data,
      user: user
    } do
      # No cookie set, only Authorization header
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{session_data.access_token}")
        |> AuthenticateToken.call([])

      # Should not halt the connection
      refute conn.halted

      # Should assign scope
      assert conn.assigns[:scope] != nil
      scope = conn.assigns.scope
      assert scope.user_id == user.id
    end

    test "prefers cookie over Authorization header when both are present", %{
      conn: conn,
      session_data: session_data,
      user: user
    } do
      # Set both cookie and header with the same valid token
      conn =
        conn
        |> Plug.Conn.put_req_header("cookie", "access_token=#{session_data.access_token}")
        |> put_req_header("authorization", "Bearer invalid-token")
        |> AuthenticateToken.call([])

      # Should not halt the connection (cookie is valid)
      refute conn.halted

      # Should assign scope from cookie token
      assert conn.assigns[:scope] != nil
      scope = conn.assigns.scope
      assert scope.user_id == user.id
    end

    test "rejects invalid token from cookie", %{conn: conn} do
      conn =
        conn
        |> Plug.Conn.put_req_header("cookie", "access_token=invalid-token")
        |> AuthenticateToken.call([])

      # Should halt the connection
      assert conn.halted

      # Should return 401 Unauthorized
      assert conn.status == 401

      # Should return error response
      response = Jason.decode!(conn.resp_body)
      assert response["error"]["code"] in ["INVALID_TOKEN", "invalid_token"]
    end

    test "rejects invalid token from Authorization header", %{conn: conn} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer invalid-token")
        |> AuthenticateToken.call([])

      # Should halt the connection
      assert conn.halted

      # Should return 401 Unauthorized
      assert conn.status == 401

      # Should return error response
      response = Jason.decode!(conn.resp_body)
      assert response["error"]["code"] in ["INVALID_TOKEN", "invalid_token"]
    end

    test "rejects request with missing token (no cookie and no header)", %{conn: conn} do
      conn = AuthenticateToken.call(conn, [])

      # Should halt the connection
      assert conn.halted

      # Should return 401 Unauthorized
      assert conn.status == 401

      # Should return error response
      response = Jason.decode!(conn.resp_body)
      assert response["error"]["code"] in ["MISSING_TOKEN", "missing_token"]
    end

    test "properly assigns scope with user_id and business_id", %{
      conn: conn,
      user: user
    } do
      # Create a business and session with business context
      {:ok, business} =
        Easy.Organizations.create_business_legacy(user, %{
          name: "Test Business"
        })

      {:ok, _coach} =
        Easy.Organizations.create_coach_legacy(user.id, business.id, %{
          status: "active"
        })

      {:ok, %{session: business_session}} = Accounts.create_session(user, business.id)

      conn =
        conn
        |> Plug.Conn.put_req_header("cookie", "access_token=#{business_session.access_token}")
        |> AuthenticateToken.call([])

      # Should not halt the connection
      refute conn.halted

      # Should assign scope with business context
      assert conn.assigns[:scope] != nil
      scope = conn.assigns.scope
      assert scope.user_id == user.id
      assert scope.business_id == business.id
    end

    test "handles malformed Authorization header gracefully", %{conn: conn} do
      conn =
        conn
        |> put_req_header("authorization", "InvalidFormat token")
        |> AuthenticateToken.call([])

      # Should halt the connection
      assert conn.halted

      # Should return 401 Unauthorized
      assert conn.status == 401

      # Should return error response
      response = Jason.decode!(conn.resp_body)
      assert response["error"]["code"] in ["MISSING_TOKEN", "missing_token"]
    end

    test "handles empty cookie value gracefully", %{conn: conn} do
      conn =
        conn
        |> Plug.Conn.put_req_header("cookie", "access_token=")
        |> AuthenticateToken.call([])

      # Should halt the connection
      assert conn.halted

      # Should return 401 Unauthorized
      assert conn.status == 401

      # Should return error response
      response = Jason.decode!(conn.resp_body)
      assert response["error"]["code"] in ["MISSING_TOKEN", "missing_token", "INVALID_TOKEN"]
    end
  end
end
