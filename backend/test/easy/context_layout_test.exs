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
        legacy? = Enum.any?(@legacy_context_dirs, &String.starts_with?(path, &1))
        schema? = path |> File.read!() |> String.contains?("use Ecto.Schema")
        legacy? or schema?
      end)

    assert non_schema_paths == []
  end

  test "schemas never call Repo" do
    offenders =
      "lib/easy/**/*.ex"
      |> Path.wildcard()
      |> Enum.filter(fn path ->
        source = File.read!(path)
        String.contains?(source, "use Ecto.Schema") and source =~ ~r/\bRepo\./
      end)

    assert offenders == []
  end

  test "domain modules do not construct HTTP-shaped errors" do
    offenders =
      "lib/easy/**/*.ex"
      |> Path.wildcard()
      |> Enum.reject(&(&1 == "lib/easy/error.ex"))
      |> Enum.filter(&(File.read!(&1) =~ ~r/\bEasy\.Error\b/))

    assert offenders == []
  end

  test "backend source has no forbidden docs or bang Repo calls" do
    offenders =
      ["lib/easy/**/*.ex", "lib/easy_web/**/*.ex"]
      |> Enum.flat_map(&Path.wildcard/1)
      |> Enum.filter(fn path ->
        source = File.read!(path)
        source =~ ~r/@(?:doc|moduledoc)\b/ or source =~ ~r/\bRepo\.(?:delete|get|get_by|insert|one|transaction|update)!\(/
      end)

    assert offenders == []
  end

  test "attrs are not probed through both atom and string keys" do
    offenders =
      "lib/easy/**/*.ex"
      |> Path.wildcard()
      |> Enum.filter(fn path ->
        source = File.read!(path)

        source =~ ~r/attrs\[:\w+\].*\|\|.*attrs\["\w+"\]/ or
          source =~ ~r/Map\.get\(attrs, :\w+\).*\|\|.*Map\.get\(attrs, "\w+"\)/
      end)

    assert offenders == []
  end
end
