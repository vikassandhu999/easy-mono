defmodule EasyWeb.Coaches.FoodJSON do
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
      brand: food.brand,
      barcode: food.barcode,
      source: food.source,
      category: food.category,
      calories_per_100g: food.calories_per_100g,
      protein_g_per_100g: food.protein_g_per_100g,
      carbs_g_per_100g: food.carbs_g_per_100g,
      fat_g_per_100g: food.fat_g_per_100g,
      fiber_g_per_100g: food.fiber_g_per_100g,
      allergens: food.allergens || [],
      dietary_tags: food.dietary_tags || [],
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
        label: serving_size.label,
        amount: serving_size.amount,
        unit: serving_size.unit,
        weight_g: serving_size.weight_g,
        is_default: serving_size.is_default
      }
    end
  end

  defp serving_sizes_data(_), do: []
end
