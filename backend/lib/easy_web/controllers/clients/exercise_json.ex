defmodule EasyWeb.Clients.ExerciseJSON do
  alias Easy.Training.Exercise

  @spec show(map()) :: map()
  def show(%{exercise: exercise}) do
    %{data: data(exercise)}
  end

  @spec index(map()) :: map()
  def index(%{exercises: exercises, count: count}) do
    %{data: Enum.map(exercises, &data/1), count: count}
  end

  defp data(%Exercise{} = exercise) do
    %{
      id: exercise.id,
      source: exercise.source,
      tracking_type: exercise.tracking_type,
      name: exercise.name,
      description: exercise.description,
      instructions: exercise.instructions,
      mechanics: exercise.mechanics,
      force: exercise.force,
      images: exercise.images || [],
      muscles: muscles_data(exercise.muscles),
      equipment: equipment_data(exercise.equipment),
      inserted_at: exercise.inserted_at,
      updated_at: exercise.updated_at
    }
  end

  defp muscles_data(muscles) when is_list(muscles) do
    Enum.map(muscles, fn muscle ->
      %{id: muscle.id, name: muscle.name, description: muscle.description}
    end)
  end

  defp muscles_data(_), do: []

  defp equipment_data(equipment) when is_list(equipment) do
    Enum.map(equipment, fn item ->
      %{id: item.id, name: item.name, description: item.description}
    end)
  end

  defp equipment_data(_), do: []
end
