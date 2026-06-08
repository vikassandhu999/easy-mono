defmodule Easy.ContextLayoutTest do
  use ExUnit.Case, async: true

  @legacy_context_dirs [
    "lib/easy/identity"
  ]

  test "non-identity nested Easy context folders contain only schemas" do
    non_schema_paths =
      "lib/easy/*/*.ex"
      |> Path.wildcard()
      |> Enum.reject(fn path ->
        Enum.any?(@legacy_context_dirs, &String.starts_with?(path, &1))
      end)
      |> Enum.reject(fn path ->
        path
        |> File.read!()
        |> String.contains?("use Ecto.Schema")
      end)

    assert non_schema_paths == []
  end
end
