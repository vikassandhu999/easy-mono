defmodule EasyWeb.Coaches.EquipmentJSON do
  alias Easy.Training.TrainingEquipment

  def index(%{equipment: equipment}) do
    %{data: for(item <- equipment, do: data(item))}
  end

  defp data(%TrainingEquipment{} = equipment) do
    %{
      id: equipment.id,
      name: equipment.name,
      description: equipment.description
    }
  end
end
