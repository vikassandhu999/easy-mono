defmodule EasyWeb.Coaches.ClientJSON do
  alias Easy.Clients.Client

  def show(%{client: client}) do
    %{data: data(client)}
  end

  def index(%{clients: clients, count: count}) do
    %{data: Enum.map(clients, &data/1), count: count}
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
      inserted_at: client.inserted_at,
      updated_at: client.updated_at
    }
  end
end
