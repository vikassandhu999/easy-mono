defmodule EasyWeb.Coaches.ClientJSON do
  alias Easy.Clients.Client
  alias EasyWeb.Types.Client, as: ClientType

  @spec data(Client.t()) :: ClientType.t()
  def data(%Client{} = client), do: ClientType.format(client)
end
