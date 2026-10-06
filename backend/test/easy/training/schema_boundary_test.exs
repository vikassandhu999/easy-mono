defmodule Easy.Training.SchemaBoundaryTest do
  use ExUnit.Case, async: true

  @schema_paths Path.wildcard("lib/easy/training/*.ex")

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
