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
  # query is always bounded by date / date-range (a per-day or per-week read);
  # apply_date_filters/4 falls back to today when no bound is given.
  @spec list_meal_logs_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, [MealLog.t()]}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_meal_logs_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    date = Keyword.get(opts, :date)
    from_date = Keyword.get(opts, :from)
    to_date = Keyword.get(opts, :to)

    with {:ok, _client} <- Clients.authorize_client(ctx, client_id),
         {:ok, query} <-
           MealLog
           |> MealLog.for_client(ctx.business_id, client_id)
           |> apply_date_filters(date, from_date, to_date) do
      meal_logs =
        query
        |> MealLog.oldest()
        |> MealLog.include_entries()
        |> Repo.all()

      {:ok, meal_logs}
    end
  end

  # ---------------------------------------------------------------------------
  # Client self fns (Case-3: Ctx-first, target from ctx.client_id)
  # ---------------------------------------------------------------------------

  @spec list_client_meal_logs(Ctx.t(), keyword()) ::
          {:ok, [MealLog.t()]}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_client_meal_logs(%Ctx{} = ctx, opts \\ []) do
    date = Keyword.get(opts, :date)
    from_date = Keyword.get(opts, :from)
    to_date = Keyword.get(opts, :to)

    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, query} <-
           MealLog
           |> MealLog.for_client(ctx.business_id, client_id)
           |> apply_date_filters(date, from_date, to_date) do
      meal_logs =
        query
        |> MealLog.oldest()
        |> MealLog.include_entries()
        |> Repo.all()

      {:ok, meal_logs}
    end
  end

  @spec create_client_food_log_entry(Ctx.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def create_client_food_log_entry(%Ctx{} = ctx, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      log_entry(ctx.business_id, client_id, attrs)
    end
  end

  @spec update_client_food_log_entry(Ctx.t(), String.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def update_client_food_log_entry(%Ctx{} = ctx, entry_id, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, entry} <- get_client_food_log_entry_scoped(ctx.business_id, client_id, entry_id) do
      update_entry(entry, ctx.business_id, client_id, attrs)
    end
  end

  @spec delete_client_food_log_entry(Ctx.t(), String.t()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def delete_client_food_log_entry(%Ctx{} = ctx, entry_id) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, entry} <- get_client_food_log_entry_scoped(ctx.business_id, client_id, entry_id) do
      delete_entry(entry, ctx.business_id)
    end
  end

  @spec log_client_meal(Ctx.t(), map()) ::
          {:ok, [FoodLogEntry.t()]} | {:error, any()}
  def log_client_meal(%Ctx{} = ctx, attrs) do
    meal_slot = attrs[:meal_slot]
    meal_id = attrs[:meal_id]

    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, date} <- fetch_date(attrs) do
      log_meal(ctx.business_id, client_id, date, meal_slot, meal_id)
    end
  end

  @spec log_client_day(Ctx.t(), map()) ::
          {:ok, [FoodLogEntry.t()]} | {:error, any()}
  def log_client_day(%Ctx{} = ctx, attrs) do
    plan_id = attrs[:plan_id]

    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, date} <- fetch_date(attrs) do
      log_day(ctx.business_id, client_id, date, plan_id)
    end
  end

  @spec switch_client_meal_option(Ctx.t(), map()) ::
          {:ok, MealLog.t()} | {:error, any()}
  def switch_client_meal_option(%Ctx{} = ctx, attrs) do
    meal_id = attrs[:meal_id]
    meal_slot = attrs[:meal_slot]

    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, date} <- fetch_date(attrs),
         meal when not is_nil(meal) <- load_meal_with_items(ctx.business_id, client_id, meal_id) do
      case get_existing_meal_log(ctx.business_id, client_id, date, meal_slot) do
        %MealLog{nutrition_meal_id: existing_meal_id} = existing when existing_meal_id == meal_id ->
          {:ok, Repo.preload(existing, food_log_entries: FoodLogEntry.oldest())}

        _ ->
          do_switch_meal_option(ctx, client_id, date, meal_slot, meal)
      end
    else
      nil -> {:error, :not_found}
      {:error, reason} -> {:error, reason}
    end
  end

  defp do_switch_meal_option(ctx, client_id, date, meal_slot, %Meal{} = meal) do
    snapshot = build_planned_snapshot(meal)

    Repo.transaction(fn ->
      meal_log =
        case find_or_create_meal_log(ctx.business_id, client_id, date, meal_slot, snapshot, meal.id) do
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
    occurred_at = DateTime.utc_now(:second)
    meal_id = resolve_slot_meal_id(business_id, client_id, date, meal_slot, explicit_meal_id)
    meal = meal_id && load_meal_with_items(business_id, client_id, meal_id)
    snapshot = build_planned_snapshot(meal)
    validate_snapshot!(meal_id, snapshot)
    meal_log = get_or_create_meal_log!(business_id, client_id, date, meal_slot, snapshot, meal_id)
    meal_item_id = resolve_meal_item_id(business_id, meal_id, attrs[:meal_item_id])

    with {:ok, entry} <- create_food_log_entry(business_id, meal_log.id, attrs, meal_item_id),
         {:ok, _meal_log} <- recalculate_logged_calories(meal_log),
         :ok <- stamp_client_activity(business_id, client_id, occurred_at) do
      entry
    else
      {:error, reason} -> Repo.rollback(reason)
    end
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

  defp update_entry(%FoodLogEntry{} = entry, business_id, client_id, attrs) do
    Repo.transaction(fn -> update_entry_transaction(entry, business_id, client_id, attrs) end)
  end

  defp update_entry_transaction(entry, business_id, client_id, attrs) do
    occurred_at = DateTime.utc_now(:second)

    with {:ok, updated} <- update_food_log_entry(entry, business_id, attrs),
         {:ok, _meal_log} <- recalculate_entry_meal_log(updated, business_id),
         :ok <- stamp_client_activity(business_id, client_id, occurred_at) do
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

  defp stamp_client_activity(business_id, client_id, occurred_at) do
    Client
    |> Client.last_active_stamp(business_id, client_id, occurred_at)
    |> Repo.update_all([])
    |> case do
      {1, nil} -> :ok
      {0, nil} -> {:error, :not_found}
    end
  end

  defp log_meal(business_id, client_id, date, meal_slot, meal_id) do
    Repo.transaction(fn ->
      occurred_at = DateTime.utc_now(:second)
      entries = do_log_meal(business_id, client_id, date, meal_slot, meal_id)
      stamp_new_entries(entries, business_id, client_id, occurred_at)
      entries
    end)
  end

  defp log_day(business_id, client_id, date, plan_id) do
    Repo.transaction(fn ->
      slots = load_day_slots!(business_id, client_id, date, plan_id)
      meals_by_id = load_day_meals!(business_id, plan_id, slots)
      now = DateTime.utc_now(:second)
      logs_by_slot = upsert_day_meal_logs(slots, meals_by_id, business_id, client_id, date, now)
      {slots, meals_by_id} = sync_day_slots(slots, meals_by_id, logs_by_slot, business_id, plan_id)
      entries = insert_day_entries(slots, meals_by_id, logs_by_slot, business_id, now)
      recalculate_day_calories(logs_by_slot, business_id)
      stamp_new_entries(entries, business_id, client_id, now)
      entries
    end)
  end

  defp stamp_new_entries([], _business_id, _client_id, _occurred_at), do: :ok

  defp stamp_new_entries(_entries, business_id, client_id, occurred_at) do
    case stamp_client_activity(business_id, client_id, occurred_at) do
      :ok -> :ok
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp load_day_slots!(business_id, client_id, date, plan_id) do
    day_id_query =
      PlanDay
      |> PlanDay.for_business(business_id)
      |> PlanDay.for_plan(plan_id)
      |> PlanDay.for_weekday(Easy.Utils.weekday_name(date))
      |> PlanDay.by_position()
      |> limit(1)
      |> select([day], day.id)

    rows =
      Plan
      |> Plan.for_client(business_id, client_id)
      |> where([plan], plan.id == ^plan_id)
      |> join(:left, [plan], day in subquery(day_id_query), on: true)
      |> join(:left, [plan, day], option in DayMeal,
        on:
          option.business_id == ^business_id and
            option.nutrition_plan_day_id == day.id
      )
      |> join(:left, [plan, day, option], meal_log in MealLog,
        on:
          meal_log.business_id == ^business_id and meal_log.client_id == ^client_id and
            meal_log.date == ^date and meal_log.meal_slot == option.meal_slot
      )
      |> order_by([plan, day, option], asc: option.meal_slot, asc: option.position, asc: option.id)
      |> select([plan, day, option, meal_log], %{
        option_id: option.id,
        meal_slot: option.meal_slot,
        option_meal_id: option.nutrition_meal_id,
        pinned_meal_id: meal_log.nutrition_meal_id
      })
      |> Repo.all()

    case rows do
      [] -> Repo.rollback(:not_found)
      [%{option_id: nil}] -> []
      rows -> choose_day_slots(rows)
    end
  end

  defp choose_day_slots(rows) do
    rows
    |> Enum.group_by(& &1.meal_slot)
    |> Enum.map(fn {meal_slot, options} ->
      first = hd(options)

      %{
        meal_slot: meal_slot,
        meal_id: first.pinned_meal_id || first.option_meal_id
      }
    end)
    |> Enum.sort_by(& &1.meal_slot)
  end

  defp load_day_meals!(_business_id, _plan_id, []), do: %{}

  defp load_day_meals!(business_id, plan_id, slots) do
    meal_ids = slots |> Enum.map(& &1.meal_id) |> Enum.uniq()

    meals =
      Meal
      |> Meal.for_business(business_id)
      |> Meal.for_plan(plan_id)
      |> where([meal], meal.id in ^meal_ids)
      |> Meal.include_logging_items()
      |> Repo.all()
      |> include_logging_recipe_ingredients(business_id)

    if MapSet.new(meal_ids) == MapSet.new(meals, & &1.id) do
      Map.new(meals, &{&1.id, &1})
    else
      Repo.rollback(:not_found)
    end
  end

  defp include_logging_recipe_ingredients(meals, business_id) do
    recipe_ids =
      meals
      |> Enum.flat_map(& &1.meal_items)
      |> Enum.map(& &1.recipe_id)
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()

    ingredients_by_recipe =
      if recipe_ids == [] do
        %{}
      else
        RecipeIngredient
        |> RecipeIngredient.for_business(business_id)
        |> RecipeIngredient.for_recipes(recipe_ids)
        |> RecipeIngredient.include_food()
        |> Repo.all()
        |> Enum.group_by(& &1.recipe_id)
      end

    Enum.map(meals, fn meal ->
      items =
        Enum.map(meal.meal_items, fn
          %MealItem{recipe: %Recipe{} = recipe} = item ->
            %{item | recipe: %{recipe | recipe_ingredients: Map.get(ingredients_by_recipe, recipe.id, [])}}

          item ->
            item
        end)

      %{meal | meal_items: items}
    end)
  end

  defp upsert_day_meal_logs([], _meals_by_id, _business_id, _client_id, _date, _now), do: %{}

  defp upsert_day_meal_logs(slots, meals_by_id, business_id, client_id, date, now) do
    rows =
      Enum.map(slots, fn slot ->
        snapshot = meals_by_id |> Map.fetch!(slot.meal_id) |> build_planned_snapshot()

        %{
          id: Ecto.UUID.generate(),
          date: date,
          meal_slot: slot.meal_slot,
          planned_snapshot: snapshot,
          planned_calories: snapshot.total_calories * 1.0,
          logged_calories: 0.0,
          business_id: business_id,
          client_id: client_id,
          nutrition_meal_id: slot.meal_id,
          inserted_at: now,
          updated_at: now
        }
      end)

    preserve_pin =
      from(meal_log in MealLog,
        update: [
          set: [
            nutrition_meal_id: fragment("coalesce(?, EXCLUDED.nutrition_meal_id)", meal_log.nutrition_meal_id),
            planned_snapshot:
              fragment(
                "CASE WHEN ? IS NULL THEN EXCLUDED.planned_snapshot ELSE ? END",
                meal_log.nutrition_meal_id,
                meal_log.planned_snapshot
              ),
            planned_calories:
              fragment(
                "CASE WHEN ? IS NULL THEN EXCLUDED.planned_calories ELSE ? END",
                meal_log.nutrition_meal_id,
                meal_log.planned_calories
              ),
            updated_at:
              fragment(
                "CASE WHEN ? IS NULL THEN EXCLUDED.updated_at ELSE ? END",
                meal_log.nutrition_meal_id,
                meal_log.updated_at
              )
          ]
        ]
      )

    {_count, meal_logs} =
      Repo.insert_all(MealLog, rows,
        conflict_target: [:client_id, :date, :meal_slot],
        on_conflict: preserve_pin,
        returning: [:id, :meal_slot, :nutrition_meal_id]
      )

    Map.new(meal_logs, &{&1.meal_slot, &1})
  end

  defp sync_day_slots(slots, meals_by_id, logs_by_slot, business_id, plan_id) do
    actual_slots =
      Enum.map(slots, fn slot ->
        %{slot | meal_id: Map.fetch!(logs_by_slot, slot.meal_slot).nutrition_meal_id}
      end)

    if actual_slots == slots do
      {slots, meals_by_id}
    else
      {actual_slots, load_day_meals!(business_id, plan_id, actual_slots)}
    end
  end

  defp insert_day_entries([], _meals_by_id, _logs_by_slot, _business_id, _now), do: []

  defp insert_day_entries(slots, meals_by_id, logs_by_slot, business_id, now) do
    rows =
      Enum.flat_map(slots, fn slot ->
        meal = Map.fetch!(meals_by_id, slot.meal_id)
        meal_log = Map.fetch!(logs_by_slot, slot.meal_slot)

        Enum.map(meal.meal_items, &day_entry_row(&1, meal_log.id, business_id, now))
      end)

    case rows do
      [] ->
        []

      rows ->
        {_count, entries} = Repo.insert_all(FoodLogEntry, rows, on_conflict: :nothing, returning: true)
        entries
    end
  end

  defp day_entry_row(item, meal_log_id, business_id, now) do
    macros = MacroCalc.for_meal_item(item)
    {food_name, _kind} = item_name(item)

    %{
      id: Ecto.UUID.generate(),
      food_name: food_name,
      amount: item.amount,
      unit: item.unit,
      weight_g: item.weight_g,
      calories: macros.calories,
      protein_g: macros.protein_g,
      carbs_g: macros.carbs_g,
      fat_g: macros.fat_g,
      fiber_g: macros.fiber_g,
      source: :planned,
      business_id: business_id,
      nutrition_meal_log_id: meal_log_id,
      nutrition_meal_item_id: item.id,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      inserted_at: now,
      updated_at: now
    }
  end

  defp recalculate_day_calories(logs_by_slot, _business_id) when map_size(logs_by_slot) == 0, do: :ok

  defp recalculate_day_calories(logs_by_slot, business_id) do
    meal_log_ids = Enum.map(logs_by_slot, fn {_slot, meal_log} -> meal_log.id end)

    from(meal_log in MealLog,
      where: meal_log.business_id == ^business_id and meal_log.id in ^meal_log_ids,
      update: [
        set: [
          logged_calories:
            fragment(
              "(SELECT coalesce(sum(calories), 0.0) FROM nutrition_food_log_entries WHERE nutrition_meal_log_id = ?)",
              meal_log.id
            )
        ]
      ]
    )
    |> Repo.update_all([])

    :ok
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

  # Takes the meal already loaded (with items + food/recipe preloaded) — building
  # the snapshot must not re-query what the caller just fetched.
  defp build_planned_snapshot(nil), do: nil

  defp build_planned_snapshot(%Meal{} = meal) do
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

  defp do_log_meal(business_id, client_id, date, meal_slot, meal_id) do
    meal = load_meal_with_items(business_id, client_id, meal_id) || Repo.rollback(:not_found)
    snapshot = build_planned_snapshot(meal)

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
      case create_food_log_entry(business_id, meal_log_id, build_entry_attrs(item), item.id, item) do
        {:ok, entry} -> [entry | acc]
        {:error, reason} -> Repo.rollback(reason)
      end
    end
  end

  # `item` is the planned MealItem with food/recipe already preloaded, when the
  # caller has one — it saves re-fetching rows loaded two frames up the stack.
  defp create_food_log_entry(business_id, meal_log_id, attrs, meal_item_id, item \\ nil) do
    changeset =
      business_id
      |> FoodLogEntry.insert_changeset(meal_log_id, attrs)
      |> put_meal_item(meal_item_id)

    if changeset.valid? do
      changeset
      |> resolve_and_compute(business_id, item)
      |> validate_required([:food_name])
      |> Repo.insert()
    else
      {:error, %{changeset | action: :insert}}
    end
  end

  defp put_meal_item(changeset, nil), do: changeset
  defp put_meal_item(changeset, meal_item_id), do: put_change(changeset, :nutrition_meal_item_id, meal_item_id)

  # The client names the planned item it is fulfilling by id. Scoped to the meal
  # already resolved for this slot, so a client cannot point an entry at another
  # business's item; an unknown id simply logs unreconciled rather than failing.
  defp resolve_meal_item_id(_business_id, nil, _meal_item_id), do: nil
  defp resolve_meal_item_id(_business_id, _meal_id, nil), do: nil

  defp resolve_meal_item_id(business_id, meal_id, meal_item_id) do
    MealItem
    |> MealItem.for_business(business_id)
    |> MealItem.for_meal(meal_id)
    |> select([mi], mi.id)
    |> Repo.get(meal_item_id)
  end

  defp update_food_log_entry(%FoodLogEntry{} = entry, business_id, attrs) do
    entry
    |> FoodLogEntry.update_changeset(attrs)
    |> maybe_recompute_macros(entry, business_id)
    |> Repo.update()
  end

  defp resolve_and_compute(changeset, business_id, item) do
    food_id = get_field(changeset, :food_id)
    recipe_id = get_field(changeset, :recipe_id)
    weight_g = get_field(changeset, :weight_g)

    cond do
      not is_nil(food_id) ->
        resolve_food(changeset, food_id, business_id, weight_g, preloaded_food(item, food_id))

      not is_nil(recipe_id) ->
        resolve_recipe(
          changeset,
          recipe_id,
          business_id,
          weight_g,
          get_field(changeset, :amount),
          preloaded_recipe(item, recipe_id)
        )

      true ->
        changeset
    end
  end

  defp preloaded_food(%MealItem{food: %Food{id: id} = food}, id), do: food
  defp preloaded_food(_item, _food_id), do: nil

  defp preloaded_recipe(%MealItem{recipe: %Recipe{id: id} = recipe}, id), do: recipe
  defp preloaded_recipe(_item, _recipe_id), do: nil

  defp resolve_food(changeset, food_id, business_id, weight_g, preloaded) do
    food = preloaded || Food |> Food.for_business_or_system(business_id) |> Repo.get(food_id)

    case food do
      nil ->
        add_error(changeset, :food_id, "food not found")

      food ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || food.name)
        |> put_macros(MacroCalc.for_food(food, weight_g))
    end
  end

  defp resolve_recipe(changeset, recipe_id, business_id, weight_g, amount, preloaded) do
    recipe = preloaded || load_recipe_with_ingredients(business_id, recipe_id)

    case recipe do
      nil ->
        add_error(changeset, :recipe_id, "recipe not found")

      recipe ->
        changeset
        |> put_change(:food_name, get_field(changeset, :food_name) || recipe.name)
        |> validate_recipe_weighable(recipe, weight_g)
        |> put_macros(recipe_macros(recipe, weight_g, amount))
    end
  end

  # Mirrors Meals.validate_recipe_weighable/2: no cooked weight -> no gram
  # denominator, so the entry can only be sized in servings.
  defp validate_recipe_weighable(changeset, _recipe, nil), do: changeset

  defp validate_recipe_weighable(changeset, %Recipe{cooked_weight_g: cooked}, _weight_g)
       when is_number(cooked) and cooked > 0,
       do: changeset

  defp validate_recipe_weighable(changeset, _recipe, _weight_g),
    do: add_error(changeset, :weight_g, "this recipe has no cooked weight — size it in servings")

  # A recipe with no logged grams is priced in servings, matching MacroCalc.for_meal_item/1.
  defp recipe_macros(recipe, nil, amount), do: MacroCalc.for_recipe_servings(recipe, amount)
  defp recipe_macros(recipe, weight_g, _amount), do: MacroCalc.for_recipe(recipe, weight_g)

  defp load_recipe_with_ingredients(business_id, recipe_id) do
    Recipe
    |> Recipe.for_business(business_id)
    |> Recipe.include_ingredient_foods(business_id)
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

        changeset
        |> validate_recipe_weighable(recipe, weight_g)
        |> put_macros(recipe_macros(recipe, weight_g, amount))

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
      "source" => "planned"
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
    {:ok, MealLog.for_date(query, date)}
  end

  defp apply_date_filters(query, _date, from_date, to_date)
       when not is_nil(from_date) and not is_nil(to_date) do
    cond do
      Date.compare(from_date, to_date) == :gt -> {:error, :invalid_date_range}
      Date.diff(to_date, from_date) > 30 -> {:error, :date_range_too_wide}
      true -> {:ok, MealLog.for_date_range(query, from_date, to_date)}
    end
  end

  defp apply_date_filters(_query, _date, from_date, to_date)
       when not is_nil(from_date) or not is_nil(to_date),
       do: {:error, :incomplete_date_range}

  # No filter given -> today's logs. This is what keeps these list endpoints
  # bounded (per-day/per-week reads); without it "no params" returned the
  # client's entire history with every entry preloaded.
  defp apply_date_filters(query, _date, _from_date, _to_date),
    do: {:ok, MealLog.for_date(query, Date.utc_today())}

  # Entry getter scoped to a specific client.
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
