defmodule EasyWeb.Coaches.MuscleJSON do
  alias Easy.Training.TrainingMuscle

  @spec index(%{muscles: [TrainingMuscle.t()]}) :: map()
  def index(%{muscles: muscles}) do
    %{data: Enum.map(muscles, &data/1)}
  end

  defp data(%TrainingMuscle{} = muscle) do
    %{id: muscle.id, name: muscle.name, description: muscle.description}
  end
end
