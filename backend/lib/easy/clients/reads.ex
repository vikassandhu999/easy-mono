defmodule Easy.Clients.Reads do
  alias Easy.Clients.Client
  alias Easy.Repo

  @spec fetch_client(String.t(), String.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def fetch_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  @spec fetch_client_with_preloads(String.t(), String.t()) ::
          {:ok, Client.t()} | {:error, :not_found}
  def fetch_client_with_preloads(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Client.with_preloads()
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  @spec preload_client(Client.t()) :: {:ok, Client.t()}
  def preload_client(%Client{} = client) do
    {:ok, Repo.preload(client, [:user, :business, :creator], force: true)}
  end

  @spec list_clients(String.t(), String.t(), String.t() | nil, non_neg_integer(), pos_integer()) ::
          {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: map()}}
  def list_clients(business_id, search, status, offset, limit) do
    base =
      Client
      |> Client.for_business(business_id)
      |> Client.search(search)
      |> Client.with_status(status)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       summary: Client.summary(Client.for_business(business_id)),
       clients:
         base
         |> Client.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> Client.with_preloads()
         |> Repo.all()
     }}
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
