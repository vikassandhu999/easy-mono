defmodule Mix.Tasks.ImportExercises do
  use Mix.Task

  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Training.Exercise

  @shortdoc "Imports exercises from a JSON file into the database"

  @default_path "data/exercises_converted.json"

  @impl Mix.Task
  def run(args) do
    # Start the application to get access to the Repo
    Mix.Task.run("app.start")

    path = List.first(args) || @default_path

    case File.read(path) do
      {:ok, content} ->
        import_exercises(content)

      {:error, reason} ->
        Mix.shell().error("Failed to read file #{path}: #{inspect(reason)}")
    end
  end

  defp import_exercises(json_content) do
    case Jason.decode(json_content) do
      {:ok, exercises} when is_list(exercises) ->
        Mix.shell().info("Found #{length(exercises)} exercises to import...\n")

        results =
          exercises
          |> Enum.with_index(1)
          |> Enum.map(&import_single_exercise/1)

        successful = Enum.count(results, fn {status, _} -> status == :ok end)
        failed = Enum.count(results, fn {status, _} -> status == :error end)
        skipped = Enum.count(results, fn {status, _} -> status == :skipped end)

        Mix.shell().info("\n========== Import Summary ==========")
        Mix.shell().info("✓ Successfully imported: #{successful}")
        Mix.shell().info("⊘ Skipped (already exists): #{skipped}")
        Mix.shell().info("✗ Failed: #{failed}")
        Mix.shell().info("=====================================")

      {:ok, _} ->
        Mix.shell().error("JSON file must contain an array of exercises")

      {:error, reason} ->
        Mix.shell().error("Failed to parse JSON: #{inspect(reason)}")
    end
  end

  defp import_single_exercise({exercise_data, index}) do
    name = exercise_data["name"]

    existing_query =
      from e in Exercise,
        where: e.name == ^name and is_nil(e.business_id)

    case Repo.one(existing_query) do
      nil ->
        attrs = %{
          "name" => exercise_data["name"],
          "description" => exercise_data["description"],
          "instructions" => exercise_data["instructions"],
          "mechanics" => exercise_data["mechanics"],
          "force" => exercise_data["force"],
          "muscle_ids" => exercise_data["muscle_ids"] || [],
          "equipment_ids" => exercise_data["equipment_ids"] || []
        }

        case Exercise.insert_changeset(nil, attrs) |> Repo.insert() do
          {:ok, _exercise} ->
            Mix.shell().info("#{index}. ✓ Imported: #{name}")
            {:ok, name}

          {:error, changeset} ->
            errors = format_changeset_errors(changeset)
            Mix.shell().error("#{index}. ✗ Failed to import '#{name}': #{errors}")
            {:error, name}
        end

      _existing ->
        Mix.shell().info("#{index}. ⊘ Skipped (exists): #{name}")
        {:skipped, name}
    end
  end

  defp format_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
    |> Enum.map(fn {field, errors} -> "#{field}: #{Enum.join(errors, ", ")}" end)
    |> Enum.join("; ")
  end
end
