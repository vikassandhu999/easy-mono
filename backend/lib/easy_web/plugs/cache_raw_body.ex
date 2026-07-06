defmodule EasyWeb.Plugs.CacheRawBody do
  def read_body(%Plug.Conn{request_path: "/v1/webhooks/" <> _} = conn, opts) do
    with {:ok, body, conn} <- Plug.Conn.read_body(conn, opts) do
      {:ok, body, Plug.Conn.assign(conn, :raw_body, body)}
    end
  end

  def read_body(conn, opts), do: Plug.Conn.read_body(conn, opts)
end
