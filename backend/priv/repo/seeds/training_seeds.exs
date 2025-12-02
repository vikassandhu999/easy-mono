defmodule Easy.Repo.Seeds.Training do
  @moduledoc """
  Seeds for training domain (muscles, equipment, exercises).

  System-level exercises have `business_id: nil` and are available to all businesses.
  """
  alias Easy.Repo
  alias Easy.Training.Library.{Muscle, Equipment, Exercise, ExerciseMuscle, ExerciseEquipment}

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

  def run do
    seed_muscles()
    seed_equipment()
    seed_exercises()
  end

  # ============================================================================
  # Muscles
  # ============================================================================

  defp seed_muscles do
    inserted_count =
      @muscles
      |> Enum.reduce(0, fn name, count ->
        case upsert_muscle(name) do
          {:ok, _} -> count + 1
          {:skip, _} -> count
        end
      end)

    IO.puts("✓ Seeded #{inserted_count}/#{length(@muscles)} Muscles")
  end

  defp upsert_muscle(name) do
    case Repo.get_by(Muscle, name: name) do
      nil ->
        %Muscle{}
        |> Muscle.changeset(%{name: name})
        |> Repo.insert()

      _existing ->
        {:skip, :already_exists}
    end
  end

  # ============================================================================
  # Equipment
  # ============================================================================

  defp seed_equipment do
    inserted_count =
      @equipment
      |> Enum.reduce(0, fn name, count ->
        case upsert_equipment(name) do
          {:ok, _} -> count + 1
          {:skip, _} -> count
        end
      end)

    IO.puts("✓ Seeded #{inserted_count}/#{length(@equipment)} Equipment")
  end

  defp upsert_equipment(name) do
    case Repo.get_by(Equipment, name: name) do
      nil ->
        %Equipment{}
        |> Equipment.changeset(%{name: name})
        |> Repo.insert()

      _existing ->
        {:skip, :already_exists}
    end
  end

  # ============================================================================
  # Exercises
  # ============================================================================

  defp seed_exercises do
    json_path = Path.join(:code.priv_dir(:easy), "repo/exercises.json")

    case File.read(json_path) do
      {:ok, content} ->
        exercises = Jason.decode!(content)

        # Build lookup maps for efficient association linking
        muscle_map = build_lookup_map(Muscle)
        equipment_map = build_lookup_map(Equipment)

        total = length(exercises)

        inserted_count =
          exercises
          |> Enum.reduce(0, fn exercise_data, count ->
            case upsert_exercise(exercise_data, muscle_map, equipment_map) do
              {:ok, _} -> count + 1
              {:skip, _} -> count
            end
          end)

        IO.puts("✓ Seeded #{inserted_count}/#{total} Exercises")

      {:error, reason} ->
        IO.puts("✗ Failed to read exercises.json: #{inspect(reason)}")
    end
  end

  defp build_lookup_map(schema) do
    schema
    |> Repo.all()
    |> Map.new(fn record -> {String.downcase(record.name), record.id} end)
  end

  defp upsert_exercise(data, muscle_map, equipment_map) do
    name = data["name"]

    # Check for existing system-level exercise (business_id is nil)
    existing =
      Exercise
      |> where([e], e.name == ^name and is_nil(e.business_id))
      |> Repo.one()

    case existing do
      nil ->
        exercise = insert_exercise!(data)
        link_exercise_muscles(exercise, data, muscle_map)
        link_exercise_equipment(exercise, data, equipment_map)
        {:ok, exercise}

      _existing ->
        {:skip, :already_exists}
    end
  end

  defp insert_exercise!(data) do
    attrs = %{
      name: data["name"],
      description: data["category"],
      instructions: parse_instructions(data["instructions"]),
      mechanics: parse_mechanics(data["mechanic"]),
      force: parse_force(data["force"]),
      images: data["images"] || []
    }

    # Using struct directly for system exercises (business_id: nil)
    %Exercise{business_id: nil}
    |> Exercise.changeset(attrs)
    |> Repo.insert!()
  end

  defp link_exercise_muscles(exercise, data, muscle_map) do
    primary_muscles = data["primaryMuscles"] || []
    secondary_muscles = data["secondaryMuscles"] || []

    # Link primary muscles
    Enum.each(primary_muscles, fn muscle_name ->
      link_muscle(exercise.id, muscle_name, :primary, muscle_map)
    end)

    # Link secondary muscles
    Enum.each(secondary_muscles, fn muscle_name ->
      link_muscle(exercise.id, muscle_name, :secondary, muscle_map)
    end)
  end

  defp link_muscle(exercise_id, muscle_name, role, muscle_map) do
    case Map.get(muscle_map, String.downcase(muscle_name)) do
      nil ->
        :skip

      muscle_id ->
        %ExerciseMuscle{}
        |> ExerciseMuscle.changeset(%{
          exercise_id: exercise_id,
          muscle_id: muscle_id,
          role: role
        })
        |> Repo.insert(on_conflict: :nothing)
    end
  end

  defp link_exercise_equipment(exercise, data, equipment_map) do
    equipment_name = data["equipment"]

    if equipment_name do
      case Map.get(equipment_map, String.downcase(equipment_name)) do
        nil ->
          :skip

        equipment_id ->
          %ExerciseEquipment{}
          |> ExerciseEquipment.changeset(%{
            exercise_id: exercise.id,
            equipment_id: equipment_id
          })
          |> Repo.insert(on_conflict: :nothing)
      end
    end
  end

  # ============================================================================
  # Parsers
  # ============================================================================

  defp parse_instructions(nil), do: nil

  defp parse_instructions(instructions) when is_list(instructions) do
    Enum.join(instructions, "\n")
  end

  defp parse_instructions(instructions), do: instructions

  defp parse_mechanics(nil), do: nil
  defp parse_mechanics("compound"), do: :compound
  defp parse_mechanics("isolation"), do: :isolation
  defp parse_mechanics("isometric"), do: :isometric
  defp parse_mechanics(_), do: nil

  defp parse_force(nil), do: nil
  defp parse_force("push"), do: :push
  defp parse_force("pull"), do: :pull
  defp parse_force("static"), do: :static
  defp parse_force(_), do: nil
end
