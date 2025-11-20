defmodule Easy.Nutrition do
  import Ecto.Query, warn: false

  alias Easy.Repo
  alias Easy.Utils
  alias Easy.Nutrition.{Ingredient, NutritionPlan, Recipe, Meal}

  @default_limit 50
  @max_limit 100
  @nutrition_plan_statuses Ecto.Enum.values(NutritionPlan, :status)
  @recipe_statuses Ecto.Enum.values(Recipe, :status)

  def list_nutrition_plans(business_id, params \\ %{}) do
    limit = params |> fetch_param(:limit) |> parse_integer() |> clamp_limit()
    offset = params |> fetch_param(:offset) |> parse_integer() |> normalize_offset()

    query =
      NutritionPlan
      |> where([np], np.business_id == ^business_id)
      |> order_by([np], desc: np.inserted_at)
      |> filter_plans(params)

    total = Repo.aggregate(query, :count)

    plans =
      query
      |> limit(^limit)
      |> offset(^offset)
      |> Repo.all()
      |> Repo.preload(nutrition_plan_preloads())

    {plans, %{limit: limit, offset: offset, total: total}}
  end

  def fetch_nutrition_plan(business_id, plan_id) do
    case Repo.one(
           from np in NutritionPlan,
             where: np.id == ^plan_id and np.business_id == ^business_id,
             preload: ^nutrition_plan_preloads()
         ) do
      nil -> {:error, :not_found}
      plan -> {:ok, plan}
    end
  end

  def create_nutrition_plan(business_id, coach_id, attrs) do
    attrs =
      attrs
      |> Map.put("business_id", business_id)
      |> Map.put("creator_id", coach_id)

    %NutritionPlan{}
    |> NutritionPlan.changeset(attrs)
    |> Repo.insert()
    |> handle_nutrition_plan_result()
  end

  def update_nutrition_plan(%NutritionPlan{} = plan, attrs) do
    plan
    |> NutritionPlan.changeset(attrs)
    |> Repo.update()
    |> handle_nutrition_plan_result()
  end

  def delete_nutrition_plan(%NutritionPlan{} = plan) do
    Repo.delete(plan)
  end

  def change_nutrition_plan(%NutritionPlan{} = plan, attrs \\ %{}) do
    NutritionPlan.changeset(plan, attrs)
  end

  def duplicate_nutrition_plan(business_id, plan_id, target_client_id) do
    with {:ok, original_plan} <- fetch_nutrition_plan(business_id, plan_id) do
      Repo.transaction(fn ->
        new_plan = create_plan_copy!(original_plan, business_id, target_client_id)
        copy_meals!(original_plan.meals, new_plan.id)
        Repo.preload(new_plan, nutrition_plan_preloads())
      end)
    end
  end

  def copy_day(plan_id, source_day, target_day) do
    with {:ok, plan} <- get_plan(plan_id),
         :ok <- validate_day_number(plan, source_day),
         :ok <- validate_day_number(plan, target_day) do
      Repo.transaction(fn ->
        delete_meals_for_day!(plan_id, target_day)

        plan_id
        |> list_meals_for_day(source_day)
        |> Enum.each(fn source_meal ->
          copy_meal!(source_meal, %{day_number: target_day, nutrition_plan_id: plan_id})
        end)
      end)
    end
  end

  def list_ingredients(business_id, params \\ %{}) do
    limit = params |> fetch_param(:limit) |> parse_integer() |> clamp_limit()
    offset = params |> fetch_param(:offset) |> parse_integer() |> normalize_offset()

    query =
      Ingredient
      |> where([i], i.business_id == ^business_id)
      |> order_by([i], desc: i.inserted_at)
      |> search_by_name(params)

    total = Repo.aggregate(query, :count)

    ingredients =
      query
      |> limit(^limit)
      |> offset(^offset)
      |> Repo.all()

    {ingredients, %{limit: limit, offset: offset, total: total}}
  end

  def fetch_ingredient(business_id, ingredient_id) do
    case Repo.get_by(Ingredient, id: ingredient_id, business_id: business_id) do
      nil -> {:error, :not_found}
      ingredient -> {:ok, ingredient}
    end
  end

  def create_ingredient(business_id, coach_id, attrs) do
    attrs =
      attrs
      |> Map.put("business_id", business_id)
      |> Map.put("creator_id", coach_id)

    %Ingredient{}
    |> Ingredient.changeset(attrs)
    |> Repo.insert()
  end

  def update_ingredient(%Ingredient{} = ingredient, attrs) do
    ingredient
    |> Ingredient.changeset(attrs)
    |> Repo.update()
  end

  def delete_ingredient(%Ingredient{} = ingredient) do
    Repo.delete(ingredient)
  end

  def change_ingredient(%Ingredient{} = ingredient, attrs \\ %{}) do
    Ingredient.changeset(ingredient, attrs)
  end

  def list_measurement_units do
    Repo.all(Easy.Nutrition.MeasurementUnit)
  end

  def list_recipes(business_id, params \\ %{}) do
    limit = params |> fetch_param(:limit) |> parse_integer() |> clamp_limit()
    offset = params |> fetch_param(:offset) |> parse_integer() |> normalize_offset()

    query =
      Recipe
      |> where([r], r.business_id == ^business_id)
      |> order_by([r], desc: r.inserted_at)
      |> filter_recipes(params)

    total = Repo.aggregate(query, :count)

    recipes =
      query
      |> limit(^limit)
      |> offset(^offset)
      |> Repo.all()
      |> Repo.preload([:creator, recipe_ingredients: [:ingredient, :unit]])

    {recipes, %{limit: limit, offset: offset, total: total}}
  end

  def fetch_recipe(business_id, recipe_id) do
    case Repo.one(
           from r in Recipe,
             where: r.id == ^recipe_id and r.business_id == ^business_id,
             preload: [:creator, recipe_ingredients: [:ingredient, :unit]]
         ) do
      nil -> {:error, :not_found}
      recipe -> {:ok, recipe}
    end
  end

  def create_recipe(business_id, coach_id, attrs) when is_binary(business_id) do
    attrs_with_business_and_creator =
      attrs
      |> Map.put("business_id", business_id)
      |> Map.put("creator_id", coach_id)

    create_recipe(attrs_with_business_and_creator)
  end

  def create_recipe(attrs) when is_map(attrs) do
    attrs = normalize_ingredient_orders(attrs)

    %Recipe{}
    |> Recipe.changeset(attrs)
    |> Repo.insert()
    |> handle_recipe_result()
  end

  def update_recipe(%Recipe{} = recipe, attrs) do
    attrs = normalize_ingredient_orders(attrs)

    recipe
    |> Repo.preload(:recipe_ingredients)
    |> Recipe.changeset(attrs)
    |> Repo.update()
    |> handle_recipe_result()
  end

  def change_recipe(%Recipe{} = recipe, attrs \\ %{}) do
    Recipe.changeset(recipe, attrs)
  end

  def delete_recipe(%Recipe{} = recipe) do
    Repo.delete(recipe)
  end

  def fetch_meal(business_id, meal_id) do
    Meal
    |> join(:inner, [m], np in assoc(m, :nutrition_plan))
    |> where([m, np], m.id == ^meal_id and np.business_id == ^business_id)
    |> preload([m, np], nutrition_plan: np)
    |> Repo.one()
    |> case do
      nil -> {:error, :not_found}
      meal -> {:ok, meal}
    end
  end

  def get_meal(meal_id) do
    case Repo.get(Meal, meal_id) do
      nil -> {:error, :not_found}
      meal -> {:ok, meal}
    end
  end

  def create_meal(%NutritionPlan{} = nutrition_plan, attrs) do
    attrs = Map.put(attrs, "nutrition_plan_id", nutrition_plan.id)

    %Meal{}
    |> Meal.changeset(attrs)
    |> Repo.insert()
  end

  def update_meal(%Meal{} = meal, attrs) do
    meal
    |> Meal.changeset(attrs)
    |> Repo.update()
  end

  def delete_meal(%Meal{} = meal) do
    Repo.delete(meal)
  end

  def change_meal(%Meal{} = meal, attrs \\ %{}) do
    Meal.changeset(meal, attrs)
  end

  # Query Helpers

  defp filter_plans(query, params) do
    query
    |> filter_plan_status(params)
    |> filter_plan_template(params)
    |> search_plans(params)
  end

  defp filter_plan_status(query, params) do
    case params |> fetch_param(:status) |> parse_plan_status() do
      nil -> query
      status -> where(query, [np], np.status == ^status)
    end
  end

  defp filter_plan_template(query, params) do
    case params |> fetch_param(:is_template) |> parse_boolean_param() do
      true -> where(query, [np], np.is_template == true and is_nil(np.client_id))
      false -> where(query, [np], np.is_template == false and not is_nil(np.client_id))
      _ -> query
    end
  end

  defp search_plans(query, params) do
    case params |> fetch_param(:search) |> parse_search() do
      nil -> query
      search -> where(query, [np], ilike(np.name, ^"%#{search}%"))
    end
  end

  defp filter_recipes(query, params) do
    query
    |> filter_recipe_status(params)
    |> search_by_name(params)
  end

  defp filter_recipe_status(query, params) do
    case params |> fetch_param(:status) |> parse_recipe_status() do
      nil -> query
      status -> where(query, [r], r.status == ^status)
    end
  end

  defp search_by_name(query, params) do
    case params |> fetch_param(:search) |> parse_search() do
      nil -> query
      search -> where(query, [x], ilike(x.name, ^"%#{search}%"))
    end
  end

  # Copy Helpers

  defp create_plan_copy!(original_plan, business_id, target_client_id) do
    new_plan_attrs = %{
      "name" => original_plan.name,
      "description" => original_plan.description,
      "thumbnail_url" => original_plan.thumbnail_url,
      "is_template" => false,
      "status" => :active,
      "duration_weeks" => original_plan.duration_weeks,
      "start_date" => Date.utc_today(),
      "tags" => original_plan.tags,
      "client_id" => target_client_id,
      "original_plan_id" => original_plan.id,
      "business_id" => business_id,
      "creator_id" => original_plan.creator_id
    }

    %NutritionPlan{}
    |> NutritionPlan.changeset(new_plan_attrs)
    |> Repo.insert!()
  end

  defp copy_meals!(meals, new_plan_id) do
    meals = Repo.preload(meals, :meal_items)

    Enum.each(meals, fn meal ->
      copy_meal!(meal, %{nutrition_plan_id: new_plan_id})
    end)
  end

  defp copy_meal!(original_meal, overrides) do
    meal_attrs =
      %{
        "daytime" => original_meal.daytime,
        "day_number" => original_meal.day_number,
        "label" => original_meal.label,
        "time" => original_meal.time,
        "notes" => original_meal.notes,
        "sort_order" => original_meal.sort_order,
        "nutrition_plan_id" => original_meal.nutrition_plan_id
      }
      |> Map.merge(Enum.into(overrides, %{}, fn {k, v} -> {to_string(k), v} end))

    new_meal =
      %Meal{}
      |> Meal.changeset(meal_attrs)
      |> Repo.insert!()

    copy_meal_items!(original_meal.meal_items, new_meal.id)

    new_meal
  end

  defp copy_meal_items!(items, new_meal_id) do
    Enum.each(items, fn item ->
      item_attrs = %{
        "sort_order" => item.sort_order,
        "servings" => item.servings,
        "recipe_id" => item.recipe_id,
        "meal_id" => new_meal_id
      }

      %Easy.Nutrition.MealItem{}
      |> Easy.Nutrition.MealItem.changeset(item_attrs)
      |> Repo.insert!()
    end)
  end

  defp delete_meals_for_day!(plan_id, day_number) do
    from(m in Meal, where: m.nutrition_plan_id == ^plan_id and m.day_number == ^day_number)
    |> Repo.delete_all()
  end

  defp list_meals_for_day(plan_id, day_number) do
    Repo.all(
      from m in Meal,
        where: m.nutrition_plan_id == ^plan_id and m.day_number == ^day_number,
        preload: [meal_items: :recipe]
    )
  end

  defp handle_recipe_result({:ok, recipe}), do: {:ok, repo_preload_recipe(recipe)}
  defp handle_recipe_result({:error, changeset}), do: {:error, changeset}

  defp normalize_ingredient_orders(%{} = attrs) do
    cond do
      Map.has_key?(attrs, :recipe_ingredients) ->
        Map.update!(attrs, :recipe_ingredients, &inject_default_orders/1)

      Map.has_key?(attrs, "recipe_ingredients") ->
        Map.update!(attrs, "recipe_ingredients", &inject_default_orders/1)

      true ->
        attrs
    end
  end

  defp normalize_ingredient_orders(attrs), do: attrs

  defp inject_default_orders(ingredients) when is_list(ingredients) do
    ingredients
    |> Enum.with_index()
    |> Enum.map(fn {ingredient_attrs, index} ->
      if order_present?(ingredient_attrs) do
        ingredient_attrs
      else
        maybe_put_order(ingredient_attrs, index)
      end
    end)
  end

  defp inject_default_orders(ingredients), do: ingredients

  defp order_present?(%{} = attrs) do
    present?(attrs, :order) || present?(attrs, "order")
  end

  defp order_present?(_), do: true

  defp present?(attrs, key) do
    Map.has_key?(attrs, key) && not is_nil(Map.get(attrs, key))
  end

  defp maybe_put_order(%{} = attrs, index) do
    key = if has_atom_keys?(attrs), do: :order, else: "order"
    Map.put(attrs, key, index)
  end

  defp maybe_put_order(value, _index), do: value

  defp has_atom_keys?(attrs) do
    Enum.any?(Map.keys(attrs), &is_atom/1)
  end

  defp repo_preload_recipe(recipe) do
    Repo.preload(recipe, [
      :business,
      :creator,
      recipe_ingredients: [:ingredient, :unit]
    ])
  end

  defp meal_items_ordered_query do
    from(mi in Easy.Nutrition.MealItem, order_by: [asc: mi.sort_order])
  end

  defp nutrition_plan_preloads do
    [
      meals:
        {from(m in Meal, order_by: [asc: m.day_number, asc: m.sort_order]),
         [
           meal_items: {meal_items_ordered_query(), [:recipe]}
         ]}
    ]
  end

  defp handle_nutrition_plan_result({:ok, plan}) do
    {:ok, Repo.preload(plan, nutrition_plan_preloads())}
  end

  defp handle_nutrition_plan_result({:error, changeset}), do: {:error, changeset}

  defp fetch_param(params, key) when is_atom(key) do
    Map.get(params, key) || Map.get(params, Atom.to_string(key))
  end

  defp parse_plan_status(status) when is_atom(status) do
    if status in @nutrition_plan_statuses, do: status, else: nil
  end

  defp parse_plan_status(status) when is_binary(status) do
    status
    |> String.trim()
    |> String.downcase()
    |> case do
      "" ->
        nil

      value ->
        Enum.find(@nutrition_plan_statuses, fn allowed -> Atom.to_string(allowed) == value end)
    end
  end

  defp parse_plan_status(_), do: nil

  defp parse_boolean_param(value) do
    case Utils.parse_boolean(value) do
      true -> true
      false -> false
      _ -> nil
    end
  end

  defp parse_integer(value) when is_integer(value), do: value
  defp parse_integer(value) when is_binary(value), do: Utils.safe_int(value)
  defp parse_integer(_), do: nil

  defp clamp_limit(nil), do: @default_limit

  defp clamp_limit(limit) when is_integer(limit) do
    limit
    |> max(1)
    |> min(@max_limit)
  end

  defp normalize_offset(nil), do: 0

  defp normalize_offset(offset) when is_integer(offset) do
    max(offset, 0)
  end

  defp parse_search(nil), do: nil
  defp parse_search(search) when is_binary(search), do: Utils.parse_search(search)
  defp parse_search(_), do: nil

  defp parse_recipe_status(status) when is_atom(status) do
    if status in @recipe_statuses, do: status, else: nil
  end

  defp parse_recipe_status(status) when is_binary(status) do
    status
    |> String.trim()
    |> String.downcase()
    |> case do
      "" ->
        nil

      value ->
        Enum.find(@recipe_statuses, fn allowed -> Atom.to_string(allowed) == value end)
    end
  end

  def create_meal_item(%Meal{} = meal, attrs) do
    attrs = Map.put(attrs, "meal_id", meal.id)

    %Easy.Nutrition.MealItem{}
    |> Easy.Nutrition.MealItem.changeset(attrs)
    |> Repo.insert()
  end

  def list_meal_items(%Meal{} = meal) do
    Repo.all(
      from mi in meal_items_ordered_query(),
        where: mi.meal_id == ^meal.id,
        preload: [:recipe]
    )
  end

  def fetch_meal_item(business_id, item_id) do
    query =
      from mi in Easy.Nutrition.MealItem,
        join: m in assoc(mi, :meal),
        join: p in assoc(m, :nutrition_plan),
        where: mi.id == ^item_id and p.business_id == ^business_id,
        preload: [:recipe]

    case Repo.one(query) do
      nil -> {:error, :not_found}
      item -> {:ok, item}
    end
  end

  def update_meal_item(%Easy.Nutrition.MealItem{} = item, attrs) do
    item
    |> Easy.Nutrition.MealItem.changeset(attrs)
    |> Repo.update()
  end

  def delete_meal_item(%Easy.Nutrition.MealItem{} = item) do
    Repo.delete(item)
  end

  def reorder_meal_items(%Meal{} = meal, item_ids) do
    Repo.transaction(fn ->
      Enum.with_index(item_ids)
      |> Enum.each(fn {id, index} ->
        from(mi in Easy.Nutrition.MealItem, where: mi.id == ^id and mi.meal_id == ^meal.id)
        |> Repo.update_all(set: [sort_order: index])
      end)
    end)

    :ok
  end

  def copy_meal_to_day(%Meal{} = meal, target_day) do
    Repo.transaction(fn ->
      copy_meal!(meal, %{day_number: target_day})
    end)
  end

  defp get_plan(plan_id) do
    case Repo.get(NutritionPlan, plan_id) do
      nil -> {:error, :not_found}
      plan -> {:ok, plan}
    end
  end

  defp validate_day_number(plan, day) do
    max_days = (plan.duration_weeks || 1) * 7

    if day >= 1 and day <= max_days do
      :ok
    else
      {:error, :invalid_day_number}
    end
  end

  # Phase 1 Features

  @doc """
  Generates a shopping list by aggregating all ingredients across all meals in a nutrition plan.
  Returns a list of ingredients with total quantities needed.
  """
  def generate_shopping_list(plan_id) do
    query =
      from mi in Easy.Nutrition.MealItem,
        join: m in assoc(mi, :meal),
        join: r in assoc(mi, :recipe),
        join: ri in Easy.Nutrition.RecipeIngredient,
        on: ri.recipe_id == r.id,
        join: ing in assoc(ri, :ingredient),
        left_join: u in assoc(ri, :unit),
        where: m.nutrition_plan_id == ^plan_id and not is_nil(ri.quantity),
        group_by: [ing.id, ing.name, u.id, u.name],
        select: %{
          ingredient_id: ing.id,
          ingredient_name: ing.name,
          total_quantity:
            sum(
              fragment(
                "COALESCE(?, 0) * COALESCE(?, 0) / COALESCE(NULLIF(?, 0), 1)",
                ri.quantity,
                mi.servings,
                r.servings
              )
            ),
          unit_id: u.id,
          unit_name: u.name
        },
        order_by: ing.name

    items = Repo.all(query)

    {:ok,
     Enum.map(items, fn item ->
       %{
         ingredient_id: item.ingredient_id,
         ingredient_name: item.ingredient_name,
         total_quantity: Decimal.to_float(item.total_quantity || Decimal.new(0)),
         unit: item.unit_name || "unit"
       }
     end)}
  end

  @doc """
  Reorders meals within a specific day of a nutrition plan.
  Updates sort_order for each meal in the specified day.
  """
  def reorder_meals(plan_id, day_number, meal_ids) when is_list(meal_ids) do
    Repo.transaction(fn ->
      Enum.with_index(meal_ids)
      |> Enum.each(fn {meal_id, index} ->
        from(m in Meal,
          where:
            m.id == ^meal_id and m.nutrition_plan_id == ^plan_id and
              m.day_number == ^day_number
        )
        |> Repo.update_all(set: [sort_order: index])
      end)
    end)

    :ok
  end

  @doc """
  Creates multiple meals in bulk based on a template.
  Templates define the structure (breakfast, lunch, dinner, snack).
  """
  def bulk_create_meals(plan, params) do
    template = params["template"] || "standard"
    days = params["days"] || []

    meal_templates = get_meal_template(template)

    Repo.transaction(fn ->
      for day <- days, meal_def <- meal_templates do
        attrs = %{
          "daytime" => meal_def.daytime,
          "day_number" => day,
          "label" => meal_def.label,
          "sort_order" => meal_def.sort_order
        }

        case create_meal(plan, attrs) do
          {:ok, _meal} -> :ok
          error -> Repo.rollback(error)
        end
      end
    end)
  end

  defp get_meal_template("standard") do
    [
      %{daytime: :breakfast, label: "Breakfast", sort_order: 0},
      %{daytime: :snack, label: "Morning Snack", sort_order: 1},
      %{daytime: :lunch, label: "Lunch", sort_order: 2},
      %{daytime: :snack, label: "Afternoon Snack", sort_order: 3},
      %{daytime: :dinner, label: "Dinner", sort_order: 4}
    ]
  end

  defp get_meal_template("simple") do
    [
      %{daytime: :breakfast, label: "Breakfast", sort_order: 0},
      %{daytime: :lunch, label: "Lunch", sort_order: 1},
      %{daytime: :dinner, label: "Dinner", sort_order: 2}
    ]
  end

  defp get_meal_template(_), do: get_meal_template("standard")

  @doc """
  Calculates macro totals for a nutrition plan.
  Can filter by specific day or aggregate across all days.
  """
  def calculate_plan_macros(plan_id, opts \\ %{}) do
    day_number = opts[:day_number]
    aggregate = opts[:aggregate] || :daily

    query =
      from m in Meal,
        join: mi in assoc(m, :meal_items),
        join: r in assoc(mi, :recipe),
        where: m.nutrition_plan_id == ^plan_id,
        group_by: m.day_number,
        order_by: m.day_number,
        select: %{
          day_number: m.day_number,
          calories:
            sum(
              fragment(
                "COALESCE(?, 0) * COALESCE(?, 0) / COALESCE(NULLIF(?, 0), 1)",
                r.total_calories,
                mi.servings,
                r.servings
              )
            ),
          protein:
            sum(
              fragment(
                "COALESCE(?, 0) * COALESCE(?, 0) / COALESCE(NULLIF(?, 0), 1)",
                r.total_protein,
                mi.servings,
                r.servings
              )
            ),
          carbs:
            sum(
              fragment(
                "COALESCE(?, 0) * COALESCE(?, 0) / COALESCE(NULLIF(?, 0), 1)",
                r.total_carbohydrates,
                mi.servings,
                r.servings
              )
            ),
          fat:
            sum(
              fragment(
                "COALESCE(?, 0) * COALESCE(?, 0) / COALESCE(NULLIF(?, 0), 1)",
                r.total_fats,
                mi.servings,
                r.servings
              )
            ),
          fiber:
            sum(
              fragment(
                "COALESCE(?, 0) * COALESCE(?, 0) / COALESCE(NULLIF(?, 0), 1)",
                r.total_fiber,
                mi.servings,
                r.servings
              )
            )
        }

    query =
      if day_number do
        where(query, [m], m.day_number == ^day_number)
      else
        query
      end

    results = Repo.all(query)

    case aggregate do
      :daily -> {:ok, format_daily_macros(results)}
      :total -> {:ok, format_total_macros(results)}
      _ -> {:ok, format_daily_macros(results)}
    end
  end

  defp format_daily_macros(results) do
    Enum.map(results, fn day ->
      %{
        day: day.day_number,
        calories: to_float(day.calories),
        protein: to_float(day.protein),
        carbs: to_float(day.carbs),
        fat: to_float(day.fat),
        fiber: to_float(day.fiber)
      }
    end)
  end

  defp format_total_macros(results) do
    total =
      Enum.reduce(
        results,
        %{
          calories: Decimal.new(0),
          protein: Decimal.new(0),
          carbs: Decimal.new(0),
          fat: Decimal.new(0),
          fiber: Decimal.new(0)
        },
        fn day, acc ->
          %{
            calories: Decimal.add(acc.calories, day.calories || Decimal.new(0)),
            protein: Decimal.add(acc.protein, day.protein || Decimal.new(0)),
            carbs: Decimal.add(acc.carbs, day.carbs || Decimal.new(0)),
            fat: Decimal.add(acc.fat, day.fat || Decimal.new(0)),
            fiber: Decimal.add(acc.fiber, day.fiber || Decimal.new(0))
          }
        end
      )

    %{
      calories: Decimal.to_float(total.calories),
      protein: Decimal.to_float(total.protein),
      carbs: Decimal.to_float(total.carbs),
      fat: Decimal.to_float(total.fat),
      fiber: Decimal.to_float(total.fiber)
    }
  end

  defp to_float(nil), do: 0.0

  defp to_float(decimal) when is_struct(decimal, Decimal) do
    Decimal.to_float(decimal)
  end

  defp to_float(value) when is_float(value), do: value
  defp to_float(value) when is_integer(value), do: value * 1.0
  defp to_float(_), do: 0.0
end
