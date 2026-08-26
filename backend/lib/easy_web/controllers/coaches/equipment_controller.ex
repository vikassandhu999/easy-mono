defmodule EasyWeb.Coaches.EquipmentController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Training.Library
  alias EasyWeb.Types.Training.Equipment

  typed(:index, query: Equipment.list_query(), ok: {200, data([Equipment.t()])})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, equipment} <- Library.list_equipment(conn.query_params["search"]) do
      ok(conn, %{data: equipment})
    end
  end
end
