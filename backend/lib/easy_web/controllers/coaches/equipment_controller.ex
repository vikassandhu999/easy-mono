defmodule EasyWeb.Coaches.EquipmentController do
  use EasyWeb, :controller

  alias Easy.Training.ExerciseReads

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    search = Map.get(params, "search", "")

    with {:ok, equipment} <- ExerciseReads.list_equipment(search) do
      render(conn, :index, equipment: equipment)
    end
  end
end
