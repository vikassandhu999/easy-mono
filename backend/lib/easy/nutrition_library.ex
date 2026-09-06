defmodule Easy.Nutrition.Library do
  alias Easy.CopyName
  alias Easy.Ctx
  alias Easy.LibraryMedia
  alias Easy.Nutrition.{Food, MealItem, NutrientTotals, Plan, Recipe, RecipeIngredient}
  alias Easy.Repo
  alias Easy.Utils

  import Ecto.Changeset
  import Ecto.Query

  @type portion_input() :: Easy.Nutrition.Portions.t()

  @type resolved_portion() :: %{
          required(:grams) => float() | nil,
          required(:amount) => float() | nil,
          required(:unit) => String.t() | nil,
          required(:label) => String.t() | nil
        }

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
    with :ok <- ensure_coach(ctx),
         :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]),
         {:ok, food} <-
           ctx.business_id |> Food.insert_changeset(ctx.coach_id, attrs) |> Repo.insert() do
      {:ok, Repo.preload(food, :media)}
    end
  end

  @spec update_food(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Food.t()} | {:error, :not_found | :read_only_source | Ecto.Changeset.t()}
  def update_food(%Ctx{} = ctx, food_id, expected_revision, attrs) do
    with :ok <- ensure_coach(ctx),
         {:ok, food} <-
           mutate_locked(
             Food.for_business_or_system(ctx.business_id),
             food_id,
             expected_revision,
             &update_locked_food(ctx, &1, attrs)
           ) do
      {:ok, Repo.preload(food, :media, force: true)}
    end
  end

  @spec delete_food(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Food.t()}
          | {:error, :not_found | :read_only_source | :in_use | Ecto.Changeset.t()}
  def delete_food(%Ctx{} = ctx, food_id, expected_revision) do
    with :ok <- ensure_coach(ctx) do
      mutate_locked(
        Food.for_business_or_system(ctx.business_id),
        food_id,
        expected_revision,
        &delete_locked_food/1
      )
    end
  end

  @spec get_food_impact(Ctx.t(), String.t()) ::
          {:ok, %{recipes: [map()], templates: [map()], active_client_plans: [map()]}}
          | {:error, :not_found}
  def get_food_impact(%Ctx{} = ctx, food_id) do
    with {:ok, food} <- get_food(ctx, food_id) do
      {:ok,
       Map.put(
         menu_usage(ctx.business_id, :food_id, food.id),
         :recipes,
         recipe_usage(ctx.business_id, food.id)
       )}
    end
  end

  @copied_food_fields [
    :name,
    :brand,
    :barcode,
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
    :image_url,
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

  @spec resolve_food_portion(Food.t(), portion_input()) ::
          {:ok, resolved_portion()}
          | {:error, :invalid_portion}
  def resolve_food_portion(_food, %{kind: :gram, grams: grams})
      when is_number(grams) and grams > 0 do
    {:ok, %{grams: grams / 1, amount: nil, unit: nil, label: nil}}
  end

  def resolve_food_portion(%Food{serving_sizes: sizes}, %{
        kind: :serving,
        amount: amount,
        unit: unit,
        label: label
      })
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

  # Recipes

  @spec get_recipe(Ctx.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def get_recipe(%Ctx{} = ctx, recipe_id) do
    Recipe
    |> Recipe.for_business(ctx.business_id)
    |> Recipe.include_ingredients(ctx.business_id)
    |> Repo.get(recipe_id)
    |> ok_or_not_found()
  end

  @spec list_recipes(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), recipes: [Recipe.t()]}}
  def list_recipes(%Ctx{} = ctx, opts \\ []) do
    search = String.trim(Keyword.get(opts, :search, "") || "")
    offset = Keyword.get(opts, :offset, 0)
    limit = min(Keyword.get(opts, :limit, 20), 100)

    base = Recipe |> Recipe.for_business(ctx.business_id) |> Recipe.search(search)

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
  end

  @spec create_recipe(Ctx.t(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def create_recipe(%Ctx{} = ctx, attrs) do
    {ingredients, scalar_attrs} = Map.pop(attrs, :recipe_ingredients, :unchanged)

    with :ok <- ensure_coach(ctx),
         {:ok, recipe} <- insert_recipe(ctx, scalar_attrs, ingredients) do
      get_recipe(ctx, recipe.id)
    end
  end

  @spec update_recipe(Ctx.t(), String.t(), pos_integer(), map()) ::
          {:ok, Recipe.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def update_recipe(%Ctx{} = ctx, recipe_id, expected_revision, attrs) do
    {ingredients, scalar_attrs} = Map.pop(attrs, :recipe_ingredients, :unchanged)

    with :ok <- ensure_coach(ctx),
         {:ok, recipe} <-
           mutate_locked(
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

  @spec delete_recipe(Ctx.t(), String.t(), pos_integer()) ::
          {:ok, Recipe.t()} | {:error, :not_found | :in_use | Ecto.Changeset.t()}
  def delete_recipe(%Ctx{} = ctx, recipe_id, expected_revision) do
    with :ok <- ensure_coach(ctx) do
      mutate_locked(
        Recipe.for_business(ctx.business_id),
        recipe_id,
        expected_revision,
        &delete_locked_recipe/1
      )
    end
  end

  @spec get_recipe_impact(Ctx.t(), String.t()) ::
          {:ok, %{templates: [map()], active_client_plans: [map()]}} | {:error, :not_found}
  def get_recipe_impact(%Ctx{} = ctx, recipe_id) do
    with {:ok, recipe} <- get_recipe(ctx, recipe_id) do
      {:ok, menu_usage(ctx.business_id, :recipe_id, recipe.id)}
    end
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
      |> Map.put(:name, copy_name(recipe.name, ctx.business_id))
      |> Map.put(
        :recipe_ingredients,
        Enum.map(
          recipe.recipe_ingredients,
          &%{
            food_id: &1.food_id,
            portion: %{
              kind: &1.portion_kind,
              grams: &1.weight_g,
              amount: &1.amount,
              unit: &1.unit,
              label: &1.serving_label
            }
          }
        )
      )
      |> then(&create_recipe(ctx, &1))
    end
  end

  @spec resolve_recipe_portion(Recipe.t(), portion_input()) ::
          {:ok, resolved_portion()} | {:error, :invalid_portion}
  def resolve_recipe_portion(%Recipe{servings_count: servings, cooked_weight_g: cooked}, %{
        kind: :serving,
        amount: amount,
        unit: "serving",
        label: nil
      })
      when is_integer(servings) and servings > 0 and is_number(amount) and amount > 0 do
    grams =
      case cooked do
        weight when is_number(weight) and weight > 0 -> amount / servings * weight
        _missing -> nil
      end

    {:ok, %{amount: amount / 1, grams: grams, unit: "serving", label: nil}}
  end

  def resolve_recipe_portion(%Recipe{cooked_weight_g: cooked}, %{kind: :gram, grams: grams})
      when is_number(cooked) and cooked > 0 and is_number(grams) and grams > 0 do
    {:ok, %{amount: nil, grams: grams / 1, unit: nil, label: nil}}
  end

  def resolve_recipe_portion(_recipe, _portion), do: {:error, :invalid_portion}

  @spec recipe_nutrients(Recipe.t()) :: NutrientTotals.t()
  def recipe_nutrients(%Recipe{} = recipe), do: NutrientTotals.from_recipe(recipe)

  # Item resolution

  @spec resolve_items(Ctx.t(), [item_spec()]) ::
          {:ok, [resolved_item()]} | {:error, :not_found | :invalid_portion}
  def resolve_items(%Ctx{} = ctx, items) when is_list(items) do
    foods = visible_foods_by_id(ctx, for(%{kind: :food, id: id} <- items, do: id))
    recipes = visible_recipes_by_id(ctx, for(%{kind: :recipe, id: id} <- items, do: id))

    items
    |> Enum.reduce_while({:ok, []}, fn item, {:ok, acc} ->
      case resolve_item(item, foods, recipes) do
        {:ok, resolved} -> {:cont, {:ok, [resolved | acc]}}
        {:error, reason} -> {:halt, {:error, reason}}
      end
    end)
    |> case do
      {:ok, resolved} -> {:ok, Enum.reverse(resolved)}
      {:error, reason} -> {:error, reason}
    end
  end

  # Revision-checked mutation under a row lock

  defp mutate_locked(visible_query, id, expected_revision, mutation) do
    Repo.transaction(fn ->
      visible_query
      |> lock("FOR UPDATE")
      |> Repo.get(id)
      |> mutate_revisioned(expected_revision, mutation)
    end)
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

  defp stale_revision_changeset(record) do
    record
    |> change()
    |> add_error(:revision, "is stale")
    |> Map.put(:action, :stale_revision)
  end

  # Food mutations

  defp update_locked_food(ctx, food, attrs) do
    with :ok <- LibraryMedia.authorize_attach(ctx, attrs[:media_id]) do
      food
      |> Food.update_changeset(attrs)
      |> put_change(:revision, food.revision + 1)
      |> Repo.update()
    end
  end

  # Structural rows keep restrictive FKs. Diary entries freeze name and macros, so
  # their live food_id can be cleared. Application :in_use must win before Postgres.
  defp delete_locked_food(food) do
    if food_used_structurally?(food.business_id, food.id) do
      {:error, :in_use}
    else
      Repo.delete(food)
    end
  end

  defp food_used_structurally?(business_id, food_id) do
    Repo.exists?(from(ri in RecipeIngredient.for_business(business_id), where: ri.food_id == ^food_id)) or
      Repo.exists?(from(item in MealItem.for_business(business_id), where: item.food_id == ^food_id))
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

    with :ok <- ensure_cooked_weight_removable(recipe, changeset),
         {:ok, updated} <-
           changeset
           |> put_change(:revision, recipe.revision + 1)
           |> Repo.update(),
         :ok <- replace_ingredients(ctx, updated, ingredients) do
      {:ok, updated}
    end
  end

  defp delete_locked_recipe(recipe) do
    if recipe_referenced_by_menu?(recipe.business_id, recipe.id) do
      {:error, :in_use}
    else
      Repo.delete(recipe)
    end
  end

  # A Menu gram Portion only resolves through cooked weight, so it pins the field.
  defp ensure_cooked_weight_removable(recipe, changeset) do
    if removing_cooked_weight?(recipe, changeset) and
         gram_portion_references_recipe?(recipe.business_id, recipe.id) do
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

  defp recipe_referenced_by_menu?(business_id, recipe_id) do
    Repo.exists?(from(item in MealItem.for_business(business_id), where: item.recipe_id == ^recipe_id))
  end

  defp gram_portion_references_recipe?(business_id, recipe_id) do
    Repo.exists?(
      from(item in MealItem.for_business(business_id),
        where: item.recipe_id == ^recipe_id and item.portion_kind == :gram
      )
    )
  end

  # Ingredient replacement: the request carries the complete collection, positions
  # come from its order.

  defp replace_ingredients(_ctx, _recipe, :unchanged), do: :ok

  defp replace_ingredients(ctx, recipe, ingredients) when is_list(ingredients) do
    specs = Enum.map(ingredients, &%{kind: :food, id: &1[:food_id], portion: &1[:portion]})

    with :ok <- validate_ingredient_inputs(ingredients),
         {:ok, resolved} <- resolve_items(ctx, specs) do
      changesets =
        Enum.with_index(Enum.zip(ingredients, resolved), fn {input, item}, position ->
          RecipeIngredient.insert_changeset(recipe.business_id, recipe.id, position, %{
            food_id: item.item.id,
            portion_kind: input.portion.kind,
            weight_g: item.portion.grams,
            amount: item.portion[:amount],
            unit: item.portion[:unit],
            serving_label: item.portion[:label]
          })
        end)

      replace_ingredient_rows(recipe, changesets)
    end
  end

  defp validate_ingredient_inputs(ingredients) do
    if Enum.all?(ingredients, fn input ->
         Map.keys(input) -- [:food_id, :portion] == [] and
           match?({:ok, _}, Ecto.UUID.cast(input[:food_id]))
       end), do: :ok, else: {:error, :invalid_portion}
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

  defp menu_usage(business_id, item_field, item_id) do
    %{
      templates: menu_plan_usage(business_id, item_field, item_id, :template),
      active_client_plans: menu_plan_usage(business_id, item_field, item_id, :client_plan)
    }
  end

  defp menu_plan_usage(business_id, item_field, item_id, kind) do
    from(plan in Plan.for_business(business_id),
      join: item in MealItem,
      on: item.nutrition_plan_id == plan.id and item.business_id == plan.business_id,
      where: plan.kind == ^kind,
      where: field(item, ^item_field) == ^item_id,
      distinct: true,
      order_by: [asc: plan.name, asc: plan.id],
      select: %{id: plan.id, name: plan.name, client_id: plan.client_id}
    )
    |> Repo.all()
  end

  defp copy_name(original_name, business_id) do
    existing_names =
      Recipe
      |> Recipe.for_business(business_id)
      |> select([r], r.name)
      |> Repo.all()

    CopyName.next(original_name, existing_names)
  end

  # Item resolution helpers

  defp visible_foods_by_id(_ctx, []), do: %{}

  defp visible_foods_by_id(ctx, ids) do
    Food
    |> Food.for_business_or_system(ctx.business_id)
    |> where([f], f.id in ^ids)
    |> Repo.all()
    |> Map.new(&{&1.id, &1})
  end

  defp visible_recipes_by_id(_ctx, []), do: %{}

  defp visible_recipes_by_id(ctx, ids) do
    Recipe
    |> Recipe.for_business(ctx.business_id)
    |> Recipe.include_ingredients(ctx.business_id)
    |> where([r], r.id in ^ids)
    |> Repo.all()
    |> Map.new(&{&1.id, &1})
  end

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

  # Shared guards

  defp ensure_coach(%Ctx{coach_id: coach_id}) when not is_nil(coach_id), do: :ok
  defp ensure_coach(%Ctx{}), do: {:error, :not_found}

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
