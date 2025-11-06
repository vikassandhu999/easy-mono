defmodule EasyWeb.Plugs.LoadCurrentUser do
  @moduledoc """
  Plug to load the current user from JWT token claims.

  This plug:
  1. Reads the token claims from conn.assigns.token_claims (set by EnsureAuthenticated)
  2. Extracts the user ID from the claims
  3. Loads the user from the database with preloaded associations
  4. Stores the user in conn.assigns.current_user

  This plug should be used after EnsureAuthenticated in the pipeline.

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

  In your controllers, you can access the current user:

      def index(conn, _params) do
        user = conn.assigns.current_user
        # ...
      end
  """

  import Plug.Conn

  alias Easy.Accounts
  alias Easy.ApiError
  alias Easy.Repo
  alias EasyWeb.ApiHelpers

  def init(opts), do: opts

  def call(conn, _opts) do
    # Get token claims from conn.assigns (set by EnsureAuthenticated)
    case conn.assigns[:token_claims] do
      nil ->
        # This shouldn't happen if EnsureAuthenticated is in the pipeline
        unauthorized(conn, "Authentication required")

      claims ->
        user_id = Accounts.Token.get_user_id(claims)

        case Accounts.get_user(user_id) do
          nil ->
            unauthorized(conn, "User not found")

          user ->
            # Preload associations for role checking
            user = Repo.preload(user, [:coach, :client])

            # Store user and roles in conn.assigns
            conn
            |> assign(:current_user, user)
            |> assign(:current_user_roles, claims["roles"] || [])
        end
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Returns 401 Unauthorized response using ApiError
  defp unauthorized(conn, message) do
    error = ApiError.unauthorized(message)

    conn
    |> ApiHelpers.render_api_error(error)
    |> halt()
  end
end
