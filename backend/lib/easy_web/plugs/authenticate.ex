defmodule EasyWeb.Plugs.Authenticate do
  import Plug.Conn
  require Logger
  alias Easy.Identity.Token
  alias EasyWeb.FallbackController

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, claims} <- Token.verify_access_token(token) do
      assign(conn, :claims, claims)
    else
      {:error, reason} ->
        Logger.warning("Authentication failed: #{inspect(reason)}")
        FallbackController.send_unauthenticated_response(conn)

      _ ->
        FallbackController.send_unauthenticated_response(conn)
    end
  end
end
