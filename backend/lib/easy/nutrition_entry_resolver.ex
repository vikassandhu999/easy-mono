defmodule Easy.Nutrition.EntryResolver do
  alias Easy.Nutrition.Library
  alias Easy.Nutrition.Nutrients
  @spec resolve(Easy.Ctx.t(), map(), map() | nil, map() | nil) :: {:ok, map()} | {:error, term()}
  def resolve(ctx, draft, previous, planned) do
    cond do
      is_nil(draft["source"]) ->
        quick_add(draft)

      previous && previous.source == draft["source"] && previous.portion == draft["portion"] ->
        {:ok,
         Map.merge(draft, %{
           "name" => previous.name,
           "grams" => previous.grams,
           "nutrients" => previous.nutrients,
           "food_components" => previous.food_components
         })}

      planned && planned["source"] == draft["source"] ->
        scale_planned(draft, planned)

      true ->
        with {:ok, resolved} <- Library.resolve(ctx, draft["source"], draft["portion"]),
             do: {:ok, Map.merge(draft, resolved)}
    end
  end

  defp quick_add(draft) do
    if is_nil(draft["portion"]) and Nutrients.valid?(draft["nutrients"]) and
         is_number(draft["nutrients"]["energy_kcal"]) and is_binary(draft["name"]) and draft["name"] != "",
       do: {:ok, draft |> Map.put("grams", nil) |> Map.put("food_components", [])},
       else: {:error, :invalid_quick_add}
  end

  defp scale_planned(draft, planned) do
    servings =
      case planned["portion"] do
        %{"type" => "serving", "serving_id" => id, "amount" => n} -> [%{"id" => id, "grams" => planned["grams"] / n}]
        _ -> []
      end

    with {:ok, grams} <- Library.portion_grams(draft["portion"], servings),
         do:
           {:ok,
            Map.merge(draft, %{
              "name" => planned["name"],
              "grams" => grams,
              "nutrients" => Nutrients.scale(planned["nutrients"], grams / planned["grams"]),
              "food_components" => Library.scale_components(planned["food_components"] || [], grams / planned["grams"])
            })}
  end
end
