defmodule EasyWeb.Coaches.ClientWeightEntryController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Fitness.WeightEntry
  alias Easy.Repo

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, client} <- fetch_client(business_id, client_id),
         {:ok, since_date} <- WeightEntry.parse_since(Map.get(params, "since")),
         {:ok, adherence} <- WeightEntry.adherence(business_id, client.id) do
      entries =
        WeightEntry
        |> WeightEntry.for_business(business_id)
        |> WeightEntry.for_client(client.id)
        |> maybe_since(since_date)
        |> WeightEntry.ordered()
        |> Repo.all()

      render(conn, :index, entries: entries, client: client, adherence: adherence)
    end
  end

  defp fetch_client(business_id, client_id) do
    case Client |> Client.for_business(business_id) |> Repo.get(client_id) do
      nil -> {:error, :not_found}
      client -> {:ok, client}
    end
  end

  defp maybe_since(query, nil), do: query
  defp maybe_since(query, date), do: WeightEntry.since(query, date)
end
