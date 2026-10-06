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

    with {:ok, date} <- record_date(conn.path_params, today),
         true <- not is_nil(Client.current_term(client, today)) and not is_nil(Client.current_term(client, date)) do
      conn
    else
      false -> FallbackController.call(conn, {:error, :coaching_required})
      {:error, _} -> FallbackController.call(conn, {:error, :invalid_date})
    end
  end

  defp record_date(%{"date" => date}, _today) when is_binary(date), do: Date.from_iso8601(date)
  defp record_date(_params, today), do: {:ok, today}
end
