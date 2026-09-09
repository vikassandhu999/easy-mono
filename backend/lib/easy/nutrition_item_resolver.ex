defmodule Easy.Nutrition.ItemResolver do
  import Ecto.Query

  alias Easy.Ctx
  alias Easy.Nutrition.{Food, ItemReference, NutrientTotals, Portions, Recipe, RecipeIngredient}
  alias Easy.Repo

  @spec resolve(Ctx.t(), [ItemReference.t()]) ::
          {:ok, ItemReference.resolved_items()} | {:error, :not_found | :invalid_portion | :conflict}
  def resolve(%Ctx{} = ctx, items), do: Repo.snapshot(fn -> resolve_batch(ctx, items, false) end)

  @spec resolve_for_write(Ctx.t(), [ItemReference.t()]) ::
          {:ok, ItemReference.resolved_items()} | {:error, :not_found | :invalid_portion}
  def resolve_for_write(%Ctx{} = ctx, items) do
    true = Repo.in_transaction?()
    resolve_batch(ctx, items, true)
  end

  @spec available(Ctx.t(), [%{food_id: String.t() | nil, recipe_id: String.t() | nil}]) ::
          {:ok, MapSet.t({:food | :recipe, String.t()})}
  def available(%Ctx{}, []), do: {:ok, MapSet.new()}

  def available(%Ctx{} = ctx, items) do
    food_ids = Enum.flat_map(items, &List.wrap(&1.food_id))
    recipe_ids = Enum.flat_map(items, &List.wrap(&1.recipe_id))

    foods =
      Food.for_business_or_system(ctx.business_id)
      |> where([f], f.id in ^food_ids)
      |> select([f], f.id)
      |> Repo.all()

    recipes =
      Recipe.for_business(ctx.business_id)
      |> where([r], r.id in ^recipe_ids)
      |> select([r], r.id)
      |> Repo.all()

    {:ok, MapSet.new(Enum.map(foods, &{:food, &1}) ++ Enum.map(recipes, &{:recipe, &1}))}
  end

  defp resolve_batch(_ctx, [], _lock?), do: {:ok, %{}}

  defp resolve_batch(ctx, items, lock?) do
    {foods, recipes} = load_items(ctx, items, lock?)

    items
    |> Enum.uniq()
    |> Enum.reduce_while({:ok, %{}}, fn spec, {:ok, resolved} ->
      case resolve_item(spec, foods, recipes) do
        {:ok, item} -> {:cont, {:ok, Map.put(resolved, spec, item)}}
        error -> {:halt, error}
      end
    end)
  end

  defp load_items(ctx, items, lock?) do
    recipe_ids = for %{kind: :recipe, id: id} <- items, do: id

    recipes =
      Recipe.for_business(ctx.business_id)
      |> where([r], r.id in ^recipe_ids)
      |> ordered_read(lock?)

    ingredients =
      RecipeIngredient.for_business(ctx.business_id)
      |> where([i], i.recipe_id in ^recipe_ids)
      |> Repo.all()

    food_ids = Enum.map(ingredients, & &1.food_id) ++ for(%{kind: :food, id: id} <- items, do: id)

    foods =
      Food.for_business_or_system(ctx.business_id)
      |> where([f], f.id in ^food_ids)
      |> ordered_read(lock?)
      |> Map.new(&{&1.id, &1})

    ingredients = Enum.group_by(ingredients, & &1.recipe_id, &%{&1 | food: Map.get(foods, &1.food_id)})
    recipes = Map.new(recipes, &{&1.id, %{&1 | recipe_ingredients: Map.get(ingredients, &1.id, [])}})
    {foods, recipes}
  end

  defp ordered_read(query, lock?) do
    query = order_by(query, [row], asc: row.id)
    query = if lock?, do: lock(query, "FOR SHARE"), else: query
    Repo.all(query)
  end

  defp resolve_item(%{kind: :food, id: id, portion: portion}, foods, _recipes) do
    with {:ok, food} <- Map.fetch(foods, id),
         {:ok, resolved} <- Portions.resolve_food(food, portion) do
      {:ok,
       %{
         kind: :food,
         item: food,
         portion: resolved,
         nutrients: NutrientTotals.scale(NutrientTotals.from_food(food), resolved.grams / 100)
       }}
    else
      :error -> {:error, :not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  defp resolve_item(%{kind: :recipe, id: id, portion: portion}, _foods, recipes) do
    with {:ok, recipe} <- Map.fetch(recipes, id),
         {:ok, resolved} <- Portions.resolve_recipe(recipe, portion) do
      {:ok,
       %{
         kind: :recipe,
         item: recipe,
         portion: resolved,
         nutrients: recipe_portion_nutrients(recipe, resolved)
       }}
    else
      :error -> {:error, :not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  defp recipe_portion_nutrients(recipe, %{amount: amount}) when is_number(amount) do
    NutrientTotals.scale(NutrientTotals.from_recipe(recipe), amount / recipe.servings_count)
  end

  defp recipe_portion_nutrients(%{cooked_weight_g: cooked} = recipe, %{grams: grams})
       when is_number(cooked) and cooked > 0 and is_number(grams) do
    NutrientTotals.scale(NutrientTotals.from_recipe(recipe), grams / cooked)
  end
end
