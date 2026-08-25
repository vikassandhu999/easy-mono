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

  test "Nutrition Programming depends on ClientAccess rather than the Clients context" do
    source = File.read!("lib/easy/nutrition_programming.ex")

    assert source =~ "alias Easy.ClientAccess"
    refute source =~ ~r/^\s*alias Easy\.Clients$/m
    refute source =~ ~r/(?<!Easy\.)\bClients\./
  end

  test "Nutrition Programming delegates the complete Menu replacement engine" do
    programming = File.read!("lib/easy/nutrition_programming.ex")
    engine_path = "lib/easy/nutrition_programming_menu_replacement.ex"

    assert File.exists?(engine_path)
    assert programming =~ "alias Easy.Nutrition.Programming.MenuReplacement"
    assert programming =~ "MenuReplacement.replace(ctx, plan, attrs)"
    assert programming =~ "mutate_plan(ctx, plan_id, expected_revision"

    engine = File.read!(engine_path)
    refute engine =~ "Repo.transaction"
  end

  test "Nutrition Diary delegates the complete idempotency command runner" do
    diary = File.read!("lib/easy/nutrition_diary.ex")
    runner_path = "lib/easy/nutrition_diary_idempotency.ex"

    assert File.exists?(runner_path)
    assert diary =~ "alias Easy.Nutrition.Diary.Idempotency"
    assert diary =~ "Idempotency.run("
    assert diary =~ "Idempotency.purge_expired("
    refute diary =~ "DiaryCommandLedger"
    refute diary =~ "Repo.rollback"

    runner = File.read!(runner_path)
    assert runner =~ "Repo.transaction"
    assert runner =~ ~r/\{:rollback, reason\}\s*->\s*Repo\.rollback\(reason\)/
  end

  test "Nutrition Diary delegates read assembly and correction policy" do
    diary = File.read!("lib/easy/nutrition_diary.ex")
    assembler_path = "lib/easy/nutrition_diary_day_assembler.ex"
    policy_path = "lib/easy/nutrition_diary_correction_policy.ex"
    day_type_path = "lib/easy/nutrition_day.ex"

    assert File.exists?(assembler_path)
    assert File.exists?(policy_path)
    assert File.exists?(day_type_path)
    assert diary =~ "alias Easy.Nutrition.Day"
    assert diary =~ "alias Easy.Nutrition.Diary.{CorrectionPolicy, DayAssembler}"
    assert diary =~ "DayAssembler.list("
    assert diary =~ "DayAssembler.assemble("
    assert diary =~ "CorrectionPolicy."
    refute diary =~ "@correction_days"

    assembler = File.read!(assembler_path)
    policy = File.read!(policy_path)
    day_types = File.read!(day_type_path)

    assert diary =~ "defp insert_frozen_item!("
    refute assembler =~ ~r/\bRepo\.(?:insert|update|delete)\(/
    assert policy =~ "@correction_days 7"
    refute assembler =~ "@correction_days"
    assert day_types =~ "@type t()"
    assert day_types =~ "@type planned_item()"
    refute day_types =~ "defstruct"
  end
end
