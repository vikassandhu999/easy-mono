defmodule EasyWeb.Coaches.EquipmentController do
  use EasyWeb, :controller

  alias Easy.Training

  def index(conn, params) do
    {:ok, equipment} = Training.list_equipment(params)
    render(conn, :index, equipment: equipment)
  end
end
