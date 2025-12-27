defmodule Easy.Training.Library do
  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Training.QueryHelpers
  alias Easy.Training.Library.{Muscle, Equipment, Exercise, ExerciseMuscle}

  @exercise_preloads [:equipment, :muscles]

  # Muscles

  @spec list_muscles() :: {:ok, list(Muscle.t())}
  def list_muscles, do: {:ok, Repo.all(Muscle)}

  @spec fetch_muscle(String.t()) :: {:ok, Muscle.t()} | {:error, :not_found}
  def fetch_muscle(id), do: Repo.get(Muscle, id) |> wrap_result()

  # Equipment

  @spec list_equipment() :: {:ok, list(Equipment.t())}
  def list_equipment, do: {:ok, Repo.all(Equipment)}

  @spec fetch_equipment(String.t()) :: {:ok, Equipment.t()} | {:error, :not_found}
  def fetch_equipment(id), do: Repo.get(Equipment, id) |> wrap_result()

  # Exercises

  @spec list_exercises(String.t(), map()) :: {:ok, {list(Exercise.t()), map()}}
  def list_exercises(business_id, params \\ %{}) do
    limit =
      params
      |> QueryHelpers.fetch_param(:limit)
      |> QueryHelpers.parse_integer()
      |> QueryHelpers.clamp_limit()

    offset =
      params
      |> QueryHelpers.fetch_param(:offset)
      |> QueryHelpers.parse_integer()
      |> QueryHelpers.normalize_offset()

    search = params |> QueryHelpers.fetch_param(:search) |> QueryHelpers.parse_search()
    muscle_ids = params |> QueryHelpers.fetch_param(:muscle_ids) |> QueryHelpers.parse_list()

    base_query =
      Exercise
      |> where([e], e.business_id == ^business_id or is_nil(e.business_id))
      |> apply_search(search)
      |> apply_muscle_filter(muscle_ids)

    total = Repo.aggregate(base_query, :count, :id)

    exercises =
      base_query
      |> order_by([e], desc: e.inserted_at)
      |> limit(^limit)
      |> offset(^offset)
      |> preload(^@exercise_preloads)
      |> Repo.all()

    {:ok, {exercises, %{limit: limit, offset: offset, total: total}}}
  end

  @spec fetch_exercise(String.t(), String.t()) :: {:ok, Exercise.t()} | {:error, :not_found}
  def fetch_exercise(business_id, id) do
    Exercise
    |> where([e], e.id == ^id and (e.business_id == ^business_id or is_nil(e.business_id)))
    |> preload(^@exercise_preloads)
    |> Repo.one()
    |> wrap_result()
  end

  @spec get_exercise!(String.t()) :: Exercise.t()
  def get_exercise!(id), do: Repo.get!(Exercise, id) |> Repo.preload(@exercise_preloads)

  @spec create_exercise(String.t(), map()) :: {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def create_exercise(business_id, attrs) do
    %Exercise{business_id: business_id}
    |> Exercise.changeset(attrs)
    |> Repo.insert()
    |> reload_preloads(@exercise_preloads)
  end

  @spec create_system_exercise(map()) :: {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def create_system_exercise(attrs) do
    %Exercise{}
    |> Exercise.changeset(attrs)
    |> Repo.insert()
    |> reload_preloads(@exercise_preloads)
  end

  @spec update_exercise(Exercise.t(), map()) :: {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def update_exercise(%Exercise{} = exercise, attrs) do
    exercise
    |> Exercise.changeset(attrs)
    |> Repo.update()
    |> reload_preloads(@exercise_preloads, force: true)
  end

  @spec delete_exercise(Exercise.t()) :: {:ok, Exercise.t()} | {:error, Ecto.Changeset.t()}
  def delete_exercise(%Exercise{} = exercise), do: Repo.delete(exercise)

  @spec duplicate_exercise(Exercise.t(), String.t()) ::
          {:ok, Exercise.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def duplicate_exercise(%Exercise{} = exercise, business_id) do
    with :ok <- authorize_access(exercise, business_id) do
      exercise = ensure_loaded(exercise, [:exercise_muscles, :exercise_equipment])

      attrs = %{
        "name" => generate_copy_name(exercise.name, business_id),
        "description" => exercise.description,
        "instructions" => exercise.instructions,
        "mechanics" => exercise.mechanics && Atom.to_string(exercise.mechanics),
        "force" => exercise.force && Atom.to_string(exercise.force),
        "muscle_ids" => Enum.map(exercise.exercise_muscles, & &1.muscle_id),
        "equipment_ids" => Enum.map(exercise.exercise_equipment, & &1.equipment_id)
      }

      create_exercise(business_id, attrs)
    end
  end

  # Private - Query Filters

  defp apply_search(query, nil), do: query
  defp apply_search(query, search), do: where(query, [e], ilike(e.name, ^"%#{search}%"))

  defp apply_muscle_filter(query, nil), do: query

  defp apply_muscle_filter(query, muscle_ids) do
    exercise_ids =
      from(em in ExerciseMuscle, where: em.muscle_id in ^muscle_ids, select: em.exercise_id)

    where(query, [e], e.id in subquery(exercise_ids))
  end

  # Private - Result Handling

  defp wrap_result(nil), do: {:error, :not_found}
  defp wrap_result(record), do: {:ok, record}

  defp reload_preloads(result, preloads, opts \\ [])

  defp reload_preloads({:ok, record}, preloads, opts),
    do: {:ok, Repo.preload(record, preloads, opts)}

  defp reload_preloads(error, _preloads, _opts), do: error

  defp ensure_loaded(struct, associations) do
    associations_to_load = Enum.reject(associations, &Ecto.assoc_loaded?(Map.get(struct, &1)))

    case associations_to_load do
      [] -> struct
      assocs -> Repo.preload(struct, assocs)
    end
  end

  # Private - Authorization & Copy Name

  defp authorize_access(%Exercise{business_id: nil}, _business_id), do: :ok
  defp authorize_access(%Exercise{business_id: business_id}, business_id), do: :ok
  defp authorize_access(_exercise, _business_id), do: {:error, :not_found}

  defp generate_copy_name(original_name, business_id) do
    base_name = String.replace(original_name, ~r/\s*\(Copy(?:\s+\d+)?\)$/, "")

    copy_count =
      from(e in Exercise,
        where: e.business_id == ^business_id,
        where:
          e.name == ^"#{base_name} (Copy)" or
            fragment("? ~ ?", e.name, ^"^#{Regex.escape(base_name)} \\(Copy \\d+\\)$"),
        select: count(e.id)
      )
      |> Repo.one()

    if copy_count == 0 do
      "#{base_name} (Copy)"
    else
      "#{base_name} (Copy #{copy_count + 1})"
    end
  end
end
