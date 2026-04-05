defmodule Easy.Repo.Seeds.Training do
  alias Easy.Repo
  alias Easy.Training.{Muscle, Equipment, Exercise}

  import Ecto.Query

  @muscles [
    "abdominals",
    "abductors",
    "adductors",
    "biceps",
    "calves",
    "chest",
    "forearms",
    "glutes",
    "hamstrings",
    "lats",
    "lower back",
    "middle back",
    "neck",
    "quadriceps",
    "shoulders",
    "traps",
    "triceps"
  ]

  @equipment [
    "bands",
    "barbell",
    "body only",
    "cable",
    "dumbbell",
    "e-z curl bar",
    "exercise ball",
    "foam roll",
    "kettlebells",
    "machine",
    "medicine ball",
    "other"
  ]

  @spec run() :: :ok
  def run do
    seed_muscles()
    seed_equipment()
    :ok
  end

  @spec run_exercises() :: :ok
  def run_exercises do
    seed_muscles()
    seed_equipment()
    seed_exercises()
    :ok
  end

  # Muscles

  defp seed_muscles do
    inserted =
      Enum.count(@muscles, fn name ->
        case Repo.get_by(Muscle, name: name) do
          nil -> match?({:ok, _}, Muscle.create(%{name: name}))
          _ -> false
        end
      end)

    IO.puts("  Seeded #{inserted}/#{length(@muscles)} muscles")
  end

  # Equipment

  defp seed_equipment do
    inserted =
      Enum.count(@equipment, fn name ->
        case Repo.get_by(Equipment, name: name) do
          nil -> match?({:ok, _}, Equipment.create(%{name: name}))
          _ -> false
        end
      end)

    IO.puts("  Seeded #{inserted}/#{length(@equipment)} equipment")
  end

  # Exercises

  defp seed_exercises do
    json_path = Path.join(:code.priv_dir(:easy), "repo/exercises.json")

    case File.read(json_path) do
      {:ok, content} ->
        exercises = Jason.decode!(content)
        existing = count_system_exercises()

        if existing > 0 do
          IO.puts("  Skipping exercises — #{existing} system exercises already exist")
        else
          do_seed_exercises(exercises)
        end

      {:error, reason} ->
        IO.puts("  Skipping exercises — exercises.json not found: #{inspect(reason)}")
    end
  end

  defp count_system_exercises do
    from(e in Exercise, where: is_nil(e.business_id)) |> Repo.aggregate(:count, :id)
  end

  defp do_seed_exercises(exercises) do
    muscle_map = build_lookup_map(Muscle)
    equipment_map = build_lookup_map(Equipment)

    total = length(exercises)

    inserted =
      Enum.count(exercises, fn data ->
        attrs = build_exercise_attrs(data, muscle_map, equipment_map)
        match?({:ok, _}, Exercise.create(nil, attrs))
      end)

    IO.puts("  Seeded #{inserted}/#{total} exercises")
  end

  defp build_lookup_map(schema) do
    schema
    |> Repo.all()
    |> Map.new(fn record -> {String.downcase(record.name), record.id} end)
  end

  defp build_exercise_attrs(data, muscle_map, equipment_map) do
    primary_ids = resolve_ids(data["primaryMuscles"] || [], muscle_map)
    secondary_ids = resolve_ids(data["secondaryMuscles"] || [], muscle_map)
    equipment_ids = resolve_ids(List.wrap(data["equipment"]), equipment_map)

    %{
      "name" => data["name"],
      "description" => data["category"],
      "instructions" => parse_instructions(data["instructions"]),
      "mechanics" => data["mechanic"],
      "force" => data["force"],
      "images" => data["images"] || [],
      "muscle_ids" => Enum.uniq(primary_ids ++ secondary_ids),
      "equipment_ids" => equipment_ids
    }
  end

  defp resolve_ids(names, lookup_map) do
    names
    |> Enum.map(&Map.get(lookup_map, String.downcase(&1)))
    |> Enum.reject(&is_nil/1)
  end

  defp parse_instructions(nil), do: nil

  defp parse_instructions(instructions) when is_list(instructions),
    do: Enum.join(instructions, "\n")

  defp parse_instructions(instructions), do: instructions
end
