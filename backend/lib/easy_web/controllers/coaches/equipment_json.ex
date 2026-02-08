defmodule EasyWeb.Coaches.EquipmentJSON do
  alias Easy.Training.Library.Equipment

  def index(%{equipment: equipment}) do
    %{data: for(item <- equipment, do: data(item))}
  end

  defp data(%Equipment{} = equipment) do
    %{
      id: equipment.id,
      name: equipment.name
    }
  end
end
