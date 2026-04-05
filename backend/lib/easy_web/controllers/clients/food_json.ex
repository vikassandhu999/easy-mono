defmodule EasyWeb.Clients.FoodJSON do
  alias Easy.Nutrition.Food

  @spec show(map()) :: map()
  def show(%{food: food}) do
    %{data: data(food)}
  end

  @spec index(map()) :: map()
  def index(%{foods: foods, count: count}) do
    %{data: Enum.map(foods, &data/1), count: count}
  end

  defp data(%Food{} = food) do
    %{
      id: food.id,
      name: food.name,
      macros: food.macros,
      source: food.source,
      category: food.category,
      tags: food.tags || [],
      notes: food.notes,
      image_url: food.image_url,
      serving_sizes: serving_sizes_data(food.serving_sizes),
      inserted_at: food.inserted_at,
      updated_at: food.updated_at
    }
  end

  defp serving_sizes_data(sizes) when is_list(sizes) do
    Enum.map(sizes, fn s -> %{unit: s.unit, weight_g: s.weight_g, amount: s.amount} end)
  end

  defp serving_sizes_data(_), do: []
end
