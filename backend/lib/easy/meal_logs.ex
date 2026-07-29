defmodule Easy.MealLogs do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.MacroCalc
  alias Easy.Nutrition.DayMeal
  alias Easy.Nutrition.Food
  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.Meal
  alias Easy.Nutrition.MealItem
  alias Easy.Nutrition.MealLog
  alias Easy.Nutrition.Plan
  alias Easy.Nutrition.PlanDay
  alias Easy.Nutrition.Recipe
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  # ---------------------------------------------------------------------------
  # Coach read fns (Case-2: Ctx-first, client_id from path)
  # ---------------------------------------------------------------------------

  # Date-bounded lists return {:ok, [items]} — no pagination needed since the
  # query is always bounded by date / date-range (a per-day or per-week read).
  @spec list_meal_logs_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, [MealLog.t()]} | {:error, :not_found}
  def list_meal_logs_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    date = Keyword.get(opts, :date)
    from_date = Keyword.get(opts, :from)
    to_date = Keyword.get(opts, :to)

    with {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
      meal_logs =
        MealLog
        |> MealLog.for_client(ctx.business_id, client_id)
        |> apply_date_filters(date, from_date, to_date)
        |> MealLog.oldest()
        |> MealLog.include_entries()
        |> Repo.all()

      {:ok, meal_logs}
    end
  end

  # ---------------------------------------------------------------------------
  # Client self fns (Case-3: Ctx-first, resolves client via private get_client/1)
  # ---------------------------------------------------------------------------

  @spec list_client_meal_logs(Ctx.t(), keyword()) ::
          {:ok, [MealLog.t()]} | {:error, :not_found}
  def list_client_meal_logs(%Ctx{} = ctx, opts \\ []) do
    date = Keyword.get(opts, :date)
    from_date = Keyword.get(opts, :from)
    to_date = Keyword.get(opts, :to)

    with {:ok, client} <- get_client(ctx) do
      meal_logs =
        MealLog
        |> MealLog.for_client(ctx.business_id, client.id)
        |> apply_date_filters(date, from_date, to_date)
        |> MealLog.oldest()
        |> MealLog.include_entries()
        |> Repo.all()

      {:ok, meal_logs}
    end
  end

  @spec create_client_food_log_entry(Ctx.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def create_client_food_log_entry(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client(ctx) do
      log_entry(ctx.business_id, client.id, attrs)
    end
  end

  @spec update_client_food_log_entry(Ctx.t(), String.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def update_client_food_log_entry(%Ctx{} = ctx, entry_id, attrs) do
    with {:ok, client} <- get_client(ctx),
         {:ok, entry} <- get_client_food_log_entry_scoped(ctx.business_id, client.id, entry_id) do
      update_entry(entry, ctx.business_id, attrs)
    end
  end

  @spec delete_client_food_log_entry(Ctx.t(), String.t()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def delete_client_food_log_entry(%Ctx{} = ctx, entry_id) do
    with {:ok, client} <- get_client(ctx),
         {:ok, entry} <- get_client_food_log_entry_scoped(ctx.business_id, client.id, entry_id) do
      delete_entry(entry, ctx.business_id)
    end
  end

  @spec log_client_meal(Ctx.t(), map()) ::
          {:ok, [FoodLogEntry.t()]} | {:error, any()}
  def log_client_meal(%Ctx{} = ctx, attrs) do
    meal_slot = attrs[:meal_slot]
    meal_id = attrs[:meal_id]

    with {:ok, client} <- get_client(ctx),
         {:ok, date} <- fetch_date(attrs) do
      log_meal(ctx.business_id, client.id, date, meal_slot, meal_id)
    end
  end

  @spec log_client_day(Ctx.t(), map()) ::
          {:ok, [FoodLogEntry.t()]} | {:error, any()}
  def log_client_day(%Ctx{} = ctx, attrs) do
    plan_id = attrs[:plan_id]

    with {:ok, client} <- get_client(ctx),
         {:ok, date} <- fetch_date(attrs) do
      log_day(ctx.business_id, client.id, date, plan_id)
    end
  end

  @spec switch_client_meal_option(Ctx.t(), map()) ::
          {:ok, MealLog.t()} | {:error, any()}
  def switch_client_meal_option(%Ctx{} = ctx, attrs) do
    meal_id = attrs[:meal_id]
    meal_slot = attrs[:meal_slot]

    with {:ok, client} <- get_client(ctx),
         {:ok, date} <- fetch_date(attrs),
         meal when not is_nil(meal) <- load_meal_with_items(ctx.business_id, client.id, meal_id) do
      case get_existing_meal_log(ctx.business_id, client.id, date, meal_slot) do
        %MealLog{nutrition_meal_id: existing_meal_id} = existing when existing_meal_id == meal_id ->
          {:ok, Repo.preload(existing, food_log_entries: FoodLogEntry.by_position())}

        _ ->
          do_switch_meal_option(ctx, client.id, date, meal_slot, meal_id)
      end
    else
      nil -> {:error, :not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  defp do_switch_meal_option(ctx, client_id, date, meal_slot, meal_id) do
    snapshot = build_planned_snapshot(ctx.business_id, meal_id)

    Repo.transaction(fn ->
      meal_log =
        case find_or_create_meal_log(ctx.business_id, client_id, date, meal_slot, snapshot, meal_id) do
          {:ok, ml} -> ml
          {:error, reason} -> Repo.rollback(reason)
        end

      FoodLogEntry
      |> FoodLogEntry.for_meal_log(meal_log.id)
      |> where([e], e.source in [:planned, :replacement])
      |> Repo.delete_all()

      case recalculate_logged_calories(meal_log) do
        {:ok, _} ->
          MealLog
          |> MealLog.for_client(ctx.business_id, client_id)
          |> MealLog.include_entries()
          |> Repo.get(meal_log.id)

        {:error, reason} ->
          Repo.rollback(reason)
      end
    end)
  end

  # ---------------------------------------------------------------------------
  # Semi-public helpers (called from tests / internal pipelines)
  # ---------------------------------------------------------------------------

  @spec find_or_create_meal_log(String.t(), String.t(), Date.t(), String.t(), map() | nil, String.t() | nil) ::
          {:ok, MealLog.t()} | {:error, Ecto.Changeset.t()}
  defp find_or_create_meal_log(business_id, client_id, date, meal_slot, snapshot, meal_id) do
    case get_existing_meal_log(business_id, client_id, date, meal_slot) do
      %MealLog{nutrition_meal_id: existing_meal_id} = existing
      when not is_nil(meal_id) and existing_meal_id != meal_id ->
        existing
        |> change(nutrition_meal_id: meal_id, planned_snapshot: snapshot)
        |> put_change(:planned_calories, snapshot && (snapshot[:total_calories] || 0.0) * 1.0)
        |> Repo.update()

      %MealLog{} = existing ->
        {:ok, existing}

      nil ->
        insert_meal_log(business_id, client_id, date, meal_slot, snapshot, meal_id)
    end
  end

  defp insert_meal_log(business_id, client_id, date, meal_slot, snapshot, meal_id) do
    attrs = %{date: date, meal_slot: meal_slot}
    planned_calories = snapshot && snapshot[:total_calories]

    result =
      MealLog.insert_changeset(business_id, client_id, attrs)
      |> put_change(:planned_snapshot, snapshot)
      |> put_change(:planned_calories, planned_calories && planned_calories * 1.0)
      |> put_change(:nutrition_meal_id, meal_id)
      |> Repo.insert()

    resolve_meal_log_insert(result, business_id, client_id, date, meal_slot)
  end

  defp resolve_meal_log_insert({:ok, meal_log}, _business_id, _client_id, _date, _meal_slot),
    do: {:ok, meal_log}

  defp resolve_meal_log_insert(
         {:error, %{errors: errors} = changeset},
         business_id,
         client_id,
         date,
         meal_slot
       ) do
    if has_unique_violation?(errors) do
      existing_meal_log_result(business_id, client_id, date, meal_slot, changeset)
    else
      {:error, changeset}
    end
  end

  defp existing_meal_log_result(business_id, client_id, date, meal_slot, changeset) do
    case get_existing_meal_log(business_id, client_id, date, meal_slot) do
      %MealLog{} = existing -> {:ok, existing}
      nil -> {:error, changeset}
    end
  end

  @spec recalculate_logged_calories(MealLog.t()) :: {:ok, MealLog.t()} | {:error, :not_found}
  def recalculate_logged_calories(%MealLog{} = meal_log) do
    case do_recalculate_logged_calories(meal_log) do
      {1, [%{logged_calories: total}]} -> {:ok, %{meal_log | logged_calories: total}}
      {0, []} -> {:error, :not_found}
    end
  end

  # ---------------------------------------------------------------------------
  # Private — internal logic
  # ---------------------------------------------------------------------------

  defp log_entry(business_id, client_id, attrs) do
    meal_slot = attrs[:meal_slot]
    explicit_meal_id = attrs[:meal_id]

    with {:ok, date} <- fetch_date(attrs) do
      Repo.transaction(fn ->
        log_entry_transaction(business_id, client_id, date, meal_slot, explicit_meal_id, attrs)
      end)
    end
  end

  defp log_entry_transaction(business_id, client_id, date, meal_slot, explicit_meal_id, attrs) do
    validate_explicit_meal!(business_id, client_id, explicit_meal_id)
    meal_id = resolve_slot_meal_id(business_id, client_id, date, meal_slot, explicit_meal_id)
    snapshot = build_planned_snapshot(business_id, meal_id)
    validate_snapshot!(meal_id, snapshot)
    meal_log = get_or_create_meal_log!(business_id, client_id, date, meal_slot, snapshot, meal_id)
    meal_item_id = resolve_planned_meal_item_id(business_id, meal_id, attrs[:planned_item_index])

    with {:ok, entry} <- create_food_log_entry(business_id, meal_log.id, attrs, meal_item_id),
         {:ok, _meal_log} <- recalculate_logged_calories(meal_log) do
      entry
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp validate_explicit_meal!(_business_id, _client_id, nil), do: :ok

  defp validate_explicit_meal!(business_id, client_id, meal_id) do
    if is_nil(load_meal_with_items(business_id, client_id, meal_id)), do: Repo.rollback(:not_found)
  end

  defp validate_snapshot!(meal_id, snapshot) do
    if not is_nil(meal_id) and is_nil(snapshot), do: Repo.rollback(:not_found)
  end

  defp get_or_create_meal_log!(business_id, client_id, date, meal_slot, snapshot, meal_id) do
    case find_or_create_meal_log(business_id, client_id, date, meal_slot, snapshot, meal_id) do
      {:ok, meal_log} -> meal_log
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp update_entry(%FoodLogEntry{} = entry, business_id, attrs) do
    Repo.transaction(fn -> update_entry_transaction(entry, business_id, attrs) end)
  end

  defp update_entry_transaction(entry, business_id, attrs) do
    with {:ok, updated} <- update_food_log_entry(entry, business_id, attrs),
         {:ok, _meal_log} <- recalculate_entry_meal_log(updated, business_id) do
      updated
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp delete_entry(%FoodLogEntry{} = entry, business_id) do
    Repo.transaction(fn -> delete_entry_transaction(entry, business_id) end)
  end

  defp delete_entry_transaction(entry, business_id) do
    with {:ok, deleted} <- Repo.delete(entry),
         {:ok, _meal_log} <- recalculate_entry_meal_log(deleted, business_id) do
      deleted
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp log_meal(business_id, client_id, date, meal_slot, meal_id) do
    Repo.transaction(fn ->
      do_log_meal(business_id, client_id, date, meal_slot, meal_id)
    end)
  end

  defp log_day(business_id, client_id, date, plan_id) do
    plan =
      Plan
      |> Plan.for_business(business_id)
      |> Plan.for_client(business_id, client_id)
      |> Repo.get(plan_id)

    case plan do
      nil ->
        {:error, :not_found}

      plan ->
        slot_meals = slot_meals(business_id, client_id, plan.id, date)
        Repo.transaction(fn -> log_slot_meals(business_id, client_id, date, slot_meals) end)
    end
  end

  defp slot_meals(business_id, client_id, plan_id, date) do
    case plan_day_for_date(business_id, plan_id, date) do
      nil ->
        []

      day ->
        DayMeal
        |> DayMeal.for_business(business_id)
        |> DayMeal.for_plan_day(day.id)
        |> DayMeal.by_slot_position()
        |> Repo.all()
        |> Enum.group_by(& &1.meal_slot)
        |> Enum.map(&slot_meal(&1, business_id, client_id, date))
    end
  end

  defp slot_meal({slot, [default | _]}, business_id, client_id, date),
    do: {slot, pinned_meal_id(business_id, client_id, date, slot) || default.nutrition_meal_id}

  defp log_slot_meals(business_id, client_id, date, slot_meals) do
    Enum.flat_map(slot_meals, fn {slot, meal_id} ->
      do_log_meal(business_id, client_id, date, slot, meal_id)
    end)
  end

  # chosen meal for a slot: explicit meal_id > existing pin > default option
  defp resolve_slot_meal_id(business_id, client_id, date, meal_slot, explicit_meal_id) do
    explicit_meal_id ||
      pinned_meal_id(business_id, client_id, date, meal_slot) ||
      default_option_meal_id(business_id, client_id, date, meal_slot)
  end

  defp pinned_meal_id(business_id, client_id, date, meal_slot) do
    case get_existing_meal_log(business_id, client_id, date, meal_slot) do
      %MealLog{nutrition_meal_id: id} -> id
      nil -> nil
    end
  end

  defp default_option_meal_id(business_id, client_id, date, meal_slot) do
    with %Plan{} = plan <- active_plan(business_id, client_id, date),
         %PlanDay{} = day <- plan_day_for_date(business_id, plan.id, date) do
      DayMeal
      |> DayMeal.for_business(business_id)
      |> DayMeal.for_plan_day(day.id)
      |> DayMeal.for_meal_slot(meal_slot)
      |> DayMeal.by_slot_position()
      |> limit(1)
      |> Repo.one()
      |> case do
        nil -> nil
        dm -> dm.nutrition_meal_id
      end
    else
      _ -> nil
    end
  end

  defp plan_day_for_date(business_id, plan_id, date) do
    PlanDay
    |> PlanDay.for_business(business_id)
    |> PlanDay.for_plan(plan_id)
    |> PlanDay.for_weekday(Easy.Utils.weekday_name(date))
    |> limit(1)
    |> Repo.one()
  end

  defp active_plan(business_id, client_id, date) do
    Plan
    |> Plan.for_business(business_id)
    |> Plan.active_for_client(client_id, date)
    |> Plan.newest()
    |> limit(1)
    |> Repo.one()
  end

  defp build_planned_snapshot(_business_id, nil), do: nil

  defp build_planned_snapshot(business_id, meal_id) do
    case Meal |> Meal.for_business(business_id) |> Repo.get(meal_id) do
      nil ->
        nil

      meal ->
        meal = Repo.preload(meal, meal_items: MealItem.include_food_and_recipe(MealItem, business_id))
        items = meal.meal_items |> Enum.sort_by(& &1.position) |> Enum.map(&snapshot_item/1)

        %{
          meal_name: meal.name,
          items: items,
          total_calories: sum_field(items, :calories),
          total_protein_g: sum_field(items, :protein_g),
          total_carbs_g: sum_field(items, :carbs_g),
          total_fat_g: sum_field(items, :fat_g),
          total_fiber_g: sum_field(items, :fiber_g)
        }
    end
  end

  defp do_log_meal(business_id, client_id, date, meal_slot, meal_id) do
    meal = load_meal_with_items(business_id, client_id, meal_id) || Repo.rollback(:not_found)
    snapshot = build_planned_snapshot(business_id, meal_id)

    meal_log =
      case find_or_create_meal_log(business_id, client_id, date, meal_slot, snapshot, meal_id) do
        {:ok, ml} -> ml
        {:error, reason} -> Repo.rollback(reason)
      end

    already_logged =
      FoodLogEntry
      |> FoodLogEntry.for_meal_log(meal_log.id)
      |> FoodLogEntry.logged_meal_item_ids()
      |> Repo.all()
      |> MapSet.new()

    entries =
      meal.meal_items
      |> Enum.sort_by(& &1.position)
      |> Enum.reduce([], &log_meal_item(&1, &2, already_logged, meal_log.id, business_id))
      |> Enum.reverse()

    case recalculate_logged_calories(meal_log) do
      {:ok, _meal_log} -> entries
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp log_meal_item(item, acc, already_logged, meal_log_id, business_id) do
    if MapSet.member?(already_logged, item.id) do
      acc
    else
      case create_food_log_entry(business_id, meal_log_id, build_entry_attrs(item), item.id) do
        {:ok, entry} -> [entry | acc]
        {:error, reason} -> Repo.rollback(reason)
      end
    end
  end

  defp create_food_log_entry(business_id, meal_log_id, attrs, meal_item_id) do
    changeset =
      business_id
      |> FoodLogEntry.insert_changeset(meal_log_id, attrs)
      |> put_meal_item(meal_item_id)

    if changeset.valid? do
      changeset
      |> resolve_and_compute(business_id)
      |> validate_required([:food_name])
      |> Repo.insert()
    else
      {:error, %{changeset | action: :insert}}
    end
  end

  defp put_meal_item(changeset, nil), do: changeset
  defp put_meal_item(changeset, meal_item_id), do: put_change(changeset, :nutrition_meal_item_id, meal_item_id)

  # The client still identifies a planned item by its position. Positions are not
  # unique — the builder redesign renounced that — so pin the entry to a concrete
  # item id here; lowest id wins, matching the migration's backfill. Reconciliation
  # keys on the id from this point on, so a same-position twin is no longer
  # mistaken for an item that was already logged.
  defp resolve_planned_meal_item_id(_business_id, nil, _position), do: nil
  defp resolve_planned_meal_item_id(_business_id, _meal_id, nil), do: nil

  defp resolve_planned_meal_item_id(business_id, meal_id, position) do
    MealItem
    |> MealItem.for_business(business_id)
    |> MealItem.for_meal(meal_id)
    |> MealItem.for_position(position)
    |> order_by([mi], asc: mi.id)
    |> limit(1)
    |> select([mi], mi.id)
    |> Repo.one()
  end

  defp update_food_log_entry(%FoodLogEntry{} = entry, business_id, attrs) do
    entry
    |> FoodLogEntry.update_changeset(attrs)
    |> maybe_recompute_macros(entry, business_id)
    |> Repo.update()
  end

  defp resolve_and_compute(changeset, business_id) do
    food_id = get_field(changeset, :food_id)
    recipe_id = get_field(changeset, :recipe_id)
    weight_g = get_field(changeset, :weight_g)

    cond do
      not is_nil(food_id) ->
        resolve_food(changeset, food_id, business_id, weight_g)

      not is_nil(recipe_id) ->
        resolve_recipe(changeset, recipe_id, business_id, weight_g, get_field(changeset, :amount))

      true ->
        changeset
    end
  end

  defp resolve_food(changeset, food_id, business_id, weight_g) do
    case Food |> Food.for_business_or_system(business_id) |> Repo.get(food_id) do
      nil ->
        add_error(changeset, :food_id, "food not found")

      food ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || food.name)
        |> put_macros(MacroCalc.for_food(food, weight_g))
    end
  end

  defp resolve_recipe(changeset, recipe_id, business_id, weight_g, amount) do
    case load_recipe_with_ingredients(business_id, recipe_id) do
      nil ->
        add_error(changeset, :recipe_id, "recipe not found")

      recipe ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || recipe.name)
        |> put_macros(recipe_macros(recipe, weight_g, amount))
    end
  end

  # A recipe with no logged grams is priced in servings, matching MacroCalc.for_meal_item/1.
  defp recipe_macros(recipe, nil, amount), do: MacroCalc.for_recipe_servings(recipe, amount)
  defp recipe_macros(recipe, weight_g, _amount), do: MacroCalc.for_recipe(recipe, weight_g)

  defp load_recipe_with_ingredients(business_id, recipe_id) do
    food_query = Food.for_business_or_system(Food, business_id)

    Recipe
    |> Recipe.for_business(business_id)
    |> preload(recipe_ingredients: ^from(ri in RecipeIngredient, preload: [food: ^food_query]))
    |> Repo.get(recipe_id)
  end

  defp put_macros(changeset, macros) do
    changeset
    |> put_change(:calories, macros.calories)
    |> put_change(:protein_g, macros.protein_g)
    |> put_change(:carbs_g, macros.carbs_g)
    |> put_change(:fat_g, macros.fat_g)
    |> put_change(:fiber_g, macros.fiber_g)
  end

  defp maybe_recompute_macros(changeset, entry, business_id) do
    if get_change(changeset, :weight_g) || get_change(changeset, :amount) do
      recompute_macros(changeset, entry, business_id)
    else
      changeset
    end
  end

  defp recompute_macros(changeset, entry, business_id) do
    weight_g = get_field(changeset, :weight_g)
    amount = get_field(changeset, :amount)

    entry =
      Repo.preload(entry,
        food: Food.for_business_or_system(Food, business_id),
        recipe: Recipe.for_business(Recipe, business_id)
      )

    case {entry.food, entry.recipe} do
      {%Food{} = food, _} ->
        put_macros(changeset, MacroCalc.for_food(food, weight_g))

      {_, %Recipe{} = recipe} ->
        recipe = load_recipe_with_ingredients(business_id, recipe.id)
        put_macros(changeset, recipe_macros(recipe, weight_g, amount))

      _ ->
        changeset
    end
  end

  defp recalculate_entry_meal_log(entry, business_id) do
    case MealLog |> MealLog.for_business(business_id) |> Repo.get(entry.nutrition_meal_log_id) do
      nil -> {:error, :not_found}
      meal_log -> recalculate_logged_calories(meal_log)
    end
  end

  defp do_recalculate_logged_calories(meal_log) do
    from(ml in MealLog,
      where: ml.id == ^meal_log.id and ml.business_id == ^meal_log.business_id,
      select: %{
        logged_calories:
          fragment(
            "(SELECT coalesce(sum(calories), 0.0) FROM nutrition_food_log_entries WHERE nutrition_meal_log_id = ?)",
            ml.id
          )
      },
      update: [
        set: [
          logged_calories:
            fragment(
              "(SELECT coalesce(sum(calories), 0.0) FROM nutrition_food_log_entries WHERE nutrition_meal_log_id = ?)",
              ml.id
            )
        ]
      ]
    )
    |> Repo.update_all([], returning: [:logged_calories])
  end

  defp get_existing_meal_log(business_id, client_id, date, meal_slot) do
    MealLog
    |> MealLog.for_client(business_id, client_id)
    |> MealLog.for_date(date)
    |> MealLog.for_meal_slot(meal_slot)
    |> Repo.one()
  end

  defp has_unique_violation?(errors) do
    Enum.any?(errors, fn {_field, {_msg, meta}} ->
      Keyword.get(meta, :constraint) == :unique
    end)
  end

  defp load_meal_with_items(business_id, client_id, meal_id) do
    case Meal |> Meal.for_business(business_id) |> Repo.get(meal_id) do
      nil ->
        nil

      %{nutrition_plan_id: plan_id} = meal ->
        plan_belongs =
          Plan
          |> Plan.for_business(business_id)
          |> Plan.for_client(business_id, client_id)
          |> Repo.get(plan_id)

        if is_nil(plan_belongs) do
          nil
        else
          Repo.preload(meal, meal_items: MealItem.include_food_and_recipe(MealItem, business_id))
        end
    end
  end

  defp build_entry_attrs(%MealItem{} = item) do
    food_or_recipe = item.food || item.recipe

    %{
      "food_name" => food_or_recipe && food_or_recipe.name,
      "food_id" => item.food_id,
      "recipe_id" => item.recipe_id,
      "amount" => item.amount,
      "unit" => item.unit,
      "weight_g" => item.weight_g,
      "source" => "planned",
      "planned_item_index" => item.position
    }
  end

  defp snapshot_item(%MealItem{} = item) do
    macros = MacroCalc.for_meal_item(item)
    {name, _} = item_name(item)

    %{
      food_name: name,
      amount: item.amount,
      unit: item.unit,
      weight_g: item.weight_g || 0.0,
      calories: macros.calories,
      protein_g: macros.protein_g,
      carbs_g: macros.carbs_g,
      fat_g: macros.fat_g,
      fiber_g: macros.fiber_g
    }
  end

  defp item_name(%MealItem{food: %Food{} = f}), do: {f.name, :food}
  defp item_name(%MealItem{recipe: %Recipe{} = r}), do: {r.name, :recipe}
  defp item_name(_), do: {nil, :unknown}

  defp apply_date_filters(query, date, _from, _to) when not is_nil(date) do
    MealLog.for_date(query, date)
  end

  defp apply_date_filters(query, _date, from_date, to_date)
       when not is_nil(from_date) and not is_nil(to_date) do
    MealLog.for_date_range(query, from_date, to_date)
  end

  defp apply_date_filters(query, _date, _from_date, _to_date), do: query

  # Resolves the client record for the authenticated user (client self path).
  defp get_client(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  # Entry getter scoped to a specific client (used internally after resolving client).
  defp get_client_food_log_entry_scoped(business_id, client_id, entry_id) do
    FoodLogEntry
    |> FoodLogEntry.for_client(business_id, client_id)
    |> Repo.get(entry_id)
    |> ok_or_not_found()
  end

  # CastAndValidate turns `format: :date` request fields into a Date struct on an
  # atom-keyed map, so there is exactly one shape to read.
  defp fetch_date(%{date: %Date{} = date}), do: {:ok, date}
  defp fetch_date(_attrs), do: {:error, :date_required}

  defp sum_field(items, field) do
    items
    |> Enum.reduce(0.0, &((Map.get(&1, field) || 0.0) + &2))
    |> Float.round(1)
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
