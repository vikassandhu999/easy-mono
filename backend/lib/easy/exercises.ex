defmodule Easy.Exercises do
  alias Easy.Repo
  alias Easy.Training.TrainingEquipment
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingMuscle
  alias Easy.Ctx
  alias Easy.Utils

  import Ecto.Query

  @type exercise_response :: {:ok, TrainingExercise.t()} | {:error, :not_found}

  @spec get_exercise(Ctx.t() | String.t(), String.t()) :: exercise_response()
  def get_exercise(%Ctx{} = ctx, exercise_id) do
    TrainingExercise
    |> TrainingExercise.for_business_or_system(ctx.business_id)
    |> TrainingExercise.include_muscles_and_equipment()
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec get_owned_exercise(Ctx.t() | String.t(), String.t()) :: exercise_response()
  def get_owned_exercise(%Ctx{} = ctx, exercise_id) do
    TrainingExercise
    |> TrainingExercise.for_business(ctx.business_id)
    |> TrainingExercise.include_muscles_and_equipment()
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec list_exercises(Ctx.t(), String.t() | nil, [String.t()] | nil, integer(), integer()) ::
          {:ok, %{count: integer(), exercises: [TrainingExercise.t()]}}
  def list_exercises(%Ctx{} = ctx, search, muscle_ids, offset, limit) do
    search = String.trim(search || "")

    base =
      TrainingExercise
      |> TrainingExercise.for_business_or_system(ctx.business_id)
      |> TrainingExercise.for_search(search)
      |> TrainingExercise.for_muscle_ids(muscle_ids)

    exercises =
      base
      |> TrainingExercise.newest()
      |> Utils.paginate(offset, limit)
      |> TrainingExercise.include_muscles_and_equipment()
      |> Repo.all()

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       exercises: exercises
     }}
  end

  @spec list_muscles(String.t() | nil) :: {:ok, [TrainingMuscle.t()]}
  def list_muscles(search) do
    muscles =
      TrainingMuscle
      |> TrainingMuscle.for_search(String.trim(search || ""))
      |> TrainingMuscle.alphabetical()
      |> Repo.all()

    {:ok, muscles}
  end

  @spec list_equipment(String.t() | nil) :: {:ok, [TrainingEquipment.t()]}
  def list_equipment(search) do
    equipment =
      TrainingEquipment
      |> TrainingEquipment.for_search(String.trim(search || ""))
      |> TrainingEquipment.alphabetical()
      |> Repo.all()

    {:ok, equipment}
  end

  @spec create_exercise(Ctx.t(), map()) :: {:ok, TrainingExercise.t()} | {:error, Ecto.Changeset.t()}
  def create_exercise(%Ctx{} = ctx, attrs) do
    muscle_ids = Map.get(attrs, "muscle_ids") || Map.get(attrs, :muscle_ids) || []
    equipment_ids = Map.get(attrs, "equipment_ids") || Map.get(attrs, :equipment_ids) || []

    muscles = load_muscles(muscle_ids)
    equipment = load_equipment(equipment_ids)

    ctx.business_id
    |> TrainingExercise.insert_changeset(nil, attrs, muscles, equipment)
    |> Repo.insert()
  end

  @spec load_muscles([String.t()] | nil) :: [TrainingMuscle.t()] | nil
  defp load_muscles(ids) when is_list(ids) do
    ids = Enum.uniq(ids)

    TrainingMuscle
    |> where([m], m.id in ^ids)
    |> Repo.all()
  end

  defp load_muscles(_ids), do: nil

  @spec load_equipment([String.t()] | nil) :: [TrainingEquipment.t()] | nil
  defp load_equipment(ids) when is_list(ids) do
    ids = Enum.uniq(ids)

    TrainingEquipment
    |> where([m], m.id in ^ids)
    |> Repo.all()
  end

  defp load_equipment(_ids), do: nil

  @spec update_exercise(Ctx.t(), String.t(), map()) :: exercise_response()
  def update_exercise(%Ctx{} = ctx, exercise_id, attrs) do
    with {:ok, exercise} <- get_owned_exercise(ctx, exercise_id) do
      muscle_ids = Map.get(attrs, "muscle_ids") || Map.get(attrs, :muscle_ids)
      equipment_ids = Map.get(attrs, "equipment_ids") || Map.get(attrs, :equipment_ids)

      muscles = load_muscles(muscle_ids)
      equipment = load_equipment(equipment_ids)

      exercise
      |> TrainingExercise.update_changeset(attrs, muscles, equipment)
      |> Repo.update()
    end
  end

  @spec delete_exercise(Ctx.t(), String.t()) :: exercise_response()
  def delete_exercise(%Ctx{} = ctx, exercise_id) do
    with {:ok, exercise} <- get_owned_exercise(ctx, exercise_id) do
      Repo.delete(exercise)
    end
  end

  @spec duplicate_exercise(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingExercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_exercise(%Ctx{} = ctx, exercise_id, attrs) do
    with {:ok, exercise} <- get_exercise(ctx, exercise_id) do
      attrs = %{
        name: Map.get(attrs, "name") || Map.get(attrs, :name),
        description: exercise.description,
        instructions: exercise.instructions,
        mechanics: exercise.mechanics,
        force: exercise.force,
        images: exercise.images || []
      }

      ctx.business_id
      |> TrainingExercise.insert_changeset(nil, attrs, exercise.muscles, exercise.equipment)
      |> Repo.insert()
      |> preload_exercise()
    end
  end

  @spec create_muscle(map()) :: {:ok, TrainingMuscle.t()} | {:error, Ecto.Changeset.t()}
  def create_muscle(attrs) do
    attrs
    |> TrainingMuscle.insert_changeset()
    |> Repo.insert()
  end

  @spec update_muscle(TrainingMuscle.t(), map()) :: {:ok, TrainingMuscle.t()} | {:error, Ecto.Changeset.t()}
  def update_muscle(%TrainingMuscle{} = muscle, attrs) do
    muscle
    |> TrainingMuscle.update_changeset(attrs)
    |> Repo.update()
  end

  @spec delete_muscle(TrainingMuscle.t()) :: {:ok, TrainingMuscle.t()} | {:error, Ecto.Changeset.t()}
  def delete_muscle(%TrainingMuscle{} = muscle), do: Repo.delete(muscle)

  @spec create_equipment(map()) :: {:ok, TrainingEquipment.t()} | {:error, Ecto.Changeset.t()}
  def create_equipment(attrs) do
    attrs
    |> TrainingEquipment.insert_changeset()
    |> Repo.insert()
  end

  @spec update_equipment(TrainingEquipment.t(), map()) ::
          {:ok, TrainingEquipment.t()} | {:error, Ecto.Changeset.t()}
  def update_equipment(%TrainingEquipment{} = equipment, attrs) do
    equipment
    |> TrainingEquipment.update_changeset(attrs)
    |> Repo.update()
  end

  @spec delete_equipment(TrainingEquipment.t()) :: {:ok, TrainingEquipment.t()} | {:error, Ecto.Changeset.t()}
  def delete_equipment(%TrainingEquipment{} = equipment), do: Repo.delete(equipment)

  defp preload_exercise({:ok, %TrainingExercise{} = exercise}) do
    {:ok, Repo.preload(exercise, [:muscles, :equipment])}
  end

  defp preload_exercise(error), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
