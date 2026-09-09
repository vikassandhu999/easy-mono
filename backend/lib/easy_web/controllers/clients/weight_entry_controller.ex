defmodule EasyWeb.Clients.WeightEntryController do
  use EasyWeb, :typed_controller

  alias Easy.WeightEntries
  alias EasyWeb.Types.{WeightEntry, WeightEntryIndex}

  typed(:index, query: WeightEntry.list_query(), ok: {200, WeightEntryIndex.t()})
  typed(:create, body: WeightEntry.create(), ok: {201, data(WeightEntry.t())})
  typed(:delete, ok: {204, nil})

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

    with {:ok, _deleted} <- WeightEntries.delete_client_weight_entry(conn.assigns.ctx, entry_id) do
      ok(conn)
    end
  end
end
