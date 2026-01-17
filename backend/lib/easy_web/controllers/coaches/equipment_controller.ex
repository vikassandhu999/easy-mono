defmodule EasyWeb.Coaches.EquipmentController do
  use EasyWeb, :controller

  alias Easy.Training.Library
  import Ecto.Query

  def index(conn, params) do
    search = Map.get(params, "search", "")

    equipment = list_equipment(search)
    render(conn, :index, equipment: equipment)
  end

  defp list_equipment(search_term) when is_binary(search_term) and search_term != "" do
    Library.Equipment
    |> where([e], ilike(e.name, ^"%#{search_term}%"))
    |> Easy.Repo.all()
  end

  defp list_equipment(_) do
    Easy.Repo.all(Library.Equipment)
  end
end
