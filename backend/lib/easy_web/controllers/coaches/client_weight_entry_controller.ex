defmodule EasyWeb.Coaches.ClientWeightEntryController do
  use EasyWeb, :controller

  alias Easy.WeightEntries

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, %{client: client, entries: entries, adherence: adherence}} <-
           WeightEntries.list_entries_for_client(business_id, client_id, Map.get(params, "since")) do
      render(conn, :index, entries: entries, client: client, adherence: adherence)
    end
  end
end
