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
      name: exercise.name,
      description: exercise.description,
      instructions: exercise.instructions,
      mechanics: exercise.mechanics,
      force: exercise.force,
      images: exercise.images || [],
      muscles: muscles_data(exercise.exercise_muscles),
      equipment: equipment_data(exercise.exercise_equipment),
      inserted_at: exercise.inserted_at,
      updated_at: exercise.updated_at
    }
  end

  defp muscles_data(exercise_muscles) when is_list(exercise_muscles) do
    Enum.map(exercise_muscles, fn em ->
      %{id: em.muscle.id, name: em.muscle.name, description: em.muscle.description}
    end)
  end

  defp muscles_data(_), do: []

  defp equipment_data(exercise_equipment) when is_list(exercise_equipment) do
    Enum.map(exercise_equipment, fn ee ->
      %{id: ee.equipment.id, name: ee.equipment.name, description: ee.equipment.description}
    end)
  end

  defp equipment_data(_), do: []
end
