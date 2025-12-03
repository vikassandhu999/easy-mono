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
      name: muscle.name
    }
  end
end
