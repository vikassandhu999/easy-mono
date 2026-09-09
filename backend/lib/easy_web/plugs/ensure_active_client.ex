defmodule EasyWeb.Plugs.EnsureActiveClient do
  import Plug.Conn

  alias Easy.ClientAccount
  alias EasyWeb.FallbackController

  @spec init(any()) :: any()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), any()) :: Plug.Conn.t()
  def call(conn, _opts) do
    case ClientAccount.get_active_client(conn.assigns.ctx) do
      {:ok, client} -> assign(conn, :ctx, %{conn.assigns.ctx | client_id: client.id})
      {:error, :not_found} -> FallbackController.call(conn, {:error, :client_inactive})
    end
  end
end
