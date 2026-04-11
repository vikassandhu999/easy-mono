defmodule EasyWeb.Clients.ProfileJSON do
  alias Easy.Clients.Client

  @spec show(%{client: Client.t()}) :: map()
  def show(%{client: client}) do
    %{data: data(client)}
  end

  defp data(%Client{} = client) do
    %{
      id: client.id,
      email: client.email,
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone,
      status: client.status,
      inserted_at: client.inserted_at,
      updated_at: client.updated_at
    }
  end
end
