defmodule Easy.Nutrition.Library do
  alias Easy.Ctx
  alias Easy.LibraryMedia
  alias Easy.CopyName
  alias Easy.Nutrition.{Food, NutrientTotals, Recipe, RecipeIngredient}
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  @spec get_food(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found}
  def get_food(%Ctx{} = ctx, food_id) do
    Food
    |> Food.for_business_or_system(ctx.business_id)
    |> Food.include_media()
    |> Repo.get(food_id)
    |> ok_or_not_found()
  end

  @spec list_foods(Ctx.t(), keyword()) :: {:ok, %{count: non_neg_integer(), foods: [Food.t()]}}
  def list_foods(%Ctx{} = ctx, opts \\ []) do
    search = String.trim(Keyword.get(opts, :search, "") || "")
    categories = Keyword.get(opts, :categories)
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 20)

    base =
      Food
      |> Food.for_business_or_system(ctx.business_id)
      |> Food.search(search)
      |> Food.for_categories(categories)

    ordered = if search == "", do: Food.newest(base), else: base

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       foods: ordered |> Utils.paginate(offset, limit) |> Food.include_media() |> Repo.all()
     }}
  end

  @spec list_food_categories(Ctx.t()) :: {:ok, [String.t()]}
  def list_food_categories(%Ctx{} = ctx) do
    {:ok,
     Food
     |> Food.for_business_or_system(ctx.business_id)
     |> Food.distinct_categories()
     |> Repo.all()}
  end

  @spec create_food(Ctx.t(), map()) :: {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_food(%Ctx{} = ctx, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]),
         {:ok, food} <- ctx.business_id |> Food.insert_changeset(coach.id, attrs) |> Repo.insert() do
      {:ok, Repo.preload(food, :media)}
    end
  end

  @spec update_food(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Food.t()} | {:error, :not_found | :read_only_source | Ecto.Changeset.t()}
  def update_food(%Ctx{} = ctx, food_id, expected_revision, attrs) do
    with :ok <- ensure_coach(ctx) do
      mutate_food(ctx, food_id, expected_revision, &update_locked_food(ctx, &1, attrs))
    end
  end

  @spec delete_food(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Food.t()} | {:error, :not_found | :read_only_source | :in_use | Ecto.Changeset.t()}
  def delete_food(%Ctx{} = ctx, food_id, expected_revision) do
    with :ok <- ensure_coach(ctx) do
      mutate_food(ctx, food_id, expected_revision, &delete_locked_food(ctx, &1), reload?: false)
    end
  end

  @spec get_food_impact(Ctx.t(), String.t()) ::
          {:ok, %{templates: [map()], active_client_plans: [map()]}} | {:error, :not_found}
  def get_food_impact(%Ctx{} = ctx, food_id) do
    with {:ok, _food} <- get_food(ctx, food_id) do
      {:ok, %{templates: [], active_client_plans: []}}
    end
  end

  @spec copy_food(Ctx.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_food(%Ctx{} = ctx, food_id) do
    with {:ok, food} <- get_food(ctx, food_id) do
      attrs = %{
        name: food.name,
        brand: food.brand,
        barcode: food.barcode,
        category: food.category,
        calories_per_100g: food.calories_per_100g,
        protein_g_per_100g: food.protein_g_per_100g,
        carbs_g_per_100g: food.carbs_g_per_100g,
        fat_g_per_100g: food.fat_g_per_100g,
        fiber_g_per_100g: food.fiber_g_per_100g,
        sugar_g_per_100g: food.sugar_g_per_100g,
        allergens: food.allergens,
        dietary_tags: food.dietary_tags,
        notes: food.notes,
        image_url: food.image_url,
        media_id: food.media_id,
        serving_sizes: Enum.map(food.serving_sizes, &serving_size_attrs/1)
      }

      create_food(ctx, attrs)
    end
  end

  @spec resolve_food_portion(Food.t(), map()) ::
          {:ok, %{grams: float(), amount: float() | nil, unit: String.t() | nil, label: String.t() | nil}}
          | {:error, :invalid_portion}
  def resolve_food_portion(_food, %{kind: :gram, grams: grams}) when is_number(grams) and grams > 0 do
    {:ok, %{grams: grams / 1, amount: nil, unit: nil, label: nil}}
  end

  def resolve_food_portion(%Food{serving_sizes: sizes}, %{kind: :serving, amount: amount, unit: unit, label: label})
      when is_number(amount) and amount > 0 and is_binary(unit) do
    case Enum.find(sizes, &(&1.unit == unit and &1.label == label)) do
      %{amount: serving_amount, weight_g: weight_g} when serving_amount > 0 and weight_g > 0 ->
        grams = amount / serving_amount * weight_g

        if grams > 0 do
          {:ok, %{grams: grams / 1, amount: amount / 1, unit: unit, label: label}}
        else
          {:error, :invalid_portion}
        end

      _missing ->
        {:error, :invalid_portion}
    end
  end

  def resolve_food_portion(_food, _portion), do: {:error, :invalid_portion}

  @spec food_nutrients(Food.t()) :: NutrientTotals.t()
  def food_nutrients(%Food{} = food), do: NutrientTotals.from_food(food)

  @spec get_recipe(Ctx.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def get_recipe(%Ctx{} = ctx, recipe_id) do
    Recipe
    |> Recipe.for_business(ctx.business_id)
    |> Recipe.include_ingredients(ctx.business_id)
    |> Repo.get(recipe_id)
    |> ok_or_not_found()
  end

  @spec list_recipes(Ctx.t(), keyword()) :: {:ok, %{count: non_neg_integer(), recipes: [Recipe.t()]}}
  def list_recipes(%Ctx{} = ctx, opts \\ []) do
    search = String.trim(Keyword.get(opts, :search, "") || "")
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 20)

    base = Recipe |> Recipe.for_business(ctx.business_id) |> Recipe.search(search)
    ordered = Recipe.newest(base)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       recipes: ordered |> Utils.paginate(offset, limit) |> Recipe.include_ingredients(ctx.business_id) |> Repo.all()
     }}
  end

  @spec create_recipe(Ctx.t(), map()) :: {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_recipe(%Ctx{} = ctx, attrs) do
    {ingredients, scalar_attrs} = pop_ingredients(attrs)

    with {:ok, coach} <- get_coach(ctx) do
      persist_recipe(
        ctx,
        fn ->
          ctx.business_id |> Recipe.insert_changeset(coach.id, scalar_attrs) |> Repo.insert()
        end,
        ingredients
      )
    end
  end

  @spec update_recipe(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_recipe(%Ctx{} = ctx, recipe_id, expected_revision, attrs) do
    {ingredients, scalar_attrs} = pop_ingredients(attrs)

    with :ok <- ensure_coach(ctx) do
      mutate_recipe(ctx, recipe_id, expected_revision, fn recipe ->
        persist_locked_recipe(ctx, recipe, scalar_attrs, ingredients)
      end)
    end
  end

  @spec delete_recipe(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Recipe.t()} | {:error, :not_found | :in_use | Ecto.Changeset.t()}
  def delete_recipe(%Ctx{} = ctx, recipe_id, expected_revision) do
    with :ok <- ensure_coach(ctx) do
      mutate_recipe(ctx, recipe_id, expected_revision, &delete_locked_recipe(ctx, &1), reload?: false)
    end
  end

  @spec get_recipe_impact(Ctx.t(), String.t()) ::
          {:ok, %{templates: [map()], active_client_plans: [map()]}} | {:error, :not_found}
  def get_recipe_impact(%Ctx{} = ctx, recipe_id) do
    with {:ok, _recipe} <- get_recipe(ctx, recipe_id) do
      {:ok, %{templates: [], active_client_plans: []}}
    end
  end

  @spec copy_recipe(Ctx.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_recipe(%Ctx{} = ctx, recipe_id) do
    with {:ok, recipe} <- get_recipe(ctx, recipe_id) do
      create_recipe(ctx, %{
        name: generate_copy_name(recipe.name, ctx.business_id),
        description: recipe.description,
        instructions: recipe.instructions,
        servings_count: recipe.servings_count,
        cooked_weight_g: recipe.cooked_weight_g,
        allergens: recipe.allergens,
        dietary_tags: recipe.dietary_tags,
        recipe_ingredients:
          Enum.map(recipe.recipe_ingredients, fn ingredient ->
            %{
              food_id: ingredient.food_id,
              amount: ingredient.amount,
              unit: ingredient.unit,
              weight_g: ingredient.weight_g
            }
          end)
      })
    end
  end

  @spec resolve_recipe_portion(Recipe.t(), map()) ::
          {:ok, %{grams: float() | nil, amount: float() | nil}} | {:error, :invalid_portion}
  def resolve_recipe_portion(%Recipe{servings_count: servings, cooked_weight_g: cooked}, %{
        kind: :serving,
        amount: amount
      })
      when is_integer(servings) and servings > 0 and is_number(amount) and amount > 0 do
    grams =
      case cooked do
        weight when is_number(weight) and weight > 0 -> amount / servings * weight
        _missing -> nil
      end

    {:ok, %{amount: amount / 1, grams: grams}}
  end

  def resolve_recipe_portion(%Recipe{cooked_weight_g: cooked}, %{kind: :gram, grams: grams})
      when is_number(cooked) and cooked > 0 and is_number(grams) and grams > 0 do
    {:ok, %{amount: nil, grams: grams / 1}}
  end

  def resolve_recipe_portion(_recipe, _portion), do: {:error, :invalid_portion}

  @spec recipe_nutrients(Recipe.t()) :: NutrientTotals.t()
  def recipe_nutrients(%Recipe{} = recipe), do: NutrientTotals.from_recipe(recipe)

  @spec resolve_items(Ctx.t(), [map()]) ::
          {:ok, [map()]} | {:error, :not_found | :invalid_portion}
  def resolve_items(%Ctx{} = ctx, items) when is_list(items) do
    {foods, recipes} = load_resolve_targets(ctx, items)

    items
    |> Enum.reduce_while([], &accumulate_resolved(&1, &2, foods, recipes))
    |> reverse_resolved()
  end

  defp persist_recipe(ctx, insert_fun, ingredients) do
    result =
      Repo.transaction(fn ->
        recipe = insert_recipe!(insert_fun)
        replace_ingredients!(ctx, recipe, ingredients)
        recipe
      end)

    finalize_recipe(result)
  end

  defp insert_recipe!(insert_fun) do
    case insert_fun.() do
      {:ok, recipe} -> recipe
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp persist_locked_recipe(ctx, recipe, scalar_attrs, ingredients) do
    with {:ok, updated} <-
           recipe
           |> Recipe.update_changeset(scalar_attrs)
           |> put_change(:revision, recipe.revision + 1)
           |> Repo.update() do
      ingredients
      |> then(&replace_ingredients(ctx, updated, &1))
      |> ok_updated(updated)
    end
  end

  defp ok_updated(:ok, updated), do: {:ok, updated}
  defp ok_updated({:error, reason}, _updated), do: {:error, reason}

  defp replace_ingredients!(ctx, recipe, ingredients) do
    case replace_ingredients(ctx, recipe, ingredients) do
      :ok -> :ok
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp replace_ingredients(_ctx, _recipe, :unchanged), do: :ok

  defp replace_ingredients(ctx, recipe, ingredients) when is_list(ingredients) do
    changesets =
      Enum.with_index(ingredients, fn attrs, position ->
        RecipeIngredient.insert_changeset(recipe.business_id, recipe.id, position, attrs)
      end)

    replace_ingredient_changesets(ctx, recipe, changesets)
  end

  defp replace_ingredient_changesets(_ctx, recipe, changesets) do
    cond do
      Enum.any?(changesets, &(not &1.valid?)) ->
        {:error, ingredient_errors(recipe, changesets)}

      invalid_ingredient_foods?(recipe.business_id, changesets) ->
        {:error, add_error(change(recipe), :recipe_ingredients, "has invalid food")}

      true ->
        Repo.delete_all(from(ri in RecipeIngredient.for_business(recipe.business_id), where: ri.recipe_id == ^recipe.id))
        insert_ingredient_changesets(changesets)
    end
  end

  defp insert_ingredient_changesets(changesets) do
    Enum.reduce_while(changesets, :ok, fn changeset, :ok ->
      case Repo.insert(changeset) do
        {:ok, _row} -> {:cont, :ok}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
  end

  defp ingredient_errors(recipe, changesets) do
    %{recipe | recipe_ingredients: []}
    |> change()
    |> put_assoc(:recipe_ingredients, changesets)
  end

  defp invalid_ingredient_foods?(business_id, changesets) do
    food_ids =
      changesets
      |> Enum.map(&get_field(&1, :food_id))
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()

    food_ids != [] and invalid_food_ids(food_ids, business_id) != []
  end

  defp invalid_food_ids(food_ids, business_id) do
    valid_ids =
      Food
      |> Food.for_business_or_system(business_id)
      |> where([f], f.id in ^food_ids)
      |> select([f], f.id)
      |> Repo.all()
      |> MapSet.new()

    Enum.reject(food_ids, &MapSet.member?(valid_ids, &1))
  end

  defp pop_ingredients(attrs) when is_map(attrs), do: Map.pop(attrs, :recipe_ingredients, :unchanged)

  defp mutate_recipe(ctx, recipe_id, expected_revision, mutation, opts \\ []) do
    result =
      Repo.transaction(fn ->
        recipe =
          Recipe
          |> Recipe.for_business(ctx.business_id)
          |> lock("FOR UPDATE")
          |> Repo.get(recipe_id)

        mutate_revisioned(recipe, expected_revision, mutation)
      end)

    finalize_recipe(result, Keyword.get(opts, :reload?, true))
  end

  defp delete_locked_recipe(ctx, recipe) do
    with :ok <- ensure_recipe_not_in_use(ctx.business_id, recipe.id) do
      Repo.delete(recipe)
    end
  end

  defp ensure_recipe_not_in_use(_business_id, _recipe_id), do: :ok

  defp generate_copy_name(original_name, business_id) do
    existing_names =
      Recipe
      |> Recipe.for_business(business_id)
      |> select([r], r.name)
      |> Repo.all()

    CopyName.next(original_name, existing_names)
  end

  defp load_resolve_targets(ctx, items) do
    {fetch_visible_foods(ctx, for(%{kind: :food, id: id} <- items, do: id)), fetch_visible_recipes(ctx, for(%{kind: :recipe, id: id} <- items, do: id))}
  end

  defp fetch_visible_foods(_ctx, []), do: %{}

  defp fetch_visible_foods(ctx, ids) do
    Food
    |> Food.for_business_or_system(ctx.business_id)
    |> where([f], f.id in ^ids)
    |> Repo.all()
    |> Map.new(&{&1.id, &1})
  end

  defp fetch_visible_recipes(_ctx, []), do: %{}

  defp fetch_visible_recipes(ctx, ids) do
    Recipe
    |> Recipe.for_business(ctx.business_id)
    |> Recipe.include_ingredients(ctx.business_id)
    |> where([r], r.id in ^ids)
    |> Repo.all()
    |> Map.new(&{&1.id, &1})
  end

  defp accumulate_resolved(item, acc, foods, recipes) do
    case resolve_item(item, foods, recipes) do
      {:ok, resolved} -> {:cont, [resolved | acc]}
      {:error, reason} -> {:halt, {:error, reason}}
    end
  end

  defp reverse_resolved({:error, reason}), do: {:error, reason}
  defp reverse_resolved(resolved), do: {:ok, Enum.reverse(resolved)}

  defp resolve_item(%{kind: :food, id: id, portion: portion}, foods, _recipes) do
    with {:ok, food} <- Map.fetch(foods, id),
         {:ok, resolved} <- resolve_food_portion(food, portion) do
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
         {:ok, resolved} <- resolve_recipe_portion(recipe, portion) do
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

  defp finalize_recipe(result, reload? \\ true)

  defp finalize_recipe({:ok, recipe}, true) do
    Recipe
    |> Recipe.for_business(recipe.business_id)
    |> Recipe.include_ingredients(recipe.business_id)
    |> Repo.get(recipe.id)
    |> ok_or_not_found()
  end

  defp finalize_recipe({:ok, recipe}, false), do: {:ok, recipe}
  defp finalize_recipe({:error, reason}, _reload?), do: {:error, reason}

  defp mutate_food(ctx, food_id, expected_revision, mutation, opts \\ []) do
    result =
      Repo.transaction(fn ->
        food =
          Food
          |> Food.for_business_or_system(ctx.business_id)
          |> lock("FOR UPDATE")
          |> Repo.get(food_id)

        mutate_revisioned(food, expected_revision, mutation)
      end)

    finalize_food(result, Keyword.get(opts, :reload?, true))
  end

  defp mutate_revisioned(nil, _expected_revision, _mutation), do: Repo.rollback(:not_found)

  defp mutate_revisioned(%Food{source: source}, _expected_revision, _mutation)
       when source in [:system, :imported],
       do: Repo.rollback(:read_only_source)

  defp mutate_revisioned(%{revision: revision} = record, expected_revision, _mutation)
       when revision != expected_revision,
       do: Repo.rollback(stale_revision_changeset(record))

  defp mutate_revisioned(record, _expected_revision, mutation) do
    case mutation.(record) do
      {:ok, changed} -> changed
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp update_locked_food(ctx, food, attrs) do
    with :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]) do
      food
      |> Food.update_changeset(attrs)
      |> put_change(:revision, food.revision + 1)
      |> Repo.update()
    end
  end

  defp delete_locked_food(ctx, food) do
    with :ok <- ensure_food_not_in_use(ctx.business_id, food.id) do
      Repo.delete(food)
    end
  end

  defp finalize_food({:ok, food}, true), do: {:ok, Repo.preload(food, :media, force: true)}
  defp finalize_food({:ok, food}, false), do: {:ok, food}
  defp finalize_food({:error, reason}, _reload?), do: {:error, reason}

  # `food_id` is `ON DELETE SET NULL` everywhere, but nulling it is only safe in the
  # diary: a log entry keeps `food_name` and its frozen macros, so history survives.
  # A recipe ingredient would silently drop that food's macros from the recipe total.
  # Menu items return in a later Programming ticket; until then a food is in use
  # only when a recipe still lists it.
  defp ensure_food_not_in_use(business_id, food_id) do
    in_use? = Repo.exists?(from(ri in RecipeIngredient.for_business(business_id), where: ri.food_id == ^food_id))
    if in_use?, do: {:error, :in_use}, else: :ok
  end

  defp serving_size_attrs(serving) do
    %{
      label: serving.label,
      amount: serving.amount,
      unit: serving.unit,
      weight_g: serving.weight_g,
      is_default: serving.is_default
    }
  end

  defp stale_revision_changeset(food) do
    food
    |> change()
    |> add_error(:revision, "is stale")
    |> Map.put(:action, :stale_revision)
  end

  defp ensure_coach(%Ctx{coach_id: coach_id}) when not is_nil(coach_id), do: :ok
  defp ensure_coach(%Ctx{}), do: {:error, :not_found}

  defp get_coach(%Ctx{} = ctx) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
