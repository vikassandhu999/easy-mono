defmodule Easy.Training.Library do
  alias Easy.Ctx
  alias Easy.LibraryMedia
  alias Easy.Repo
  alias Easy.Training.TrainingEquipment
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingMuscle
  alias Easy.Training.TrainingWorkoutExercise
  alias Easy.Utils

  import Ecto.Query

  @type exercise_result :: {:ok, TrainingExercise.t()} | {:error, :not_found}

  @spec get_exercise(Ctx.t(), String.t()) :: exercise_result()
  def get_exercise(%Ctx{} = ctx, exercise_id) do
    TrainingExercise
    |> TrainingExercise.for_business_or_system(ctx.business_id)
    |> TrainingExercise.include_muscles_and_equipment()
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec get_owned_exercise(Ctx.t(), String.t()) :: exercise_result()
  def get_owned_exercise(%Ctx{} = ctx, exercise_id) do
    TrainingExercise
    |> TrainingExercise.for_business(ctx.business_id)
    |> TrainingExercise.include_muscles_and_equipment()
    |> Repo.get(exercise_id)
    |> ok_or_not_found()
  end

  @spec get_exercises(Ctx.t(), [String.t()]) ::
          {:ok, %{String.t() => TrainingExercise.t()}} | {:error, :not_found}
  def get_exercises(%Ctx{} = ctx, exercise_ids) do
    exercise_ids = Enum.uniq(exercise_ids)

    exercises =
      TrainingExercise
      |> TrainingExercise.for_business_or_system(ctx.business_id)
      |> where([exercise], exercise.id in ^exercise_ids)
      |> Repo.all()

    if length(exercises) == length(exercise_ids) do
      {:ok, Map.new(exercises, &{&1.id, &1})}
    else
      {:error, :not_found}
    end
  end

  @spec list_exercises(Ctx.t(), keyword()) ::
          {:ok, %{count: integer(), exercises: [TrainingExercise.t()]}}
  def list_exercises(%Ctx{} = ctx, opts \\ []) do
    search = String.trim(Keyword.get(opts, :search, "") || "")
    muscle_ids = Keyword.get(opts, :muscle_ids)
    equipment_ids = Keyword.get(opts, :equipment_ids)
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 20)

    base =
      TrainingExercise
      |> TrainingExercise.for_business_or_system(ctx.business_id)
      |> TrainingExercise.for_search(search)
      |> TrainingExercise.for_muscle_ids(muscle_ids)
      |> TrainingExercise.for_equipment_ids(equipment_ids)

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

  @spec create_exercise(Ctx.t(), map()) ::
          {:ok, TrainingExercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_exercise(%Ctx{} = ctx, attrs) do
    muscle_ids = attrs[:muscle_ids] || []
    equipment_ids = attrs[:equipment_ids] || []

    muscles = load_muscles(muscle_ids)
    equipment = load_equipment(equipment_ids)

    with :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]),
         {:ok, exercise} <-
           ctx.business_id
           |> TrainingExercise.insert_changeset(nil, attrs, muscles, equipment)
           |> Repo.insert() do
      {:ok, Repo.preload(exercise, :media)}
    end
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

  @spec update_exercise(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingExercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_exercise(%Ctx{} = ctx, exercise_id, attrs) do
    with {:ok, exercise} <- get_owned_exercise(ctx, exercise_id),
         :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]),
         muscles = load_muscles(attrs[:muscle_ids]),
         equipment = load_equipment(attrs[:equipment_ids]),
         {:ok, updated} <-
           exercise
           |> TrainingExercise.update_changeset(attrs, muscles, equipment)
           |> Repo.update() do
      {:ok, Repo.preload(updated, :media, force: true)}
    end
  end

  @spec delete_exercise(Ctx.t(), String.t()) ::
          {:ok, TrainingExercise.t()} | {:error, :not_found | :in_use | Ecto.Changeset.t()}
  def delete_exercise(%Ctx{} = ctx, exercise_id) do
    with {:ok, exercise} <- get_owned_exercise(ctx, exercise_id),
         :ok <- ensure_exercise_not_in_use(ctx.business_id, exercise.id) do
      Repo.delete(exercise)
    end
  end

  # A Prescribed Exercise without a library exercise cannot render, so a reference
  # from a Prescription blocks deletion. Performed Sets freeze `exercise_name`, so
  # their live reference can be cleared without damaging history.
  defp ensure_exercise_not_in_use(business_id, exercise_id) do
    if Repo.exists?(
         from(e in TrainingWorkoutExercise.for_business(business_id),
           where: e.exercise_id == ^exercise_id
         )
       ),
       do: {:error, :in_use},
       else: :ok
  end

  @spec duplicate_exercise(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingExercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_exercise(%Ctx{} = ctx, exercise_id, attrs) do
    with {:ok, exercise} <- get_exercise(ctx, exercise_id) do
      attrs = %{
        name: attrs[:name],
        description: exercise.description,
        instructions: exercise.instructions,
        mechanics: exercise.mechanics,
        force: exercise.force,
        images: exercise.images || [],
        media_id: exercise.media_id
      }

      ctx.business_id
      |> TrainingExercise.insert_changeset(nil, attrs, exercise.muscles, exercise.equipment)
      |> Repo.insert()
      |> preload_exercise()
    end
  end

  defp preload_exercise({:ok, %TrainingExercise{} = exercise}) do
    {:ok, Repo.preload(exercise, [:muscles, :equipment, :media])}
  end

  defp preload_exercise(error), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
