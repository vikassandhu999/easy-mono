defmodule Easy.Repo.Migrations.AddNutritionFoodLibraryInvariants do
  use Ecto.Migration

  def up do
    alter table(:nutrition_foods) do
      add :revision, :integer, null: false, default: 1
    end

    create constraint(:nutrition_foods, :nutrition_foods_revision_positive, check: "revision > 0")

    create constraint(:nutrition_foods, :nutrition_foods_nutrients_nonnegative,
             check: """
             (calories_per_100g IS NULL OR calories_per_100g >= 0)
             AND (protein_g_per_100g IS NULL OR protein_g_per_100g >= 0)
             AND (carbs_g_per_100g IS NULL OR carbs_g_per_100g >= 0)
             AND (fat_g_per_100g IS NULL OR fat_g_per_100g >= 0)
             AND (fiber_g_per_100g IS NULL OR fiber_g_per_100g >= 0)
             AND (sugar_g_per_100g IS NULL OR sugar_g_per_100g >= 0)
             """
           )

    flush()
    clean_serving_sizes()
  end

  def down do
    drop constraint(:nutrition_foods, :nutrition_foods_nutrients_nonnegative)
    drop constraint(:nutrition_foods, :nutrition_foods_revision_positive)

    alter table(:nutrition_foods) do
      remove :revision
    end
  end

  defp clean_serving_sizes do
    %{rows: rows} = repo().query!("SELECT id, serving_sizes FROM nutrition_foods")

    Enum.each(rows, fn [id, sizes] ->
      cleaned = clean_sizes(List.wrap(sizes))
      repo().query!("UPDATE nutrition_foods SET serving_sizes = $1 WHERE id = $2", [cleaned, id])
    end)
  end

  defp clean_sizes(sizes) do
    kept =
      sizes
      |> Enum.map(&stringify_keys/1)
      |> Enum.map(&clean_size/1)
      |> Enum.reject(&is_nil/1)

    case Enum.find_index(kept, & &1["is_default"]) do
      nil ->
        case kept do
          [first | rest] ->
            [
              Map.put(first, "is_default", true)
              | Enum.map(rest, &Map.put(&1, "is_default", false))
            ]

          [] ->
            []
        end

      idx ->
        Enum.with_index(kept, fn size, i -> Map.put(size, "is_default", i == idx) end)
    end
  end

  defp clean_size(size) do
    unit = size["unit"]
    weight = to_float(size["weight_g"])
    amount = to_float(size["amount"])

    cond do
      not is_binary(unit) or unit == "" ->
        nil

      weight == nil or weight <= 0 ->
        nil

      true ->
        %{
          "label" => nonempty(size["label"]) || unit,
          "amount" => if(amount == nil or amount <= 0, do: 1.0, else: amount),
          "unit" => unit,
          "weight_g" => weight,
          "is_default" => truthy?(size["is_default"])
        }
    end
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn {key, value} -> {to_string(key), value} end)
  end

  defp to_float(value) when is_number(value), do: value / 1

  defp to_float(value) when is_binary(value) do
    case Float.parse(value) do
      {number, ""} -> number
      _ -> nil
    end
  end

  defp to_float(_), do: nil

  defp nonempty(value) when is_binary(value) do
    case String.trim(value) do
      "" -> nil
      trimmed -> trimmed
    end
  end

  defp nonempty(_), do: nil

  defp truthy?(true), do: true
  defp truthy?("true"), do: true
  defp truthy?(_), do: false
end
