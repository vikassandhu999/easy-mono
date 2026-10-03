defmodule EasyWeb.Plugs.RequireCoaching do
  alias Easy.Clients.Client
  alias EasyWeb.FallbackController

  @spec init(keyword()) :: keyword()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), keyword()) :: Plug.Conn.t()
  def call(%Plug.Conn{method: "GET"} = conn, _opts), do: conn

  def call(conn, _opts) do
    client = conn.assigns.client
    today = Client.local_date(client, DateTime.utc_now())

    if Client.current_term(client, today),
      do: conn,
      else: FallbackController.call(conn, {:error, :coaching_required})
  end
end
