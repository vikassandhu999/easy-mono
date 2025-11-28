defmodule EasyWeb.MuscleJSON do
  alias Easy.Training.Library.Muscle

  def index(%{muscles: muscles}) do
    %{data: for(muscle <- muscles, do: data(muscle))}
  end

  def show(%{muscle: muscle}) do
    %{data: data(muscle)}
  end

  def data(%Muscle{} = muscle) do
    %{
      id: muscle.id,
      name: muscle.name,
      group: if(muscle.muscle_group, do: muscle.muscle_group.name, else: nil)
    }
  end
end
