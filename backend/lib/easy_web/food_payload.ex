defmodule EasyWeb.FoodPayload do
  alias Easy.LibraryMedia
  alias Easy.LibraryMedia.Media
  alias Easy.Nutrition.{Food, NutrientTotals}

  @spec data(Food.t()) :: map()
  def data(%Food{} = food) do
    nutrients = NutrientTotals.round(NutrientTotals.from_food(food))

    %{
      id: food.id,
      name: food.name,
      brand: food.brand,
      barcode: food.barcode,
      source: food.source,
      category: food.category,
      revision: food.revision,
      nutrients: nutrients,
      calories_per_100g: nutrients.calories,
      protein_g_per_100g: nutrients.protein,
      carbs_g_per_100g: nutrients.carbohydrates,
      fat_g_per_100g: nutrients.fat,
      fiber_g_per_100g: nutrients.fiber,
      sugar_g_per_100g: food.sugar_g_per_100g,
      allergens: food.allergens || [],
      dietary_tags: food.dietary_tags || [],
      notes: food.notes,
      image_url: food.image_url,
      media: media_data(food.media),
      serving_sizes: serving_sizes(food.serving_sizes),
      inserted_at: food.inserted_at,
      updated_at: food.updated_at
    }
  end

  defp media_data(%Media{} = media), do: LibraryMedia.public_representation(media)
  defp media_data(_), do: nil

  defp serving_sizes(serving_sizes) when is_list(serving_sizes) do
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

  defp serving_sizes(_), do: []
end
