defmodule Easy.Training.Library do
  @moduledoc """
  The Library context.
  """

  import Ecto.Query, warn: false
  alias Easy.Repo

  alias Easy.Training.Library.{MuscleGroup, Muscle, Equipment, Exercise}

  # Muscle Groups

  def list_muscle_groups do
    Repo.all(MuscleGroup)
  end

  def get_muscle_group!(id), do: Repo.get!(MuscleGroup, id)

  def create_muscle_group(attrs \\ %{}) do
    %MuscleGroup{}
    |> MuscleGroup.changeset(attrs)
    |> Repo.insert()
  end

  def update_muscle_group(%MuscleGroup{} = muscle_group, attrs) do
    muscle_group
    |> MuscleGroup.changeset(attrs)
    |> Repo.update()
  end

  def delete_muscle_group(%MuscleGroup{} = muscle_group) do
    Repo.delete(muscle_group)
  end

  def change_muscle_group(%MuscleGroup{} = muscle_group, attrs \\ %{}) do
    MuscleGroup.changeset(muscle_group, attrs)
  end

  # Muscles

  def list_muscles do
    Repo.all(Muscle)
  end

  def get_muscle!(id), do: Repo.get!(Muscle, id)

  def create_muscle(attrs \\ %{}) do
    %Muscle{}
    |> Muscle.changeset(attrs)
    |> Repo.insert()
  end

  def update_muscle(%Muscle{} = muscle, attrs) do
    muscle
    |> Muscle.changeset(attrs)
    |> Repo.update()
  end

  def delete_muscle(%Muscle{} = muscle) do
    Repo.delete(muscle)
  end

  def change_muscle(%Muscle{} = muscle, attrs \\ %{}) do
    Muscle.changeset(muscle, attrs)
  end

  # Equipment

  def list_equipment do
    Repo.all(Equipment)
  end

  def get_equipment!(id), do: Repo.get!(Equipment, id)

  def create_equipment(attrs \\ %{}) do
    %Equipment{}
    |> Equipment.changeset(attrs)
    |> Repo.insert()
  end

  def update_equipment(%Equipment{} = equipment, attrs) do
    equipment
    |> Equipment.changeset(attrs)
    |> Repo.update()
  end

  def delete_equipment(%Equipment{} = equipment) do
    Repo.delete(equipment)
  end

  def change_equipment(%Equipment{} = equipment, attrs \\ %{}) do
    Equipment.changeset(equipment, attrs)
  end

  # Exercises

  @doc """
  Returns the list of exercises.
  Supports filtering by business_id (for hybrid scope: system + business specific).
  """
  def list_exercises(opts \\ []) do
    business_id = Keyword.get(opts, :business_id)

    Exercise
    |> filter_by_business(business_id)
    |> Repo.all()
  end

  defp filter_by_business(query, nil) do
    # Only system exercises
    from e in query, where: is_nil(e.business_id)
  end

  defp filter_by_business(query, business_id) do
    # System exercises OR business specific exercises
    from e in query,
      where: is_nil(e.business_id) or e.business_id == ^business_id
  end

  def get_exercise!(id), do: Repo.get!(Exercise, id)

  def create_exercise(attrs \\ %{}) do
    %Exercise{}
    |> Exercise.changeset(attrs)
    |> Repo.insert()
  end

  def update_exercise(%Exercise{} = exercise, attrs) do
    exercise
    |> Exercise.changeset(attrs)
    |> Repo.update()
  end

  def delete_exercise(%Exercise{} = exercise) do
    Repo.delete(exercise)
  end

  def change_exercise(%Exercise{} = exercise, attrs \\ %{}) do
    Exercise.changeset(exercise, attrs)
  end
end
