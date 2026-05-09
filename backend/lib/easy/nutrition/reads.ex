defmodule Easy.Nutrition.Reads do
  alias Easy.Clients.Client
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanItem
  alias Easy.Nutrition.Recipe
  alias Easy.Repo

  import Ecto.Query

  @spec fetch_client(String.t(), String.t()) :: {:ok, Client.t()} | {:error, :not_found}
  def fetch_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  @spec fetch_visible_food(String.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found}
  def fetch_visible_food(business_id, food_id) do
    Food
    |> Food.for_business_or_system(business_id)
    |> Repo.get(food_id)
    |> ok_or_not_found()
  end

  @spec fetch_business_food(String.t(), String.t()) :: {:ok, Food.t()} | {:error, :not_found}
  def fetch_business_food(business_id, food_id) do
    Food
    |> Food.for_business(business_id)
    |> Repo.get(food_id)
    |> ok_or_not_found()
  end

  @spec list_visible_foods(String.t(), String.t(), non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), foods: [Food.t()]}}
  def list_visible_foods(business_id, search, offset, limit) do
    search = String.trim(search || "")
    base = Food |> Food.for_business_or_system(business_id) |> Food.search(search)
    ordered = if search == "", do: Food.newest(base), else: base

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       foods: ordered |> Easy.Utils.paginate(offset, limit) |> Repo.all()
     }}
  end

  @spec fetch_recipe(String.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def fetch_recipe(business_id, recipe_id) do
    Recipe
    |> Recipe.for_business(business_id)
    |> Recipe.with_ingredients()
    |> Repo.get(recipe_id)
    |> ok_or_not_found()
  end

  @spec fetch_recipe_plain(String.t(), String.t()) :: {:ok, Recipe.t()} | {:error, :not_found}
  def fetch_recipe_plain(business_id, recipe_id) do
    Recipe
    |> Recipe.for_business(business_id)
    |> Repo.get(recipe_id)
    |> ok_or_not_found()
  end

  @spec list_recipes(String.t(), String.t(), non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), recipes: [Recipe.t()]}}
  def list_recipes(business_id, search, offset, limit) do
    search = String.trim(search || "")
    base = Recipe |> Recipe.for_business(business_id) |> Recipe.search(search)
    ordered = if search == "", do: Recipe.newest(base), else: base

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       recipes:
         ordered
         |> Easy.Utils.paginate(offset, limit)
         |> Recipe.with_ingredients()
         |> Repo.all()
     }}
  end

  @spec fetch_plan(String.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def fetch_plan(business_id, plan_id) do
    Plan
    |> Plan.for_business(business_id)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec fetch_plan_full(String.t(), String.t()) :: {:ok, Plan.t()} | {:error, :not_found}
  def fetch_plan_full(business_id, plan_id) do
    Plan
    |> Plan.for_business(business_id)
    |> Plan.with_meals()
    |> Plan.with_plan_items()
    |> preload(:client)
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec list_template_plans(String.t(), atom() | nil, non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}}
  def list_template_plans(business_id, status, offset, limit) do
    base =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.with_status(status)
      |> Plan.templates()

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       plans: base |> Plan.newest() |> Easy.Utils.paginate(offset, limit) |> Repo.all()
     }}
  end

  @spec list_client_plans(String.t(), String.t(), atom() | nil, non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), plans: [Plan.t()]}}
  def list_client_plans(business_id, client_id, status, offset, limit) do
    base =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.for_client(client_id)
      |> Plan.with_status(status)

    {:ok,
     %{
       count: Repo.aggregate(base, :count, :id),
       plans: base |> Plan.newest() |> Easy.Utils.paginate(offset, limit) |> Repo.all()
     }}
  end

  @spec fetch_client_plan_full(String.t(), String.t(), String.t()) ::
          {:ok, Plan.t()} | {:error, :not_found}
  def fetch_client_plan_full(business_id, client_id, plan_id) do
    Plan
    |> Plan.for_business(business_id)
    |> Plan.for_client(client_id)
    |> Plan.with_meals()
    |> Plan.with_plan_items()
    |> Repo.get(plan_id)
    |> ok_or_not_found()
  end

  @spec fetch_active_plan_day(String.t(), String.t(), Date.t()) ::
          {:ok, %{date: Date.t(), day: String.t(), plan: Plan.t(), plan_items: [PlanItem.t()]}}
          | {:error, :not_found}
  def fetch_active_plan_day(business_id, client_id, date) do
    case active_plan(business_id, client_id, date) do
      nil ->
        {:error, :not_found}

      plan ->
        day = Easy.Utils.weekday_name(date)

        plan_items =
          PlanItem
          |> PlanItem.for_plan(plan.id)
          |> PlanItem.for_business(business_id)
          |> PlanItem.for_day(day)
          |> PlanItem.with_meal_and_items()
          |> Repo.all()

        {:ok, %{plan: plan, plan_items: plan_items, date: date, day: day}}
    end
  end

  @spec fetch_meal(String.t(), String.t()) :: {:ok, Meal.t()} | {:error, :not_found}
  def fetch_meal(business_id, meal_id) do
    Meal
    |> Meal.for_business(business_id)
    |> Repo.get(meal_id)
    |> ok_or_not_found()
  end

  @spec fetch_meal_with_items(String.t(), String.t()) :: {:ok, Meal.t()} | {:error, :not_found}
  def fetch_meal_with_items(business_id, meal_id) do
    Meal
    |> Meal.for_business(business_id)
    |> Meal.with_items()
    |> Repo.get(meal_id)
    |> ok_or_not_found()
  end

  @spec list_meals(String.t(), String.t(), non_neg_integer(), pos_integer()) ::
          {:ok, %{count: non_neg_integer(), meals: [Meal.t()]}} | {:error, :not_found}
  def list_meals(business_id, plan_id, offset, limit) do
    with {:ok, plan} <- fetch_plan(business_id, plan_id) do
      base = Meal |> Meal.for_business(business_id) |> Meal.for_plan(plan.id)

      {:ok,
       %{
         count: Repo.aggregate(base, :count, :id),
         meals:
           base
           |> Meal.ordered()
           |> Easy.Utils.paginate(offset, limit)
           |> Meal.with_items()
           |> Repo.all()
       }}
    end
  end

  @spec fetch_meal_item(String.t(), String.t()) :: {:ok, MealItem.t()} | {:error, :not_found}
  def fetch_meal_item(business_id, meal_item_id) do
    MealItem
    |> MealItem.for_business(business_id)
    |> Repo.get(meal_item_id)
    |> ok_or_not_found()
  end

  @spec list_meal_items(String.t(), String.t()) ::
          {:ok, [MealItem.t()]} | {:error, :not_found}
  def list_meal_items(business_id, meal_id) do
    with {:ok, meal} <- fetch_meal(business_id, meal_id) do
      meal_items =
        MealItem
        |> MealItem.for_business(business_id)
        |> MealItem.for_meal(meal.id)
        |> MealItem.ordered()
        |> MealItem.with_food_and_recipe()
        |> Repo.all()

      {:ok, meal_items}
    end
  end

  @spec ensure_food_or_recipe(map(), String.t()) :: {:ok, :valid} | {:error, :not_found}
  def ensure_food_or_recipe(params, business_id) do
    with {:ok, :valid} <- ensure_food(Map.get(params, "food_id"), business_id),
         {:ok, :valid} <- ensure_recipe(Map.get(params, "recipe_id"), business_id) do
      {:ok, :valid}
    end
  end

  @spec fetch_plan_item(String.t(), String.t()) :: {:ok, PlanItem.t()} | {:error, :not_found}
  def fetch_plan_item(business_id, plan_item_id) do
    PlanItem
    |> PlanItem.for_business(business_id)
    |> Repo.get(plan_item_id)
    |> ok_or_not_found()
  end

  @spec list_plan_items(String.t(), String.t()) ::
          {:ok, [PlanItem.t()]} | {:error, :not_found}
  def list_plan_items(business_id, plan_id) do
    with {:ok, plan} <- fetch_plan(business_id, plan_id) do
      plan_items =
        PlanItem
        |> PlanItem.for_business(business_id)
        |> PlanItem.for_plan(plan.id)
        |> PlanItem.with_meal()
        |> Repo.all()

      {:ok, plan_items}
    end
  end

  @spec ensure_meal_for_plan(String.t(), String.t(), String.t() | nil) ::
          {:ok, :valid} | {:error, :not_found}
  def ensure_meal_for_plan(_plan_id, _business_id, nil), do: {:ok, :valid}

  def ensure_meal_for_plan(plan_id, business_id, meal_id) do
    case Meal |> Meal.for_business(business_id) |> Meal.for_plan(plan_id) |> Repo.get(meal_id) do
      nil -> {:error, :not_found}
      _meal -> {:ok, :valid}
    end
  end

  @spec list_meal_logs(String.t(), String.t(), Date.t() | nil, Date.t() | nil, Date.t() | nil) ::
          {:ok, [MealLog.t()]}
  def list_meal_logs(business_id, client_id, date, from_date, to_date) do
    meal_logs =
      MealLog
      |> MealLog.for_business(business_id)
      |> MealLog.for_client(client_id)
      |> apply_date_filters(date, from_date, to_date)
      |> MealLog.ordered()
      |> MealLog.with_entries()
      |> Repo.all()

    {:ok, meal_logs}
  end

  @spec fetch_client_meal_log(String.t(), String.t(), String.t()) ::
          {:ok, MealLog.t()} | {:error, :not_found}
  def fetch_client_meal_log(business_id, client_id, meal_log_id) do
    MealLog
    |> MealLog.for_business(business_id)
    |> MealLog.for_client(client_id)
    |> MealLog.with_entries()
    |> Repo.get(meal_log_id)
    |> ok_or_not_found()
  end

  @spec fetch_business_food_log_entry(String.t(), String.t()) ::
          {:ok, FoodLogEntry.t()} | {:error, :not_found}
  def fetch_business_food_log_entry(business_id, entry_id) do
    FoodLogEntry
    |> FoodLogEntry.for_business(business_id)
    |> Repo.get(entry_id)
    |> ok_or_not_found()
  end

  @spec fetch_client_food_log_entry(String.t(), String.t(), String.t()) ::
          {:ok, FoodLogEntry.t()} | {:error, :not_found}
  def fetch_client_food_log_entry(business_id, client_id, entry_id) do
    FoodLogEntry
    |> FoodLogEntry.for_client(business_id, client_id)
    |> Repo.get(entry_id)
    |> ok_or_not_found()
  end

  defp active_plan(business_id, client_id, date) do
    Plan
    |> Plan.for_business(business_id)
    |> Plan.active_for_client(client_id, date)
    |> Plan.newest()
    |> limit(1)
    |> Repo.one()
  end

  defp ensure_food(nil, _business_id), do: {:ok, :valid}

  defp ensure_food(food_id, business_id) do
    case Food |> Food.for_business_or_system(business_id) |> Repo.get(food_id) do
      nil -> {:error, :not_found}
      _food -> {:ok, :valid}
    end
  end

  defp ensure_recipe(nil, _business_id), do: {:ok, :valid}

  defp ensure_recipe(recipe_id, business_id) do
    case Recipe |> Recipe.for_business(business_id) |> Repo.get(recipe_id) do
      nil -> {:error, :not_found}
      _recipe -> {:ok, :valid}
    end
  end

  defp apply_date_filters(query, date, _from, _to) when not is_nil(date) do
    MealLog.for_date(query, date)
  end

  defp apply_date_filters(query, _date, from_date, to_date)
       when not is_nil(from_date) and not is_nil(to_date) do
    MealLog.for_date_range(query, from_date, to_date)
  end

  defp apply_date_filters(query, _date, _from_date, _to_date), do: query

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
