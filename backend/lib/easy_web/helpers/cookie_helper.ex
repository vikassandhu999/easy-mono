defmodule EasyWeb.CookieHelper do
  @moduledoc """
  Helper functions for managing authentication cookies.

  Provides functions to set, clear, and retrieve authentication tokens from HTTP-only cookies.
  Supports environment-aware security settings and backward compatibility with token-based auth.
  """

  import Plug.Conn

  @access_token_cookie "access_token"
  @refresh_token_cookie "refresh_token"

  @doc """
  Sets the access token cookie on the connection.

  ## Parameters
  - conn: Plug.Conn
  - access_token: String - The JWT access token
  - expires_in: Integer - Token expiration in seconds

  ## Returns
  - Plug.Conn with Set-Cookie header

  ## Examples

      iex> set_access_token_cookie(conn, "jwt_token_here", 604800)
      %Plug.Conn{}
  """
  def set_access_token_cookie(conn, access_token, expires_in) do
    require Logger
    config = get_cookie_config()

    Logger.info(
      "[COOKIE DEBUG] Setting access_token cookie - length: #{String.length(access_token)}, expires_in: #{expires_in}, secure: #{config.secure}, same_site: #{config.same_site}"
    )

    put_resp_cookie(conn, @access_token_cookie, access_token,
      http_only: true,
      secure: config.secure,
      same_site: config.same_site,
      path: config.path,
      max_age: expires_in,
      domain: config.domain
    )
  end

  @doc """
  Sets the refresh token cookie on the connection.

  ## Parameters
  - conn: Plug.Conn
  - refresh_token: String - The JWT refresh token
  - expires_in: Integer - Token expiration in seconds (default: 30 days)

  ## Returns
  - Plug.Conn with Set-Cookie header

  ## Examples

      iex> set_refresh_token_cookie(conn, "refresh_token_here")
      %Plug.Conn{}
  """
  def set_refresh_token_cookie(conn, refresh_token, expires_in \\ 2_592_000) do
    require Logger
    config = get_cookie_config()

    Logger.info(
      "[COOKIE DEBUG] Setting refresh_token cookie - length: #{String.length(refresh_token)}, expires_in: #{expires_in}, secure: #{config.secure}, same_site: #{config.same_site}"
    )

    put_resp_cookie(conn, @refresh_token_cookie, refresh_token,
      http_only: true,
      secure: config.secure,
      same_site: config.same_site,
      path: config.path,
      max_age: expires_in,
      domain: config.domain
    )
  end

  @doc """
  Clears authentication cookies by setting Max-Age to 0.

  Expires both access_token and refresh_token cookies by setting their Max-Age to 0.
  Maintains the same Path and Domain attributes used when setting the cookies.

  ## Parameters
  - conn: Plug.Conn

  ## Returns
  - Plug.Conn with expired cookie headers

  ## Examples

      iex> clear_auth_cookies(conn)
      %Plug.Conn{}
  """
  def clear_auth_cookies(conn) do
    config = get_cookie_config()

    conn
    |> put_resp_cookie(@access_token_cookie, "",
      http_only: true,
      secure: config.secure,
      same_site: config.same_site,
      path: config.path,
      max_age: 0,
      domain: config.domain
    )
    |> put_resp_cookie(@refresh_token_cookie, "",
      http_only: true,
      secure: config.secure,
      same_site: config.same_site,
      path: config.path,
      max_age: 0,
      domain: config.domain
    )
  end

  @doc """
  Gets the access token from the cookie.

  ## Parameters
  - conn: Plug.Conn

  ## Returns
  - {:ok, token} | {:error, :not_found}

  ## Examples

      iex> get_access_token_from_cookie(conn)
      {:ok, "jwt_token_here"}

      iex> get_access_token_from_cookie(conn_without_cookie)
      {:error, :not_found}
  """
  def get_access_token_from_cookie(conn) do
    conn = fetch_cookies(conn)

    case conn.cookies[@access_token_cookie] do
      nil -> {:error, :not_found}
      "" -> {:error, :not_found}
      token -> {:ok, token}
    end
  end

  @doc """
  Gets the refresh token from the cookie.

  ## Parameters
  - conn: Plug.Conn

  ## Returns
  - {:ok, token} | {:error, :not_found}

  ## Examples

      iex> get_refresh_token_from_cookie(conn)
      {:ok, "refresh_token_here"}

      iex> get_refresh_token_from_cookie(conn_without_cookie)
      {:error, :not_found}
  """
  def get_refresh_token_from_cookie(conn) do
    conn = fetch_cookies(conn)

    case conn.cookies[@refresh_token_cookie] do
      nil -> {:error, :not_found}
      "" -> {:error, :not_found}
      token -> {:ok, token}
    end
  end

  @doc """
  Gets cookie configuration from application config.

  Reads configuration from the application environment and provides sensible defaults.
  The Secure flag is environment-aware (true in prod, false in dev).

  ## Returns
  - Map with :secure, :domain, :path, :same_site keys

  ## Examples

      iex> get_cookie_config()
      %{secure: true, domain: nil, path: "/", same_site: "Lax"}
  """
  def get_cookie_config do
    config = Application.get_env(:easy, __MODULE__, [])

    %{
      secure: Keyword.get(config, :secure, get_default_secure()),
      domain: Keyword.get(config, :domain, nil),
      path: Keyword.get(config, :path, "/"),
      same_site: Keyword.get(config, :same_site, "Lax")
    }
  end

  # Private helper to determine default secure flag based on environment
  defp get_default_secure do
    case Application.get_env(:easy, :environment) do
      :prod -> true
      _ -> false
    end
  end
end
