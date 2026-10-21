defmodule EasyWeb.Plugs.LoadClient do
  import Plug.Conn

  alias Easy.ClientAccount
  alias EasyWeb.FallbackController

  @spec init(any()) :: any()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), any()) :: Plug.Conn.t()
  def call(conn, _opts) do
    case ClientAccount.get_accepted_client(conn.assigns.ctx) do
      {:ok, client} -> conn |> assign(:client, client) |> assign(:ctx, %{conn.assigns.ctx | client_id: client.id})
      {:error, :not_found} -> FallbackController.call(conn, {:error, :not_found})
    end
  end
end
