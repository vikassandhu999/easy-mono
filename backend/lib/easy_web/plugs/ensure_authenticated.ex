defmodule EasyWeb.Plugs.EnsureAuthenticated do
  @moduledoc """
  Plug to ensure the request has a valid Bearer token.

  This plug:
  1. Extracts the Bearer token from the Authorization header
  2. Verifies the token is valid and not expired
  3. Checks that the associated session is still active
  4. Halts the request with 401 if authentication fails

  The token claims are stored in conn.assigns.token_claims for use by
  downstream plugs like LoadCurrentUser.

  ## Usage

  In your router:

      pipeline :authenticated do
        plug EasyWeb.Plugs.EnsureAuthenticated
        plug EasyWeb.Plugs.LoadCurrentUser
      end

      scope "/api", EasyWeb do
        pipe_through [:api, :authenticated]
        # ... authenticated routes
      end
  """

  import Plug.Conn

  alias Easy.Accounts
  alias Easy.ApiError
  alias EasyWeb.ApiHelpers

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, token} <- extract_bearer_token(conn),
         {:ok, claims} <- Accounts.Token.verify_token(token),
         session_id <- Accounts.Token.get_session_id(claims),
         %Accounts.Session{} = session <- Accounts.get_session_by_id(session_id),
         true <- Accounts.Session.valid?(session) do
      # Store token claims in conn.assigns for downstream plugs
      assign(conn, :token_claims, claims)
    else
      {:error, :missing_token} ->
        unauthorized(conn, "Missing or invalid authorization header")

      {:error, _reason} ->
        unauthorized(conn, "The access token is invalid or has expired")

      false ->
        unauthorized(conn, "Session has been revoked or expired")

      nil ->
        unauthorized(conn, "Session not found")
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

  # Returns 401 Unauthorized response using ApiError
  defp unauthorized(conn, message) do
    error = ApiError.unauthorized(message)

    conn
    |> ApiHelpers.render_api_error(error)
    |> halt()
  end
end
