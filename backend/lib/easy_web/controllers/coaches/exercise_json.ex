defmodule EasyWeb.Coaches.ExerciseJSON do
  alias Easy.Training.{Equipment, Exercise, Muscle}

  def show(%{exercise: exercise}) do
    %{data: data(exercise)}
  end

  def index(%{exercises: exercises, count: count}) do
    %{data: Enum.map(exercises, &data/1), count: count}
  end

  defp data(%Exercise{} = exercise) do
    %{
      id: exercise.id,
      name: exercise.name,
      description: exercise.description,
      instructions: exercise.instructions,
      mechanics: exercise.mechanics,
      force: exercise.force,
      images: exercise.images || [],
      business_id: exercise.business_id,
      muscles: muscles_data(exercise.muscles),
      equipment: equipment_data(exercise.equipment),
      inserted_at: exercise.inserted_at,
      updated_at: exercise.updated_at
    }
  end

  defp muscles_data(muscles) when is_list(muscles), do: Enum.map(muscles, &muscle_data/1)
  defp muscles_data(_), do: []

  defp muscle_data(%Muscle{} = muscle) do
    %{id: muscle.id, name: muscle.name, description: muscle.description}
  end

  defp equipment_data(equipment) when is_list(equipment),
    do: Enum.map(equipment, &equipment_item/1)

  defp equipment_data(_), do: []

  defp equipment_item(%Equipment{} = equipment) do
    %{id: equipment.id, name: equipment.name, description: equipment.description}
  end
end
