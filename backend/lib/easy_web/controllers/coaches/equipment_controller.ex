defmodule EasyWeb.Coaches.EquipmentController do
  use EasyWeb, :controller

  alias Easy.Repo
  alias Easy.Training.Equipment

  def index(conn, params) do
    search = Map.get(params, "search", "")

    equipment =
      Equipment
      |> Equipment.search(search)
      |> Equipment.alphabetical()
      |> Repo.all()

    render(conn, :index, equipment: equipment)
  end
end
