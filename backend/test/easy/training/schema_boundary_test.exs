defmodule Easy.Training.SchemaBoundaryTest do
  use ExUnit.Case, async: true

  @schema_paths [
    "lib/easy/training/training_equipment.ex",
    "lib/easy/training/training_exercise.ex",
    "lib/easy/training/training_muscle.ex",
    "lib/easy/training/training_performed_set.ex",
    "lib/easy/training/schedule_entry.ex",
    "lib/easy/training/planned_set.ex",
    "lib/easy/training/training_plan.ex",
    "lib/easy/training/training_workout.ex",
    "lib/easy/training/training_workout_exercise.ex",
    "lib/easy/training/training_session.ex"
  ]

  @context_verbs [
    "assign_to_client",
    "client_create",
    "client_update",
    "complete",
    "copy_into",
    "create",
    "delete",
    "discard",
    "duplicate",
    "ensure_no_active",
    "update"
  ]

  test "training schemas do not call Repo" do
    for path <- @schema_paths do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ "alias Easy.Repo", path
      refute source =~ ~r/\bRepo\./, path
    end
  end

  test "training schemas do not expose context workflow functions" do
    verb_pattern = Enum.join(@context_verbs, "|")

    for path <- @schema_paths do
      source = File.read!(Path.join(File.cwd!(), path))

      refute source =~ ~r/^\s+def (#{verb_pattern})\b/m, path
    end
  end
end
