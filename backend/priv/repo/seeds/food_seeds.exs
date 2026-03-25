NimbleCSV.define(FoodsCSVParser, separator: ",", escape: "\"")

defmodule Easy.Repo.Seeds.Foods do
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.ServingSize
  alias Easy.Repo

  import Ecto.Query

  @batch_size 500
  @source "system"
  @food_categories ["I", "PF"]

  @spec run() :: :ok
  def run do
    csv_path = Path.join(:code.priv_dir(:easy), "repo/foods_database.csv")

    case File.exists?(csv_path) do
      true ->
        existing_count = Repo.aggregate(system_foods_query(), :count, :id)

        if existing_count > 0 do
          IO.puts("  Skipping foods — #{existing_count} system foods already exist")
        else
          seed_foods(csv_path)
        end

      false ->
        IO.puts("  Skipping foods — foods_database.csv not found")
    end

    :ok
  end

  defp system_foods_query do
    from(f in Food, where: is_nil(f.business_id) and f.source == @source)
  end

  defp seed_foods(csv_path) do
    IO.puts("  Importing foods from CSV...")

    now = DateTime.utc_now() |> DateTime.truncate(:second)

    {count, _} =
      csv_path
      |> File.stream!([:trim_bom])
      |> FoodsCSVParser.parse_stream(skip_headers: true)
      |> Stream.map(&parse_row/1)
      |> Stream.reject(&is_nil/1)
      |> Stream.filter(&(&1["food"]["food_category"] in @food_categories))
      |> Stream.map(&build_food_entry(&1, now))
      |> Stream.chunk_every(@batch_size)
      |> Enum.reduce({0, 0}, fn batch, {total, _} ->
        {count, _} = Repo.insert_all(Food, batch)
        inserted = total + count
        IO.write("\r  Inserted #{inserted} foods...")
        {inserted, 0}
      end)

    IO.puts("\r  Inserted #{count} foods            ")
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
      name: food["food_name"] |> String.trim(),
      macros: build_macros(food),
      serving_sizes: build_serving_sizes(measures),
      source: @source,
      category: map_category(food["food_category"]),
      tags: [],
      notes: nil,
      image_url: food["food_image_url"],
      creator_id: nil,
      business_id: nil,
      inserted_at: now,
      updated_at: now
    }
  end

  defp build_macros(food) do
    %{
      "calories" => round_macro(food["calorie"]),
      "protein" => round_macro(food["proteins"]),
      "carbs" => round_macro(food["carbs"]),
      "fat" => round_macro(food["fats"]),
      "fiber" => round_macro(food["fibre"])
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
