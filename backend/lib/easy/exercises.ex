defmodule Easy.Exercises do
  alias Easy.Repo
  alias Easy.Training.Equipment
  alias Easy.Training.Exercise
  alias Easy.Training.Muscle
  alias Easy.Ctx
  alias Easy.Utils

  import Ecto.Query

  @type exercise_response :: {:ok, Exercise.t()} | {:error, :not_found}

  @spec get_exercise(Ctx.t() | String.t(), String.t()) :: exercise_response()
  def get_exercise(%Ctx{} = ctx, exercise_id) do
    Exercise
    |> Exercise.owned_or_system(ctx.business_id)
    |> Exercise.load_muscles_and_equipment()
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec get_owned_exercise(Ctx.t() | String.t(), String.t()) :: exercise_response()
  def get_owned_exercise(%Ctx{} = ctx, exercise_id) do
    Exercise
    |> Exercise.for_business(ctx.business_id)
    |> Exercise.load_muscles_and_equipment()
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec list_exercises(Ctx.t(), String.t() | nil, [String.t()] | nil, integer(), integer()) ::
          {:ok, %{count: integer(), exercises: [Exercise.t()]}}
  def list_exercises(%Ctx{} = ctx, search, muscle_ids, offset, limit) do
    search = String.trim(search || "")

    base =
      Exercise
      |> Exercise.owned_or_system(ctx.business_id)
      |> Exercise.for_search(search)
      |> Exercise.for_muscle_ids(muscle_ids)

    exercises =
      base
      |> Exercise.newest_first()
      |> Utils.paginate(offset, limit)
      |> Exercise.load_muscles_and_equipment()
      |> Repo.all()

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       exercises: exercises
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

  @spec create_exercise(Ctx.t(), map()) :: {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def create_exercise(%Ctx{} = ctx, attrs) do
    muscle_ids = Map.get(attrs, "muscle_ids") || Map.get(attrs, :muscle_ids) || []
    equipment_ids = Map.get(attrs, "equipment_ids") || Map.get(attrs, :equipment_ids) || []

    muscles = load_muscles(muscle_ids)
    equipment = load_equipment(equipment_ids)

    ctx.business_id
    |> Exercise.create_changset(attrs, muscles, equipment)
    |> Repo.insert()
  end

  @spec load_muscles([String.t()] | nil) :: [Muscle.t()] | nil
  defp load_muscles(ids) when is_list(ids) do
    ids = Enum.uniq(ids)

    Muscle
    |> where([m], m.id in ^ids)
    |> Repo.all()
  end

  defp load_muscles(_ids), do: nil

  @spec load_equipment([String.t()] | nil) :: [Equipment.t()] | nil
  defp load_equipment(ids) when is_list(ids) do
    ids = Enum.uniq(ids)

    Equipment
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
      |> Exercise.update_changeset(attrs, muscles, equipment)
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
          {:ok, Exercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
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
      |> Exercise.create_changset(attrs, exercise.muscles, exercise.equipment)
      |> Repo.insert()
      |> preload_exercise()
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

  defp preload_exercise({:ok, %Exercise{} = exercise}) do
    {:ok, Repo.preload(exercise, [:muscles, :equipment])}
  end

  defp preload_exercise(error), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
