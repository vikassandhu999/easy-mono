defmodule Easy.Workouts.ExerciseGroup do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.{Exercise, WorkoutExercise}

  @primary_key {:id, :binary_id, autogenerate: true}
  @type t :: %__MODULE__{}

  embedded_schema do
    field(:name, :string)
    field(:rounds, :integer, default: 3)

    embeds_many(:exercises, Easy.Workouts.WorkoutExercise, on_replace: :delete)
  end

  @spec changeset(t(), map(), %{optional(String.t()) => Exercise.t()}, map()) ::
          Ecto.Changeset.t()
  def changeset(group, attrs, exercises_by_id, previous_entries \\ %{})
      when is_map(exercises_by_id) do
    group
    |> cast(attrs, [:name, :rounds], empty_values: [])
    |> update_change(:name, &optional_name/1)
    |> validate_rounds()
    |> cast_exercises(exercises_by_id, previous_entries)
    |> validate_nonempty_group()
  end

  defp optional_name(nil), do: nil

  defp optional_name(value) do
    case String.trim(value) do
      "" -> nil
      name -> name
    end
  end

  defp validate_rounds(changeset) do
    rounds = get_field(changeset, :rounds)

    if is_integer(rounds) and rounds in 1..100,
      do: changeset,
      else: add_error(changeset, :rounds, "must be an integer from 1 to 100")
  end

  defp cast_exercises(changeset, exercises_by_id, previous_entries) do
    rounds = get_field(changeset, :rounds)

    case Map.fetch(changeset.params, "exercises") do
      :error ->
        entries =
          Enum.map(get_field(changeset, :exercises), fn entry ->
            cast_exercise(entry, %{}, exercises_by_id, rounds, previous_entries)
          end)

        put_embed(changeset, :exercises, entries)

      {:ok, values} when is_list(values) ->
        if Enum.all?(values, &(is_map(&1) and not is_struct(&1))),
          do: cast_exercise_list(changeset, values, exercises_by_id, rounds, previous_entries),
          else: add_error(changeset, :exercises, "must be an array of exercise objects")

      {:ok, _} ->
        add_error(changeset, :exercises, "must be an array of exercise objects")
    end
  end

  defp cast_exercise_list(changeset, values, exercises_by_id, rounds, previous_entries) do
    entries = Enum.map(values, &identified_entry/1)

    ids = entries |> Enum.map(&elem(&1, 0)) |> Enum.reject(&is_nil/1)

    cond do
      :invalid in ids ->
        add_error(changeset, :exercises, "occurrence IDs must be valid UUIDs")

      Enum.uniq(ids) != ids ->
        add_error(changeset, :exercises, "occurrence IDs must be unique within the group")

      true ->
        params = Map.put(changeset.params, "exercises", Enum.map(entries, &elem(&1, 1)))

        cast_embed(%{changeset | params: params}, :exercises,
          with: fn entry, attrs ->
            cast_exercise(entry, attrs, exercises_by_id, rounds, previous_entries)
          end
        )
    end
  end

  defp identified_entry(value) do
    params = Map.new(value, fn {key, item} -> {to_string(key), item} end)

    case params["id"] do
      nil ->
        {nil, params}

      id ->
        case Ecto.UUID.cast(id) do
          {:ok, id} -> {id, Map.put(params, "id", id)}
          :error -> {:invalid, params}
        end
    end
  end

  defp cast_exercise(entry, attrs, exercises_by_id, rounds, previous_entries) do
    entry =
      if is_nil(entry.id), do: Map.get(previous_entries, attrs["id"], entry), else: entry

    reference = cast(entry, attrs, [:exercise_id], empty_values: [])

    case Map.get(exercises_by_id, get_field(reference, :exercise_id)) do
      %Exercise{} = exercise -> WorkoutExercise.changeset(entry, attrs, exercise, rounds)
      _ -> add_error(reference, :exercise_id, "must reference an available exercise")
    end
  end

  defp validate_nonempty_group(changeset) do
    if get_field(changeset, :exercises) == [],
      do: add_error(changeset, :exercises, "must contain at least one exercise"),
      else: changeset
  end
end
