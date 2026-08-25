defmodule EasyWeb.TypedRouteTestController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias EasyWeb.Types.TypedItem

  typed(:show, ok: {200, data(TypedItem.t())})
  typed(:create, body: TypedItem.create(), ok: {201, data(TypedItem.t())})
  typed(:index, query: TypedItem.list_query(), ok: {200, page(TypedItem.t())})
  typed(:delete, ok: {204, nil})

  def show(conn, _params) do
    ok(conn, %{data: %{id: conn.path_params["id"], name: "n"}})
  end

  def create(conn, _params) do
    ok(conn, %{data: %{id: "1", name: conn.body_params.name}})
  end

  def index(conn, _params) do
    ok(conn, %{data: [], count: 0})
  end

  def delete(conn, _params) do
    ok(conn)
  end
end
