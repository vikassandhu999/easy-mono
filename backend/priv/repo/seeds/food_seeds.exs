NimbleCSV.define(FoodsCSVParser, separator: ",", escape: "\"")

defmodule Easy.Repo.Seeds.Foods do
  alias Easy.Nutrition.Food
  alias Easy.Repo
  import Ecto.Query

  @batch_size 500
  @source :system
  @food_categories ["I", "PF"]

  @spec run() :: :ok
  def run do
    # Prefer the curated subset shipped in the release image; fall back to the full
    # local-only database (foods_database.csv, excluded from the Docker image) when present.
    seed_csv = Path.join(:code.priv_dir(:easy), "repo/foods_seed.csv")
    full_csv = Path.join(:code.priv_dir(:easy), "repo/foods_database.csv")

    {:ok, _} = Repo.transaction(fn ->
    Repo.query!("SELECT pg_advisory_xact_lock(hashtext('nutrition_food_seed'))")
    cond do
      Repo.exists?(from(f in Food, where: f.source == :system)) -> IO.puts("  Foods already seeded")
      File.exists?(full_csv) -> seed_foods(full_csv)
      File.exists?(seed_csv) -> seed_foods(seed_csv)
      true -> IO.puts("  Skipping foods — no foods CSV found")
    end

    end, timeout: 120_000)
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
          Repo.insert_all(Food, batch, timeout: 120_000)

        inserted = total + count
        IO.write("\r  Inserted #{inserted} foods...")
        inserted
      end)

    IO.puts("\r  Foods: #{count} inserted            ")
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
      name: food["food_name"] |> String.trim(),
      nutrients: source_nutrients(food),
      servings: build_servings(measures),
      default_serving_id: nil,
      source: @source,
      category: map_category(food["food_category"]),
      allergens: [],
      dietary_tags: [],
      notes: nil,
      media_id: seed_image(food["food_image_url"], now),
      creator_id: nil,
      business_id: nil,
      inserted_at: now,
      updated_at: now
    }
  end

  defp seed_image(url, now) when is_binary(url) and url != "" do
    id = Ecto.UUID.generate()
    Repo.insert_all(Easy.LibraryMedia.Media, [%{id: id, uploaded_by_type: :system, external_url: url, inserted_at: now, updated_at: now}])
    id
  end
  defp seed_image(_url, _now), do: nil

  defp build_servings(measures) do
    measures |> Enum.filter(&(is_number(&1["measure_weight"]) and &1["measure_weight"] > 0 and &1["measure_name"] != "grams")) |> Enum.map(fn m -> %{"id" => Ecto.UUID.generate(), "label" => m["measure_name"], "grams" => round_macro(m["measure_weight"])} end)
  end
  @spec source_nutrients(map()) :: map()
  def source_nutrients(food) do
    %{"energy_kcal" => "calorie", "protein_g" => "proteins", "carbs_g" => "carbs", "fat_g" => "fats", "fiber_g" => "fibre", "sugar_g" => "sugar"}
    |> Enum.flat_map(fn {code, field} -> case round_macro(food[field]) do nil -> []; n -> [{code, n}] end end) |> Map.new()
  end

  defp map_category("I"), do: "ingredient"
  defp map_category("PF"), do: "packaged"

  defp round_macro(nil), do: nil
  defp round_macro(val) when is_number(val), do: Float.round(val / 1, 2)
  defp round_macro(_), do: nil
end
