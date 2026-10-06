defmodule Easy.Training.Content do
  @behaviour Easy.Plans.Domain

  @spec summary(map()) :: map()
  def summary(content), do: %{workout_count: length(content["workouts"])}

  @spec coverage(map()) :: map()
  def coverage(content), do: %{workouts: content["workouts"]}

  alias Easy.Training.Content.Content, as: Document
  alias Easy.Training.Library
  import Ecto.Changeset

  @spec empty() :: map()
  def empty, do: %{"workouts" => [], "schedule" => %{"cycle_weeks" => 1, "entries" => []}}

  @spec validate(Easy.Ctx.t(), map()) :: {:ok, map()} | {:error, Ecto.Changeset.t() | atom()}
  def validate(ctx, attrs) do
    with {:ok, document} <- Document.changeset(%Document{}, attrs) |> apply_action(:insert),
         :ok <- validate_ids(document),
         {:ok, exercises} <- Library.get_exercises(ctx, exercise_ids(document)) do
      {:ok, document |> freeze_names(exercises) |> encode()}
    end
  end

  @spec encode(term()) :: term()
  def encode(%_{} = value), do: value |> Map.from_struct() |> Map.drop([:__meta__]) |> encode()
  def encode(value) when is_map(value), do: Map.new(value, fn {k, v} -> {to_string(k), encode(v)} end)
  def encode(value) when is_list(value), do: Enum.map(value, &encode/1)
  def encode(value) when is_atom(value) and value not in [nil, true, false], do: Atom.to_string(value)
  def encode(value), do: value

  defp exercise_ids(doc), do: for(w <- doc.workouts, b <- w.blocks, i <- b.items, do: i.exercise_id)

  defp freeze_names(doc, exercises), do: %{doc | workouts: Enum.map(doc.workouts, &freeze_workout(&1, exercises))}

  defp freeze_workout(workout, exercises),
    do: %{workout | blocks: Enum.map(workout.blocks, &freeze_block(&1, exercises))}

  defp freeze_block(block, exercises),
    do: %{block | items: Enum.map(block.items, &%{&1 | exercise_name: exercises[&1.exercise_id].name})}

  defp validate_ids(doc) do
    ids = for w <- doc.workouts, do: w.id

    nodes =
      Enum.flat_map(doc.workouts, fn w ->
        [
          w.id
          | Enum.flat_map(w.blocks, fn b ->
              [b.id | Enum.flat_map(b.items, fn i -> [i.id | Enum.map(i.sets, & &1.id)] end)]
            end)
        ]
      end)

    entries = if doc.schedule, do: doc.schedule.entries, else: []
    all_ids = nodes ++ Enum.map(entries, & &1.id)

    if length(all_ids) == length(Enum.uniq(all_ids)) and Enum.all?(entries, &(&1.ref in ids)) and doc.schedule do
      :ok
    else
      {:error,
       Document.changeset(%Document{}, %{})
       |> add_error(:workouts, "ids must be unique and schedule references must belong to this document")}
    end
  end
end
