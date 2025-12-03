defmodule EasyWeb.ExerciseJSON do
  alias Easy.Training.Library.Exercise

  @doc """
  Renders a list of exercises with metadata.
  """
  def index(%{exercises: exercises, meta: meta}) do
    %{
      data: Enum.map(exercises, &render_exercise/1),
      meta: meta
    }
  end

  @doc """
  Renders a single exercise.
  """
  def show(%{exercise: exercise}) do
    %{data: render_exercise(exercise)}
  end

  def create(%{exercise: exercise}), do: show(%{exercise: exercise})
  def update(%{exercise: exercise}), do: show(%{exercise: exercise})

  defp render_exercise(%Exercise{} = exercise) do
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
      equipment: equipment_data(exercise.equipment)
    }
  end

  defp muscles_data(muscles) when is_list(muscles) do
    for muscle <- muscles do
      %{
        id: muscle.id,
        name: muscle.name
      }
    end
  end

  defp muscles_data(_), do: []

  defp equipment_data(equipment_list) when is_list(equipment_list) do
    for item <- equipment_list do
      %{
        id: item.id,
        name: item.name
      }
    end
  end

  defp equipment_data(_), do: []
end
