defmodule EasyWeb.Clients.WeightEntryController do
  use EasyWeb, :typed_controller

  alias Easy.WeightEntries
  alias EasyWeb.Types.{WeightEntry, WeightEntryIndex, WeightProgress}

  typed(:index, query: WeightEntry.list_query(), ok: {200, WeightEntryIndex.t()})
  typed(:day, query: WeightEntry.day_query(), ok: {200, data(WeightEntry.t() | nil)})
  typed(:progress, query: WeightProgress.list_query(), ok: {200, WeightProgress.t()})
  typed(:create, body: WeightEntry.create(), ok: {201, data(WeightEntry.t())})
  typed(:delete, query: WeightEntry.delete_query(), ok: {204, nil})

  @spec day(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def day(conn, _params) do
    with {:ok, entry} <- WeightEntries.get_client_weight_entry(conn.assigns.ctx, conn.query_params["date"]) do
      ok(conn, %{data: entry})
    end
  end

  @spec progress(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def progress(conn, _params) do
    query = conn.query_params
    opts = [from: query["from"], to: query["to"], unit: query["unit"], cursor: query["cursor"], limit: query["limit"]]

    with {:ok, progress} <- WeightEntries.get_client_progress(conn.assigns.ctx, opts) do
      ok(conn, progress)
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, history} <-
           WeightEntries.list_client_weight_entries(conn.assigns.ctx,
             since: conn.query_params["since"]
           ) do
      ok(conn, history)
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, entry} <- WeightEntries.upsert_client_weight_entry(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: entry})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    entry_id = conn.path_params["id"]

    with {:ok, _deleted} <-
           WeightEntries.delete_client_weight_entry(conn.assigns.ctx, entry_id, expected_revision: conn.query_params["expected_revision"]) do
      ok(conn)
    end
  end
end
