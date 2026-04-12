defmodule Easy.Repo.Seeds.Training do
  alias Easy.Repo
  alias Easy.Training.{Muscle, Equipment, Exercise, ExerciseMuscle, ExerciseEquipment}

  import Ecto.Query

  @exercise_fields [:name, :description, :instructions, :mechanics, :force, :images, :import_id]

  @spec run() :: :ok
  def run do
    case read_exercises_json() do
      {:ok, exercises} ->
        seed_muscles(exercises)
        seed_equipment(exercises)

      :error ->
        :ok
    end

    :ok
  end

  @spec run_exercises() :: :ok
  def run_exercises do
    case read_exercises_json() do
      {:ok, exercises} ->
        seed_muscles(exercises)
        seed_equipment(exercises)
        seed_exercises(exercises)

      :error ->
        :ok
    end

    :ok
  end

  defp read_exercises_json do
    json_path = Path.join(:code.priv_dir(:easy), "repo/exercises.json")

    case File.read(json_path) do
      {:ok, content} ->
        {:ok, Jason.decode!(content)}

      {:error, reason} ->
        IO.puts("  Skipping — exercises.json not found: #{inspect(reason)}")
        :error
    end
  end

  # Muscles

  defp seed_muscles(exercises) do
    names = extract_muscle_names(exercises)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    rows =
      Enum.map(names, fn name ->
        %{id: Ecto.UUID.generate(), name: name, inserted_at: now, updated_at: now}
      end)

    {upserted, _} =
      Repo.insert_all(Muscle, rows,
        on_conflict: {:replace, [:name, :updated_at]},
        conflict_target: :name
      )

    IO.puts("  Muscles: #{upserted} upserted (#{length(names)} in JSON)")
  end

  # Equipment

  defp seed_equipment(exercises) do
    names = extract_equipment_names(exercises)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    rows =
      Enum.map(names, fn name ->
        %{id: Ecto.UUID.generate(), name: name, inserted_at: now, updated_at: now}
      end)

    {upserted, _} =
      Repo.insert_all(Equipment, rows,
        on_conflict: {:replace, [:name, :updated_at]},
        conflict_target: :name
      )

    IO.puts("  Equipment: #{upserted} upserted (#{length(names)} in JSON)")
  end

  # Exercises

  defp seed_exercises(exercises) do
    muscle_map = build_lookup_map(Muscle)
    equipment_map = build_lookup_map(Equipment)
    now = DateTime.utc_now() |> DateTime.truncate(:microsecond)

    # Build exercise rows and association data from JSON
    {exercise_rows, assoc_data} =
      Enum.reduce(exercises, {[], %{}}, fn data, {rows, assocs} ->
        {row, muscle_ids, equipment_ids} =
          build_exercise_row(data, muscle_map, equipment_map, now)

        {[row | rows], Map.put(assocs, row.import_id, {muscle_ids, equipment_ids})}
      end)

    Repo.transaction(fn ->
      # Bulk upsert exercises
      {upserted, _} =
        Repo.insert_all(Exercise, Enum.reverse(exercise_rows),
          on_conflict: {:replace, @exercise_fields ++ [:updated_at]},
          conflict_target: {:unsafe_fragment, ~s|("import_id") WHERE import_id IS NOT NULL|},
          returning: false
        )

      # Load import_id->id map for system exercises
      exercise_id_map =
        Exercise
        |> Exercise.system()
        |> where([e], not is_nil(e.import_id))
        |> select([e], {e.import_id, e.id})
        |> Repo.all()
        |> Map.new()

      # Build all join-table rows
      {muscle_rows, equipment_rows} = build_association_rows(assoc_data, exercise_id_map, now)

      # Replace associations: delete old, insert new
      system_exercise_ids = Map.values(exercise_id_map)
      replace_associations(system_exercise_ids, muscle_rows, equipment_rows)

      upserted
    end)
    |> case do
      {:ok, upserted} ->
        IO.puts("  Exercises: #{upserted} upserted (#{length(exercises)} in JSON)")

      {:error, reason} ->
        IO.puts("  Exercise seeding failed: #{inspect(reason)}")
    end
  end

  defp build_exercise_row(data, muscle_map, equipment_map, now) do
    primary_ids = resolve_ids(data["primaryMuscles"] || [], muscle_map)
    secondary_ids = resolve_ids(data["secondaryMuscles"] || [], muscle_map)
    muscle_ids = Enum.uniq(primary_ids ++ secondary_ids)
    equipment_ids = resolve_ids(List.wrap(data["equipment"]), equipment_map)

    row = %{
      id: Ecto.UUID.generate(),
      import_id: data["id"],
      name: data["name"],
      description: data["category"],
      instructions: parse_instructions(data["instructions"]),
      mechanics: parse_enum(data["mechanic"], [:compound, :isolation, :isometric]),
      force: parse_enum(data["force"], [:push, :pull, :static]),
      images: data["images"] || [],
      business_id: nil,
      inserted_at: now,
      updated_at: now
    }

    {row, muscle_ids, equipment_ids}
  end

  defp build_association_rows(assoc_data, exercise_id_map, now) do
    Enum.reduce(assoc_data, {[], []}, fn {import_id, {muscle_ids, equipment_ids}},
                                         {m_acc, e_acc} ->
      case Map.get(exercise_id_map, import_id) do
        nil ->
          {m_acc, e_acc}

        exercise_id ->
          new_muscles =
            Enum.map(muscle_ids, fn mid ->
              %{
                id: Ecto.UUID.generate(),
                exercise_id: exercise_id,
                muscle_id: mid,
                role: :primary,
                inserted_at: now,
                updated_at: now
              }
            end)

          new_equipment =
            Enum.map(equipment_ids, fn eid ->
              %{
                id: Ecto.UUID.generate(),
                exercise_id: exercise_id,
                equipment_id: eid,
                inserted_at: now,
                updated_at: now
              }
            end)

          {new_muscles ++ m_acc, new_equipment ++ e_acc}
      end
    end)
  end

  defp replace_associations(exercise_ids, muscle_rows, equipment_rows) do
    # Delete existing associations for all system exercises
    from(em in ExerciseMuscle, where: em.exercise_id in ^exercise_ids) |> Repo.delete_all()
    from(ee in ExerciseEquipment, where: ee.exercise_id in ^exercise_ids) |> Repo.delete_all()

    # Bulk insert new associations in chunks (Postgres param limit)
    chunk_insert_all(ExerciseMuscle, muscle_rows)
    chunk_insert_all(ExerciseEquipment, equipment_rows)
  end

  defp chunk_insert_all(_schema, []), do: :ok

  defp chunk_insert_all(schema, rows) do
    rows
    |> Enum.chunk_every(1000)
    |> Enum.each(fn chunk -> Repo.insert_all(schema, chunk) end)
  end

  defp extract_muscle_names(exercises) do
    exercises
    |> Enum.flat_map(fn e -> (e["primaryMuscles"] || []) ++ (e["secondaryMuscles"] || []) end)
    |> Enum.map(&capitalize/1)
    |> Enum.uniq()
    |> Enum.sort()
  end

  defp extract_equipment_names(exercises) do
    exercises
    |> Enum.map(fn e -> e["equipment"] end)
    |> Enum.reject(&is_nil/1)
    |> Enum.map(&capitalize/1)
    |> Enum.uniq()
    |> Enum.sort()
  end

  defp capitalize(name) do
    name
    |> String.split(~r/[\s\-]/, include_captures: true)
    |> Enum.map_join(fn
      <<c::utf8, rest::binary>> when c in ?a..?z -> <<c - 32::utf8, rest::binary>>
      other -> other
    end)
  end

  defp build_lookup_map(schema) do
    schema
    |> Repo.all()
    |> Map.new(fn record -> {String.downcase(record.name), record.id} end)
  end

  defp resolve_ids(names, lookup_map) do
    names
    |> Enum.map(&Map.get(lookup_map, String.downcase(&1)))
    |> Enum.reject(&is_nil/1)
  end

  defp parse_enum(nil, _valid), do: nil

  defp parse_enum(value, valid) do
    atom = String.to_existing_atom(value)
    if atom in valid, do: atom, else: nil
  rescue
    ArgumentError -> nil
  end

  defp parse_instructions(nil), do: nil

  defp parse_instructions(instructions) when is_list(instructions),
    do: Enum.join(instructions, "\n")

  defp parse_instructions(instructions), do: instructions
end
