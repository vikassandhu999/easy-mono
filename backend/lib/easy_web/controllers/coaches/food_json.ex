defmodule EasyWeb.Coaches.FoodJSON do
  alias Easy.Nutrition.Food

  def show(%{food: food}) do
    %{data: data(food)}
  end

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
      creator_id: food.creator_id,
      inserted_at: food.inserted_at,
      updated_at: food.updated_at
    }
  end

  defp serving_sizes_data(serving_sizes) when is_list(serving_sizes) do
    for serving_size <- serving_sizes do
      %{
        unit: serving_size.unit,
        weight_g: serving_size.weight_g,
        amount: serving_size.amount
      }
    end
  end

  defp serving_sizes_data(_), do: []
end
