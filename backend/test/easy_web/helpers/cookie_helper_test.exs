defmodule EasyWeb.CookieHelperTest do
  use Easy.ConnCase, async: true

  alias EasyWeb.CookieHelper

  @moduledoc """
  Unit tests for the CookieHelper module.

  Tests cookie management functions including setting, clearing, and retrieving
  authentication tokens from HTTP-only cookies.
  """

  describe "set_access_token_cookie/3" do
    test "sets access token cookie with correct attributes", %{conn: conn} do
      access_token = "test_access_token_jwt"
      expires_in = 604_800

      conn = CookieHelper.set_access_token_cookie(conn, access_token, expires_in)

      # Verify cookie is set in response
      assert Map.has_key?(conn.resp_cookies, "access_token")
      cookie = conn.resp_cookies["access_token"]

      # Verify cookie value
      assert cookie.value == access_token

      # Verify security attributes
      assert cookie.http_only == true
      assert cookie.same_site == "Lax"
      assert cookie.path == "/"
      assert cookie.max_age == expires_in

      # Verify domain is nil (same-origin)
      assert is_nil(cookie.domain)
    end

    test "sets Secure flag based on environment configuration", %{conn: conn} do
      access_token = "test_token"
      expires_in = 604_800

      conn = CookieHelper.set_access_token_cookie(conn, access_token, expires_in)
      cookie = conn.resp_cookies["access_token"]

      # In test environment, secure should be false
      config = CookieHelper.get_cookie_config()
      assert cookie.secure == config.secure
    end

    test "uses custom expiration time", %{conn: conn} do
      access_token = "test_token"
      custom_expires_in = 3600

      conn = CookieHelper.set_access_token_cookie(conn, access_token, custom_expires_in)
      cookie = conn.resp_cookies["access_token"]

      assert cookie.max_age == custom_expires_in
    end
  end

  describe "set_refresh_token_cookie/2" do
    test "sets refresh token cookie with correct attributes", %{conn: conn} do
      refresh_token = "test_refresh_token_jwt"

      conn = CookieHelper.set_refresh_token_cookie(conn, refresh_token)

      # Verify cookie is set in response
      assert Map.has_key?(conn.resp_cookies, "refresh_token")
      cookie = conn.resp_cookies["refresh_token"]

      # Verify cookie value
      assert cookie.value == refresh_token

      # Verify security attributes
      assert cookie.http_only == true
      assert cookie.same_site == "Lax"
      assert cookie.path == "/"

      # Verify domain is nil (same-origin)
      assert is_nil(cookie.domain)
    end

    test "uses default expiration of 30 days", %{conn: conn} do
      refresh_token = "test_token"

      conn = CookieHelper.set_refresh_token_cookie(conn, refresh_token)
      cookie = conn.resp_cookies["refresh_token"]

      # Default is 30 days = 2,592,000 seconds
      assert cookie.max_age == 2_592_000
    end

    test "accepts custom expiration time", %{conn: conn} do
      refresh_token = "test_token"
      custom_expires_in = 1_296_000

      conn = CookieHelper.set_refresh_token_cookie(conn, refresh_token, custom_expires_in)
      cookie = conn.resp_cookies["refresh_token"]

      assert cookie.max_age == custom_expires_in
    end

    test "sets Secure flag based on environment configuration", %{conn: conn} do
      refresh_token = "test_token"

      conn = CookieHelper.set_refresh_token_cookie(conn, refresh_token)
      cookie = conn.resp_cookies["refresh_token"]

      # In test environment, secure should be false
      config = CookieHelper.get_cookie_config()
      assert cookie.secure == config.secure
    end
  end

  describe "clear_auth_cookies/1" do
    test "clears both access_token and refresh_token cookies", %{conn: conn} do
      conn = CookieHelper.clear_auth_cookies(conn)

      # Verify both cookies are set to expire
      assert Map.has_key?(conn.resp_cookies, "access_token")
      assert Map.has_key?(conn.resp_cookies, "refresh_token")

      access_cookie = conn.resp_cookies["access_token"]
      refresh_cookie = conn.resp_cookies["refresh_token"]

      # Verify Max-Age is set to 0 to expire cookies
      assert access_cookie.max_age == 0
      assert refresh_cookie.max_age == 0

      # Verify empty values
      assert access_cookie.value == ""
      assert refresh_cookie.value == ""
    end

    test "maintains same security attributes when clearing", %{conn: conn} do
      conn = CookieHelper.clear_auth_cookies(conn)

      access_cookie = conn.resp_cookies["access_token"]
      refresh_cookie = conn.resp_cookies["refresh_token"]

      # Verify security attributes are maintained
      assert access_cookie.http_only == true
      assert access_cookie.same_site == "Lax"
      assert access_cookie.path == "/"

      assert refresh_cookie.http_only == true
      assert refresh_cookie.same_site == "Lax"
      assert refresh_cookie.path == "/"
    end

    test "maintains same Path and Domain attributes", %{conn: conn} do
      conn = CookieHelper.clear_auth_cookies(conn)

      access_cookie = conn.resp_cookies["access_token"]
      refresh_cookie = conn.resp_cookies["refresh_token"]

      config = CookieHelper.get_cookie_config()

      assert access_cookie.path == config.path
      assert access_cookie.domain == config.domain

      assert refresh_cookie.path == config.path
      assert refresh_cookie.domain == config.domain
    end
  end

  describe "get_access_token_from_cookie/1" do
    test "returns {:ok, token} when access_token cookie exists", %{conn: conn} do
      token = "test_access_token"

      # Simulate a request with the cookie
      conn =
        conn
        |> Plug.Conn.put_req_header("cookie", "access_token=#{token}")
        |> Plug.Conn.fetch_cookies()

      assert {:ok, ^token} = CookieHelper.get_access_token_from_cookie(conn)
    end

    test "returns {:error, :not_found} when access_token cookie is missing", %{conn: conn} do
      conn = Plug.Conn.fetch_cookies(conn)

      assert {:error, :not_found} = CookieHelper.get_access_token_from_cookie(conn)
    end

    test "returns {:error, :not_found} when access_token cookie is empty", %{conn: conn} do
      conn =
        conn
        |> Plug.Conn.put_req_header("cookie", "access_token=")
        |> Plug.Conn.fetch_cookies()

      assert {:error, :not_found} = CookieHelper.get_access_token_from_cookie(conn)
    end

    test "fetches cookies automatically if not already fetched", %{conn: conn} do
      token = "test_token"

      conn = Plug.Conn.put_req_header(conn, "cookie", "access_token=#{token}")

      # Don't fetch cookies manually - the function should do it
      assert {:ok, ^token} = CookieHelper.get_access_token_from_cookie(conn)
    end
  end

  describe "get_refresh_token_from_cookie/1" do
    test "returns {:ok, token} when refresh_token cookie exists", %{conn: conn} do
      token = "test_refresh_token"

      conn =
        conn
        |> Plug.Conn.put_req_header("cookie", "refresh_token=#{token}")
        |> Plug.Conn.fetch_cookies()

      assert {:ok, ^token} = CookieHelper.get_refresh_token_from_cookie(conn)
    end

    test "returns {:error, :not_found} when refresh_token cookie is missing", %{conn: conn} do
      conn = Plug.Conn.fetch_cookies(conn)

      assert {:error, :not_found} = CookieHelper.get_refresh_token_from_cookie(conn)
    end

    test "returns {:error, :not_found} when refresh_token cookie is empty", %{conn: conn} do
      conn =
        conn
        |> Plug.Conn.put_req_header("cookie", "refresh_token=")
        |> Plug.Conn.fetch_cookies()

      assert {:error, :not_found} = CookieHelper.get_refresh_token_from_cookie(conn)
    end

    test "fetches cookies automatically if not already fetched", %{conn: conn} do
      token = "test_refresh_token"

      conn = Plug.Conn.put_req_header(conn, "cookie", "refresh_token=#{token}")

      # Don't fetch cookies manually - the function should do it
      assert {:ok, ^token} = CookieHelper.get_refresh_token_from_cookie(conn)
    end
  end

  describe "get_cookie_config/0" do
    test "returns configuration map with expected keys" do
      config = CookieHelper.get_cookie_config()

      assert is_map(config)
      assert Map.has_key?(config, :secure)
      assert Map.has_key?(config, :domain)
      assert Map.has_key?(config, :path)
      assert Map.has_key?(config, :same_site)
    end

    test "returns default values when no config is set" do
      config = CookieHelper.get_cookie_config()

      # Default path should be "/"
      assert config.path == "/"

      # Default same_site should be "Lax"
      assert config.same_site == "Lax"

      # Default domain should be nil (same-origin)
      assert is_nil(config.domain)

      # Secure flag depends on environment
      assert is_boolean(config.secure)
    end

    test "secure flag is false in test environment" do
      config = CookieHelper.get_cookie_config()

      # In test environment, secure should be false
      assert config.secure == false
    end

    test "reads custom configuration from application config" do
      # Save original config
      original_config = Application.get_env(:easy, EasyWeb.CookieHelper, [])

      # Set custom config
      custom_config = [
        secure: true,
        domain: ".example.com",
        path: "/api",
        same_site: "Strict"
      ]

      Application.put_env(:easy, EasyWeb.CookieHelper, custom_config)

      config = CookieHelper.get_cookie_config()

      assert config.secure == true
      assert config.domain == ".example.com"
      assert config.path == "/api"
      assert config.same_site == "Strict"

      # Restore original config
      Application.put_env(:easy, EasyWeb.CookieHelper, original_config)
    end
  end
end
