defmodule EasyWeb.Plugs.PopulateScope do
  import Plug.Conn
  alias Easy.Auth.Scope
  alias EasyWeb.FallbackController

  def init(opts), do: opts

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
