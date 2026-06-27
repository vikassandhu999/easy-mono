NimbleCSV.define(FoodsCSVParser, separator: ",", escape: "\"")

defmodule Easy.Repo.Seeds.Foods do
  alias Easy.Nutrition.{Food, ServingSize}
  alias Easy.Repo

  @batch_size 500
  @source :system
  @food_categories ["I", "PF"]

  @food_fields [
    :name,
    :calories_per_100g,
    :protein_g_per_100g,
    :carbs_g_per_100g,
    :fat_g_per_100g,
    :fiber_g_per_100g,
    :serving_sizes,
    :source,
    :category,
    :allergens,
    :dietary_tags,
    :notes,
    :image_url,
    :import_id
  ]

  @spec run() :: :ok
  def run do
    # Prefer the curated subset shipped in the release image; fall back to the full
    # local-only database (foods_database.csv, excluded from the Docker image) when present.
    seed_csv = Path.join(:code.priv_dir(:easy), "repo/foods_seed.csv")
    full_csv = Path.join(:code.priv_dir(:easy), "repo/foods_database.csv")

    cond do
      File.exists?(full_csv) -> seed_foods(full_csv)
      File.exists?(seed_csv) -> seed_foods(seed_csv)
      true -> IO.puts("  Skipping foods — no foods CSV found")
    end

    :ok
  end

  defp seed_foods(csv_path) do
    IO.puts("  Importing foods from CSV...")

    now = DateTime.utc_now() |> DateTime.truncate(:second)

    count =
      csv_path
      |> File.stream!([:trim_bom])
      |> FoodsCSVParser.parse_stream(skip_headers: true)
      |> Stream.map(&parse_row/1)
      |> Stream.reject(&is_nil/1)
      |> Stream.filter(&(&1["food"]["food_category"] in @food_categories))
      |> Stream.map(&build_food_entry(&1, now))
      |> Stream.chunk_every(@batch_size)
      |> Enum.reduce(0, fn batch, total ->
        {count, _} =
          Repo.insert_all(Food, batch,
            on_conflict: {:replace, @food_fields ++ [:updated_at]},
            conflict_target: {:unsafe_fragment, ~s|("import_id") WHERE import_id IS NOT NULL|},
            timeout: 120_000
          )

        inserted = total + count
        IO.write("\r  Upserted #{inserted} foods...")
        inserted
      end)

    IO.puts("\r  Foods: #{count} upserted            ")
  end

  defp parse_row([_id, json_string]) do
    case Jason.decode(json_string) do
      {:ok, data} -> data
      {:error, _} -> nil
    end
  end

  defp parse_row(_), do: nil

  defp build_food_entry(data, now) do
    food = data["food"]
    measures = data["food_measures"] || []

    %{
      id: Ecto.UUID.generate(),
      import_id: to_string(food["food_id"]),
      name: food["food_name"] |> String.trim(),
      calories_per_100g: round_macro(food["calorie"]),
      protein_g_per_100g: round_macro(food["proteins"]),
      carbs_g_per_100g: round_macro(food["carbs"]),
      fat_g_per_100g: round_macro(food["fats"]),
      fiber_g_per_100g: round_macro(food["fibre"]),
      serving_sizes: build_serving_sizes(measures),
      source: @source,
      category: map_category(food["food_category"]),
      allergens: [],
      dietary_tags: [],
      notes: nil,
      image_url: food["food_image_url"],
      creator_id: nil,
      business_id: nil,
      inserted_at: now,
      updated_at: now
    }
  end

  defp build_serving_sizes(measures) do
    measures
    |> Enum.reject(&(&1["measure_name"] == "grams"))
    |> Enum.sort_by(& &1["measure_rank"])
    |> Enum.map(fn m ->
      %ServingSize{
        id: Ecto.UUID.generate(),
        unit: m["measure_name"],
        weight_g: round_macro(m["measure_weight"]),
        amount: 1.0
      }
    end)
  end

  defp map_category("I"), do: "ingredient"
  defp map_category("PF"), do: "packaged"

  defp round_macro(nil), do: 0.0
  defp round_macro(val) when is_number(val), do: Float.round(val / 1, 2)
  defp round_macro(_), do: 0.0
end
