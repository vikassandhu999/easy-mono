defmodule EasyWeb.Plugs.Authenticate do
  import Plug.Conn
  alias Easy.Accounts.Token
  alias EasyWeb.FallbackController

  def init(opts), do: opts

  def call(conn, _opts) do
    with ["Bearer " <> token] <- get_req_header(conn, "authorization"),
         {:ok, claims} <- Token.verify_token(token) do
      assign(conn, :token_claims, claims)
    else
      _ ->
        FallbackController.send_unauthorized_response(conn)
    end
  end
end
