defmodule Easy.Training.Library do
  alias Easy.Ctx
  alias Easy.LibraryMedia
  alias Easy.Repo
  alias Easy.Training.PrescribedExercise
  alias Easy.Training.TrainingEquipment
  alias Easy.Training.TrainingExercise
  alias Easy.Training.TrainingMuscle
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

  defp get_owned_exercise(%Ctx{} = ctx, exercise_id) do
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
          {:ok, %{count: non_neg_integer(), exercises: [TrainingExercise.t()]}}
  def list_exercises(%Ctx{} = ctx, opts \\ []) do
    search = String.trim(Keyword.get(opts, :search, "") || "")
    muscle_ids = Keyword.get(opts, :muscle_ids)
    equipment_ids = Keyword.get(opts, :equipment_ids)
    page_opts = Keyword.update(opts, :limit, 20, &min(&1, 20))

    base =
      TrainingExercise
      |> TrainingExercise.for_business_or_system(ctx.business_id)
      |> TrainingExercise.for_search(search)
      |> TrainingExercise.for_muscle_ids(muscle_ids)
      |> TrainingExercise.for_equipment_ids(equipment_ids)

    exercises =
      base
      |> TrainingExercise.newest()
      |> Utils.paginate(page_opts)
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
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, references} <- TrainingExercise.reference_input(attrs),
         :ok <- LibraryMedia.authorize_attach(ctx, references.media_id),
         {:ok, muscles} <- load_references(TrainingMuscle, references.muscle_ids || []),
         {:ok, equipment} <- load_references(TrainingEquipment, references.equipment_ids || []),
         {:ok, exercise} <-
           ctx.business_id
           |> TrainingExercise.insert_changeset(ctx.coach_id, attrs, muscles, equipment)
           |> Repo.insert() do
      {:ok, Repo.preload(exercise, :media)}
    end
  end

  @spec update_exercise(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingExercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_exercise(%Ctx{} = ctx, exercise_id, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, exercise} <- get_owned_exercise(ctx, exercise_id),
         {:ok, references} <- TrainingExercise.reference_input(attrs),
         :ok <- LibraryMedia.authorize_attach(ctx, references.media_id),
         {:ok, muscles} <- load_references(TrainingMuscle, references.muscle_ids),
         {:ok, equipment} <- load_references(TrainingEquipment, references.equipment_ids),
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
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, exercise} <- get_owned_exercise(ctx, exercise_id),
         :ok <- ensure_exercise_not_in_use(ctx.business_id, exercise.id) do
      Repo.delete(exercise)
    end
  end

  # A Prescribed Exercise without a library exercise cannot render, so a reference
  # from a Prescription blocks deletion. Performed Sets freeze `exercise_name`, so
  # their live reference can be cleared without damaging history.
  defp ensure_exercise_not_in_use(business_id, exercise_id) do
    if Repo.exists?(
         from(e in PrescribedExercise.for_business(business_id),
           where: e.exercise_id == ^exercise_id
         )
       ),
       do: {:error, :in_use},
       else: :ok
  end

  @spec duplicate_exercise(Ctx.t(), String.t(), map()) ::
          {:ok, TrainingExercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_exercise(%Ctx{} = ctx, exercise_id, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, exercise} <- get_exercise(ctx, exercise_id) do
      ctx.business_id
      |> TrainingExercise.copy_changeset(ctx.coach_id, exercise, attrs)
      |> Repo.insert()
      |> preload_exercise()
    end
  end

  defp load_references(schema, ids) when is_list(ids) do
    ids = Enum.uniq(ids)
    records = schema |> where([record], record.id in ^ids) |> Repo.all()

    if length(records) == length(ids), do: {:ok, records}, else: {:error, :not_found}
  end

  defp load_references(_schema, nil), do: {:ok, nil}

  defp preload_exercise({:ok, %TrainingExercise{} = exercise}) do
    {:ok, Repo.preload(exercise, [:muscles, :equipment, :media])}
  end

  defp preload_exercise(error), do: error

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
