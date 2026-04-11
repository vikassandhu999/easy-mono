defmodule EasyWeb.Coaches.ClientJSON do
  alias Easy.Clients.Client

  @spec show(map()) :: map()
  def show(%{client: client}) do
    %{data: data(client)}
  end

  @spec index(map()) :: map()
  def index(%{clients: clients, count: count, summary: summary}) do
    %{data: Enum.map(clients, &data/1), count: count, summary: summary}
  end

  defp data(%Client{} = client) do
    %{
      id: client.id,
      email: client.email,
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone,
      notes: client.notes,
      status: client.status,
      invite_url: Client.build_invite_url(client),
      inserted_at: client.inserted_at,
      updated_at: client.updated_at
    }
  end
end
