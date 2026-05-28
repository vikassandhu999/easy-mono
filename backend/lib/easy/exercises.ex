defmodule Easy.Exercises do
  alias Easy.Repo
  alias Easy.Training.Equipment
  alias Easy.Training.Exercise
  alias Easy.Training.ExerciseEquipment
  alias Easy.Training.ExerciseMuscle
  alias Easy.Training.Muscle

  import Ecto.Query

  @spec get_exercise(String.t(), String.t()) :: {:ok, Exercise.t()} | {:error, :not_found}
  def get_exercise(business_id, exercise_id) do
    Exercise
    |> Exercise.for_business(business_id)
    |> Exercise.with_preloads(business_id)
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec get_business_exercise(String.t(), String.t()) ::
          {:ok, Exercise.t()} | {:error, :not_found}
  def get_business_exercise(business_id, exercise_id) do
    Exercise
    |> Exercise.for_business_only(business_id)
    |> Exercise.with_preloads(business_id)
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec list_exercises(
          String.t(),
          String.t() | nil,
          [String.t()] | nil,
          non_neg_integer(),
          pos_integer()
        ) ::
          {:ok, %{count: non_neg_integer(), exercises: [Exercise.t()]}}
  def list_exercises(business_id, search, muscle_ids, offset, limit) do
    search = String.trim(search || "")

    base =
      Exercise
      |> Exercise.for_business(business_id)
      |> Exercise.search(search)
      |> Exercise.with_muscle_ids(muscle_ids)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       exercises:
         base
         |> Exercise.newest()
         |> Easy.Utils.paginate(offset, limit)
         |> Exercise.with_preloads(business_id)
         |> Repo.all()
     }}
  end

  @spec list_muscles(String.t() | nil) :: {:ok, [Muscle.t()]}
  def list_muscles(search) do
    muscles =
      Muscle
      |> Muscle.search(String.trim(search || ""))
      |> Muscle.alphabetical()
      |> Repo.all()

    {:ok, muscles}
  end

  @spec list_equipment(String.t() | nil) :: {:ok, [Equipment.t()]}
  def list_equipment(search) do
    equipment =
      Equipment
      |> Equipment.search(String.trim(search || ""))
      |> Equipment.alphabetical()
      |> Repo.all()

    {:ok, equipment}
  end

  @spec create_exercise(String.t() | nil, map()) ::
          {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def create_exercise(business_id, attrs) do
    business_id
    |> Exercise.insert_changeset(attrs)
    |> Repo.insert()
    |> preload_exercise()
  end

  @spec update_exercise(Exercise.t(), map()) ::
          {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def update_exercise(%Exercise{} = exercise, attrs) do
    exercise
    |> Exercise.update_changeset(attrs)
    |> Repo.update()
    |> preload_exercise()
  end

  @spec update_exercise(String.t(), String.t(), map()) ::
          {:ok, Exercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_exercise(business_id, exercise_id, attrs) do
    with {:ok, exercise} <- get_business_exercise(business_id, exercise_id) do
      update_exercise(exercise, attrs)
    end
  end

  @spec delete_exercise(Exercise.t()) :: {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def delete_exercise(%Exercise{} = exercise), do: Repo.delete(exercise)

  @spec delete_exercise(String.t(), String.t()) ::
          {:ok, Exercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def delete_exercise(business_id, exercise_id) do
    with {:ok, exercise} <- get_business_exercise(business_id, exercise_id) do
      delete_exercise(exercise)
    end
  end

  @spec duplicate_exercise(Exercise.t() | String.t(), String.t()) ::
          {:ok, Exercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_exercise(%Exercise{} = exercise, business_id) do
    with :ok <- authorize_exercise_access(exercise, business_id) do
      exercise =
        Repo.preload(exercise,
          exercise_muscles: exercise_muscle_preload_query(business_id),
          exercise_equipment: exercise_equipment_preload_query(business_id)
        )

      attrs = %{
        name: generate_copy_name(exercise.name, business_id),
        description: exercise.description,
        instructions: exercise.instructions,
        mechanics: exercise.mechanics,
        force: exercise.force,
        muscle_ids: Enum.map(exercise.exercise_muscles, & &1.muscle_id),
        equipment_ids: Enum.map(exercise.exercise_equipment, & &1.equipment_id)
      }

      create_exercise(business_id, attrs)
    end
  end

  def duplicate_exercise(business_id, exercise_id) do
    with {:ok, exercise} <- get_exercise(business_id, exercise_id) do
      duplicate_exercise(exercise, business_id)
    end
  end

  @spec create_muscle(map()) :: {:ok, Muscle.t()} | {:error, Ecto.Changeset.t()}
  def create_muscle(attrs) do
    attrs
    |> Muscle.insert_changeset()
    |> Repo.insert()
  end

  @spec update_muscle(Muscle.t(), map()) :: {:ok, Muscle.t()} | {:error, Ecto.Changeset.t()}
  def update_muscle(%Muscle{} = muscle, attrs) do
    muscle
    |> Muscle.update_changeset(attrs)
    |> Repo.update()
  end

  @spec delete_muscle(Muscle.t()) :: {:ok, Muscle.t()} | {:error, Ecto.Changeset.t()}
  def delete_muscle(%Muscle{} = muscle), do: Repo.delete(muscle)

  @spec create_equipment(map()) :: {:ok, Equipment.t()} | {:error, Ecto.Changeset.t()}
  def create_equipment(attrs) do
    attrs
    |> Equipment.insert_changeset()
    |> Repo.insert()
  end

  @spec update_equipment(Equipment.t(), map()) ::
          {:ok, Equipment.t()} | {:error, Ecto.Changeset.t()}
  def update_equipment(%Equipment{} = equipment, attrs) do
    equipment
    |> Equipment.update_changeset(attrs)
    |> Repo.update()
  end

  @spec delete_equipment(Equipment.t()) :: {:ok, Equipment.t()} | {:error, Ecto.Changeset.t()}
  def delete_equipment(%Equipment{} = equipment), do: Repo.delete(equipment)

  defp authorize_exercise_access(%Exercise{business_id: nil}, _business_id), do: :ok
  defp authorize_exercise_access(%Exercise{business_id: business_id}, business_id), do: :ok
  defp authorize_exercise_access(_exercise, _business_id), do: {:error, :not_found}

  defp generate_copy_name(original_name, business_id) do
    base_name =
      original_name
      |> String.replace(~r/\s*\(Copy\s*\d*\)\s*$/, "")
      |> String.trim()

    existing_names =
      Exercise
      |> Exercise.for_business_only(business_id)
      |> where([e], e.name == ^base_name or like(e.name, ^"#{base_name} (Copy%)"))
      |> select([e], e.name)
      |> Repo.all()
      |> MapSet.new()

    find_available_copy_name(base_name, existing_names, 1)
  end

  defp find_available_copy_name(base_name, existing_names, attempt) when attempt <= 100 do
    candidate = if attempt == 1, do: "#{base_name} (Copy)", else: "#{base_name} (Copy #{attempt})"

    if MapSet.member?(existing_names, candidate) do
      find_available_copy_name(base_name, existing_names, attempt + 1)
    else
      candidate
    end
  end

  defp find_available_copy_name(base_name, _existing_names, _attempt) do
    "#{base_name} (Copy #{System.system_time(:second)})"
  end

  defp preload_exercise({:ok, %Exercise{} = exercise}) do
    business_id = exercise.business_id

    {:ok,
     Repo.preload(exercise,
       exercise_muscles: exercise_muscle_preload_query(business_id),
       exercise_equipment: exercise_equipment_preload_query(business_id)
     )}
  end

  defp preload_exercise(error), do: error

  defp exercise_muscle_preload_query(business_id) do
    from(em in ExerciseMuscle,
      join: e in assoc(em, :exercise),
      join: m in assoc(em, :muscle),
      where: e.business_id == ^business_id or is_nil(e.business_id),
      preload: [muscle: m]
    )
  end

  defp exercise_equipment_preload_query(business_id) do
    from(ee in ExerciseEquipment,
      join: e in assoc(ee, :exercise),
      join: eq in assoc(ee, :equipment),
      where: e.business_id == ^business_id or is_nil(e.business_id),
      preload: [equipment: eq]
    )
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
