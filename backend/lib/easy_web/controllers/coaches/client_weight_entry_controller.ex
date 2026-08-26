defmodule EasyWeb.Coaches.ClientWeightEntryController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.WeightEntries
  alias EasyWeb.Types.{WeightEntry, WeightEntryIndex}

  typed(:index, query: WeightEntry.list_query(), ok: {200, WeightEntryIndex.t()})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    client_id = conn.path_params["client_id"]

    with {:ok, %{client: client, entries: entries, adherence: adherence}} <-
           WeightEntries.list_entries_for_client(conn.assigns.ctx, client_id, since: conn.query_params["since"]) do
      ok(conn, WeightEntry.index(entries, client, adherence))
    end
  end
end
