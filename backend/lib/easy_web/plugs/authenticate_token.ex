defmodule EasyWeb.Plugs.AuthenticateToken do
  @moduledoc """
  Plug to authenticate requests using JWT tokens and construct scope.

  This plug:
  1. Extracts the Bearer token from the Authorization header
  2. Verifies the JWT signature and expiration
  3. Extracts claims from the verified token
  4. Constructs a Scope struct from the claims
  5. Assigns the scope to conn.assigns.scope for use by controllers and service methods
  6. Halts the request with 401 Unauthorized if authentication fails

  The scope contains the user's identity and business context (business_id, coach_id, client_id)
  which is used throughout the application for authorization decisions and query scoping.

  ## Usage

  In your router:

      pipeline :api_authenticated do
        plug :accepts, ["json"]
        plug EasyWeb.Plugs.AuthenticateToken
      end

      scope "/api", EasyWeb do
        pipe_through :api_authenticated
        # ... authenticated routes
      end

  ## Error Responses

  - Missing token → 401 Unauthorized with code "MISSING_TOKEN"
  - Invalid token → 401 Unauthorized with code "INVALID_TOKEN"
  - Expired token → 401 Unauthorized with code "EXPIRED_TOKEN"
  - Invalid claims → 401 Unauthorized with code "INVALID_TOKEN"

  ## Scope Assignment

  After successful authentication, the scope is available at `conn.assigns.scope`:

      def index(conn, _params) do
        scope = conn.assigns.scope
        # Use scope for authorization and service calls
      end
  """

  import Plug.Conn

  alias Easy.Accounts.Token
  alias Easy.Auth.Scope
  alias Easy.ApiError

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, token} <- extract_bearer_token(conn),
         {:ok, claims} <- Token.verify_token(token),
         {:ok, scope} <- Scope.from_claims(claims) do
      # Assign scope to conn for use by controllers and service methods
      assign(conn, :scope, scope)
    else
      {:error, :missing_token} ->
        render_error(conn, :missing_token)

      {:error, :invalid_claims} ->
        render_error(conn, :invalid_token)

      {:error, :expired} ->
        render_error(conn, :expired_token)

      {:error, :invalid_signature} ->
        render_error(conn, :invalid_token)

      {:error, _reason} ->
        render_error(conn, :invalid_token)
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Extracts Bearer token from Authorization header
  defp extract_bearer_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> {:ok, token}
      _ -> {:error, :missing_token}
    end
  end

  # Returns error response using ApiError
  defp render_error(conn, error_code) do
    error = ApiError.from_code(error_code, nil, nil)

    conn
    |> put_status(error.status)
    |> put_resp_content_type("application/json")
    |> maybe_add_headers(error)
    |> send_resp(error.status, Jason.encode!(ApiError.to_json(error)))
    |> halt()
  end

  # Adds headers from ApiError to the connection if present
  defp maybe_add_headers(conn, %ApiError{headers: nil}), do: conn

  defp maybe_add_headers(conn, %ApiError{headers: headers}) do
    Enum.reduce(headers, conn, fn {key, value}, acc ->
      put_resp_header(acc, key, value)
    end)
  end
end
