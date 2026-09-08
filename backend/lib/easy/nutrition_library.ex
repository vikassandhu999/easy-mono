defmodule Easy.Nutrition.Library do
  alias Easy.CopyName
  alias Easy.Ctx
  alias Easy.LibraryMedia
  alias Easy.Nutrition.{Food, NutrientTotals, Portions, Programming, Recipe, RecipeIngredient}
  alias Easy.Repo
  alias Easy.Revision
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  @type portion_input() :: Easy.Nutrition.Portions.t()

  @type resolved_portion() :: Easy.Nutrition.Portions.t()

  @type item_spec() :: %{
          required(:kind) => :food | :recipe,
          required(:id) => String.t(),
          required(:portion) => portion_input()
        }

  @type resolved_item() :: %{
          required(:kind) => :food | :recipe,
          required(:item) => Food.t() | Recipe.t(),
          required(:portion) => resolved_portion(),
          required(:nutrients) => NutrientTotals.t()
        }

  @type resolved_items() :: %{item_spec() => resolved_item()}

  # Foods

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
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)

    base =
      Food
      |> Food.for_business_or_system(ctx.business_id)
      |> Food.search(search)
      |> Food.for_categories(Keyword.get(opts, :categories))

    # `Food.search` orders by rank; only unsearched listings need an order.
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
    with :ok <- Ctx.ensure_coach(ctx),
         :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]),
         {:ok, food} <-
           ctx.business_id |> Food.insert_changeset(ctx.coach_id, attrs) |> Repo.insert() do
      {:ok, Repo.preload(food, :media)}
    end
  end

  @spec update_food(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Food.t()} | {:error, :not_found | :read_only_source | Ecto.Changeset.t()}
  def update_food(%Ctx{} = ctx, food_id, expected_revision, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, food} <-
           Revision.locked(
             Food.for_business_or_system(ctx.business_id),
             food_id,
             expected_revision,
             &update_locked_food(ctx, &1, attrs)
           ) do
      {:ok, Repo.preload(food, :media, force: true)}
    end
  end

  @spec delete_food(Ctx.t(), String.t()) ::
          {:ok, Food.t()}
          | {:error, :not_found | :read_only_source | :in_use | Ecto.Changeset.t()}
  def delete_food(%Ctx{} = ctx, food_id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Revision.locked(
        Food.for_business_or_system(ctx.business_id),
        food_id,
        :any,
        &delete_locked_food(ctx, &1)
      )
    end
  end

  @spec get_food_impact(Ctx.t(), String.t()) ::
          {:ok, %{recipes: [map()], templates: [map()], client_plans: [map()]}}
          | {:error, :not_found}
  def get_food_impact(%Ctx{} = ctx, food_id) do
    Repo.snapshot(fn ->
      with {:ok, food} <- get_food(ctx, food_id) do
        {:ok,
         Map.put(
           menu_usage(ctx, :food, food.id),
           :recipes,
           recipe_usage(ctx.business_id, food.id)
         )}
      end
    end)
  end

  @copied_food_fields [
    :name,
    :brand,
    :category,
    :calories_per_100g,
    :protein_g_per_100g,
    :carbs_g_per_100g,
    :fat_g_per_100g,
    :fiber_g_per_100g,
    :sugar_g_per_100g,
    :allergens,
    :dietary_tags,
    :notes,
    :media_id
  ]

  @spec copy_food(Ctx.t(), String.t()) ::
          {:ok, Food.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_food(%Ctx{} = ctx, food_id) do
    with {:ok, food} <- get_food(ctx, food_id) do
      serving_sizes =
        Enum.map(
          food.serving_sizes,
          &Map.take(&1, [:label, :amount, :unit, :weight_g, :is_default])
        )

      food
      |> Map.take(@copied_food_fields)
      |> Map.put(:serving_sizes, serving_sizes)
      |> then(&create_food(ctx, &1))
    end
  end

  # Recipes

  @spec get_recipe(Ctx.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def get_recipe(%Ctx{} = ctx, recipe_id) do
    Repo.snapshot(fn ->
      Recipe
      |> Recipe.for_business(ctx.business_id)
      |> Recipe.include_ingredients(ctx.business_id)
      |> Repo.get(recipe_id)
      |> ok_or_not_found()
    end)
  end

  @spec list_recipes(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), recipes: [Recipe.t()]}}
  def list_recipes(%Ctx{} = ctx, opts \\ []) do
    search = String.trim(Keyword.get(opts, :search, "") || "")
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)
    base = Recipe |> Recipe.for_business(ctx.business_id) |> Recipe.search(search)

    Repo.snapshot(fn ->
      {:ok,
       %{
         count: Repo.aggregate(base, :count, :id),
         recipes:
           base
           |> Recipe.newest()
           |> Utils.paginate(offset, limit)
           |> Recipe.include_ingredients(ctx.business_id)
           |> Repo.all()
       }}
    end)
  end

  @spec create_recipe(Ctx.t(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_recipe(%Ctx{} = ctx, attrs) do
    {ingredients, scalar_attrs} = Map.pop(attrs, :recipe_ingredients, :unchanged)

    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, recipe} <- insert_recipe(ctx, scalar_attrs, ingredients) do
      get_recipe(ctx, recipe.id)
    end
  end

  @spec update_recipe(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_recipe(%Ctx{} = ctx, recipe_id, expected_revision, attrs) do
    {ingredients, scalar_attrs} = Map.pop(attrs, :recipe_ingredients, :unchanged)

    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, recipe} <-
           Revision.locked(
             Recipe.for_business(ctx.business_id),
             recipe_id,
             expected_revision,
             fn recipe ->
               update_locked_recipe(ctx, recipe, scalar_attrs, ingredients)
             end
           ) do
      get_recipe(ctx, recipe.id)
    end
  end

  @spec delete_recipe(Ctx.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, :not_found | :in_use | Ecto.Changeset.t()}
  def delete_recipe(%Ctx{} = ctx, recipe_id) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Revision.locked(
        Recipe.for_business(ctx.business_id),
        recipe_id,
        :any,
        &delete_locked_recipe(ctx, &1)
      )
    end
  end

  @spec get_recipe_impact(Ctx.t(), String.t()) ::
          {:ok, %{templates: [map()], client_plans: [map()]}} | {:error, :not_found}
  def get_recipe_impact(%Ctx{} = ctx, recipe_id) do
    Repo.snapshot(fn ->
      with {:ok, recipe} <- get_recipe(ctx, recipe_id) do
        {:ok, menu_usage(ctx, :recipe, recipe.id)}
      end
    end)
  end

  @spec copy_recipe(Ctx.t(), String.t()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def copy_recipe(%Ctx{} = ctx, recipe_id) do
    with {:ok, recipe} <- get_recipe(ctx, recipe_id) do
      recipe
      |> Map.take([
        :description,
        :instructions,
        :servings_count,
        :cooked_weight_g,
        :allergens,
        :dietary_tags
      ])
      |> Map.put(:name, CopyName.next(recipe.name, Repo.all(from(r in Recipe.for_business(ctx.business_id), select: r.name))))
      |> Map.put(
        :recipe_ingredients,
        Enum.map(
          recipe.recipe_ingredients,
          &%{food_id: &1.food_id, portion: Portions.format(&1.portion)}
        )
      )
      |> then(&create_recipe(ctx, &1))
    end
  end

  @spec recipe_nutrients(Recipe.t()) :: NutrientTotals.t()
  def recipe_nutrients(%Recipe{} = recipe), do: NutrientTotals.from_recipe(recipe)

  # Item resolution

  @spec item_kind(map()) :: :food | :recipe
  def item_kind(%{food_id: id}) when is_binary(id), do: :food
  def item_kind(%{recipe_id: id}) when is_binary(id), do: :recipe

  @spec resolve_items(Ctx.t(), [item_spec()]) ::
          {:ok, resolved_items()} | {:error, :not_found | :invalid_portion | :conflict}
  def resolve_items(ctx, items), do: Repo.snapshot(fn -> resolve(ctx, items, false) end)

  @spec resolve_items_for_write(Ctx.t(), [item_spec()]) ::
          {:ok, resolved_items()} | {:error, :not_found | :invalid_portion}
  def resolve_items_for_write(ctx, items) do
    true = Repo.in_transaction?()
    resolve(ctx, items, true)
  end

  @spec available_items(Ctx.t(), [map()]) :: {:ok, MapSet.t()}
  def available_items(_ctx, []), do: {:ok, MapSet.new()}

  def available_items(ctx, items) do
    food_ids = Enum.flat_map(items, &List.wrap(&1.food_id))
    recipe_ids = Enum.flat_map(items, &List.wrap(&1.recipe_id))
    foods = Food.for_business_or_system(ctx.business_id) |> where([f], f.id in ^food_ids) |> select([f], f.id) |> Repo.all()
    recipes = Recipe.for_business(ctx.business_id) |> where([r], r.id in ^recipe_ids) |> select([r], r.id) |> Repo.all()
    {:ok, MapSet.new(Enum.map(foods, &{:food, &1}) ++ Enum.map(recipes, &{:recipe, &1}))}
  end

  defp resolve(_ctx, [], _lock?), do: {:ok, %{}}

  defp resolve(ctx, items, lock?) do
    recipe_ids = for %{kind: :recipe, id: id} <- items, do: id
    recipes = Recipe.for_business(ctx.business_id) |> where([r], r.id in ^recipe_ids) |> ordered_read(lock?)
    ingredients = RecipeIngredient.for_business(ctx.business_id) |> where([i], i.recipe_id in ^recipe_ids) |> Repo.all()
    food_ids = Enum.map(ingredients, & &1.food_id) ++ for(%{kind: :food, id: id} <- items, do: id)
    foods = Food.for_business_or_system(ctx.business_id) |> where([f], f.id in ^food_ids) |> ordered_read(lock?) |> Map.new(&{&1.id, &1})
    ingredients = Enum.group_by(ingredients, & &1.recipe_id, &%{&1 | food: Map.get(foods, &1.food_id)})
    recipes = Map.new(recipes, &{&1.id, %{&1 | recipe_ingredients: Map.get(ingredients, &1.id, [])}})

    items
    |> Enum.uniq()
    |> Enum.reduce_while({:ok, %{}}, fn spec, {:ok, resolved} ->
      case resolve_item(spec, foods, recipes) do
        {:ok, item} -> {:cont, {:ok, Map.put(resolved, spec, item)}}
        error -> {:halt, error}
      end
    end)
  end

  defp ordered_read(query, lock?) do
    query = order_by(query, [row], asc: row.id)
    query = if lock?, do: lock(query, "FOR SHARE"), else: query
    Repo.all(query)
  end

  # Food mutations

  defp update_locked_food(_ctx, %Food{source: :system}, _attrs), do: {:error, :read_only_source}

  defp update_locked_food(ctx, food, attrs) do
    with :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]),
         :ok <- protect_serving_references(ctx, food, attrs) do
      food
      |> Food.update_changeset(attrs)
      |> put_change(:revision, food.revision + 1)
      |> Repo.update()
    end
  end

  defp protect_serving_references(_ctx, _food, attrs) when not is_map_key(attrs, :serving_sizes), do: :ok

  defp protect_serving_references(ctx, food, attrs) do
    sizes = attrs.serving_sizes
    removed = Enum.reject(food.serving_sizes, fn stored -> Enum.any?(sizes, &(&1.unit == stored.unit and &1.label == stored.label)) end)
    if Enum.any?(removed, &serving_used?(ctx, food.id, &1)), do: {:error, :in_use}, else: :ok
  end

  defp serving_used?(ctx, food_id, size) do
    portion = %{kind: :serving, unit: size.unit, label: size.label}

    Programming.library_item_used?(ctx, :food, food_id, portion) or
      Repo.exists?(
        from(i in RecipeIngredient.for_business(ctx.business_id),
          where: i.food_id == ^food_id and fragment("? @> ?::jsonb", i.portion, ^portion)
        )
      )
  end

  # The Library row lock serializes menu references against deletion.
  defp delete_locked_food(_ctx, %Food{source: :system}), do: {:error, :read_only_source}

  defp delete_locked_food(ctx, food) do
    if food_used_structurally?(ctx, food.id) do
      {:error, :in_use}
    else
      Repo.delete(food)
    end
  end

  defp food_used_structurally?(ctx, food_id) do
    Programming.library_item_used?(ctx, :food, food_id) or
      Repo.exists?(from(ri in RecipeIngredient.for_business(ctx.business_id), where: ri.food_id == ^food_id))
  end

  # Recipe mutations

  defp insert_recipe(ctx, scalar_attrs, ingredients) do
    Repo.transaction(fn ->
      with {:ok, recipe} <-
             ctx.business_id |> Recipe.insert_changeset(ctx.coach_id, scalar_attrs) |> Repo.insert(),
           :ok <- replace_ingredients(ctx, recipe, ingredients) do
        recipe
      else
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
  end

  defp update_locked_recipe(ctx, recipe, scalar_attrs, ingredients) do
    changeset = Recipe.update_changeset(recipe, scalar_attrs)

    with :ok <- ensure_cooked_weight_removable(ctx, recipe, changeset),
         {:ok, updated} <-
           changeset
           |> put_change(:revision, recipe.revision + 1)
           |> Repo.update(),
         :ok <- replace_ingredients(ctx, updated, ingredients) do
      {:ok, updated}
    end
  end

  defp delete_locked_recipe(ctx, recipe) do
    if recipe_referenced_by_menu?(ctx, recipe.id) do
      {:error, :in_use}
    else
      Repo.delete(recipe)
    end
  end

  # A Menu gram Portion only resolves through cooked weight, so it pins the field.
  defp ensure_cooked_weight_removable(ctx, recipe, changeset) do
    if removing_cooked_weight?(recipe, changeset) and
         gram_portion_references_recipe?(ctx, recipe.id) do
      {:error, :in_use}
    else
      :ok
    end
  end

  defp removing_cooked_weight?(%{cooked_weight_g: cooked}, changeset)
       when is_number(cooked) and cooked > 0 do
    fetch_change(changeset, :cooked_weight_g) == {:ok, nil}
  end

  defp removing_cooked_weight?(_recipe, _changeset), do: false

  defp recipe_referenced_by_menu?(ctx, recipe_id), do: Programming.library_item_used?(ctx, :recipe, recipe_id)

  defp gram_portion_references_recipe?(ctx, recipe_id),
    do: Programming.library_item_used?(ctx, :recipe, recipe_id, %{kind: :gram})

  # Ingredient replacement: the request carries the complete collection, positions
  # come from its order.

  defp replace_ingredients(_ctx, _recipe, :unchanged), do: :ok

  defp replace_ingredients(ctx, recipe, ingredients) when is_list(ingredients) do
    specs = Enum.map(ingredients, &%{kind: :food, id: &1[:food_id], portion: &1[:portion]})

    with {:ok, resolved} <- resolve_items_for_write(ctx, specs) do
      changesets =
        Enum.with_index(specs, fn spec, position ->
          item = Map.fetch!(resolved, spec)

          RecipeIngredient.insert_changeset(recipe.business_id, recipe.id, position, %{
            food_id: item.item.id,
            portion: Portions.format(item.portion)
          })
        end)

      replace_ingredient_rows(recipe, changesets)
    end
  end

  defp replace_ingredient_rows(recipe, changesets) do
    if Enum.any?(changesets, &(not &1.valid?)) do
      {:error, ingredient_errors(recipe, changesets)}
    else
      Repo.delete_all(
        from(ri in RecipeIngredient.for_business(recipe.business_id),
          where: ri.recipe_id == ^recipe.id
        )
      )

      insert_ingredients(changesets)
    end
  end

  defp insert_ingredients(changesets) do
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

  # Impact queries

  defp recipe_usage(business_id, food_id) do
    from(recipe in Recipe.for_business(business_id),
      join: ingredient in RecipeIngredient,
      on: ingredient.recipe_id == recipe.id and ingredient.business_id == recipe.business_id,
      where: ingredient.food_id == ^food_id,
      distinct: true,
      order_by: [asc: recipe.name, asc: recipe.id],
      select: %{id: recipe.id, name: recipe.name}
    )
    |> Repo.all()
  end

  defp menu_usage(ctx, kind, id) do
    plans = Programming.library_usage(ctx, kind, id)

    %{
      templates: plans |> Enum.filter(&(&1.kind == :template)) |> Enum.map(&Map.delete(&1, :kind)),
      client_plans: plans |> Enum.filter(&(&1.kind == :client_plan)) |> Enum.map(&Map.delete(&1, :kind))
    }
  end

  # Item resolution helpers

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

  # Shared guards

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
