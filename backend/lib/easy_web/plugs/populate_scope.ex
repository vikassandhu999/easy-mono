defmodule EasyWeb.Plugs.PopulateScope do
  @moduledoc """
  Plug that populates `conn.assigns.scope` with an `Easy.Auth.Scope` struct.

  This plug extracts the scope from JWT token claims and makes it available
  to all authenticated controllers via `conn.assigns.scope`.

  Must be used after the `Authenticate` plug which populates `conn.assigns.token_claims`.

  ## Usage

  In router:

      pipeline :api_authenticated do
        plug :accepts, ["json"]
        plug EasyWeb.Plugs.Authenticate
        plug EasyWeb.Plugs.PopulateScope
      end

  In controllers:

      def index(conn, _params) do
        scope = conn.assigns.scope

        # Use scope for authorization
        if Scope.can?(scope, :create_client) do
          # ... create client
        end
      end
  """

  import Plug.Conn
  alias Easy.Auth.Scope
  alias EasyWeb.FallbackController

  def init(opts), do: opts

  @doc """
  Extracts scope from token_claims and assigns it to the connection.

  Returns 401 if scope cannot be extracted from claims.
  """
  def call(conn, _opts) do
    case Scope.from_claims(conn.assigns.token_claims) do
      {:ok, scope} ->
        assign(conn, :scope, scope)

      {:error, _reason} ->
        FallbackController.send_unauthorized_response(
          conn,
          "Invalid authentication context"
        )
    end
  end
end
