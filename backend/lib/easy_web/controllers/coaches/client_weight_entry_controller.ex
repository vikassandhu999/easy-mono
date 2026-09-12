defmodule EasyWeb.Coaches.ClientWeightEntryController do
  use EasyWeb, :typed_controller

  alias Easy.WeightEntries
  alias EasyWeb.Types.{WeightEntry, WeightEntryIndex, WeightProgress}

  typed(:index, query: WeightEntry.list_query(), ok: {200, WeightEntryIndex.t()})
  typed(:progress, path: %{client_id: Ecto.UUID.t()}, query: WeightProgress.list_query(), ok: {200, WeightProgress.t()})

  @spec progress(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def progress(conn, _params) do
    query = conn.query_params

    opts = [
      from: query["from"],
      to: query["to"],
      unit: query["unit"],
      cursor: query["cursor"],
      limit: query["limit"]
    ]

    with {:ok, progress} <- WeightEntries.get_progress_for_client(conn.assigns.ctx, conn.path_params["client_id"], opts) do
      ok(conn, progress)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    client_id = conn.path_params["client_id"]

    with {:ok, history} <-
           WeightEntries.list_entries_for_client(conn.assigns.ctx, client_id, since: conn.query_params["since"]) do
      ok(conn, history)
    end
  end
end
