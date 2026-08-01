defmodule EasyWeb.Plugs.EnsureActiveClient do
  alias Easy.Clients
  alias EasyWeb.FallbackController

  @spec init(any()) :: any()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), any()) :: Plug.Conn.t()
  def call(conn, _opts) do
    if Clients.active_client?(conn.assigns.ctx) do
      conn
    else
      FallbackController.call(conn, {:error, :client_inactive})
    end
  end
end
