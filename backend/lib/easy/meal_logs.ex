defmodule Easy.MealLogs do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.MacroCalc
  alias Easy.MealSlot
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

  # Diary rows for one meal log: freeze items plus extras, each with a status.
  # Callers render this; they do not join the live plan to raw entries.
  @spec diary_rows(MealLog.t()) :: [map()]
  def diary_rows(%MealLog{} = meal_log) do
    entries = List.wrap(meal_log.food_log_entries)
    planned_items = snapshot_items(meal_log.planned_snapshot)

    fulfilments =
      entries
      |> Enum.filter(& &1.planned_item_id)
      |> Map.new(&{&1.planned_item_id, &1})

    planned_rows =
      Enum.map(planned_items, fn item ->
        id = snap_get(item, :id)

        case id && Map.get(fulfilments, id) do
          nil ->
            %{status: :skipped, planned: normalize_planned(item), entry: nil}

          entry ->
            %{
              status: fulfilment_status(item, entry),
              planned: normalize_planned(item),
              entry: entry
            }
        end
      end)

    paired_entry_ids =
      planned_rows
      |> Enum.map(& &1.entry)
      |> Enum.reject(&is_nil/1)
      |> MapSet.new(& &1.id)

    added_rows =
      entries
      |> Enum.reject(&MapSet.member?(paired_entry_ids, &1.id))
      |> Enum.map(fn entry ->
        %{status: :added, planned: nil, entry: entry}
      end)

    # Prefer planned order, then extras in log order.
    planned_rows ++ added_rows
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

  # One reconciled day: live options + diary rows + targets. Replaces today-map +
  # meal-log list + frontend join for both apps.
  @spec get_client_nutrition_day(Ctx.t(), Date.t()) :: {:ok, map()} | {:error, :not_found}
  def get_client_nutrition_day(%Ctx{} = ctx, %Date{} = date) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      {:ok, build_nutrition_day(ctx.business_id, client_id, date)}
    end
  end

  @spec get_nutrition_day_for_client(Ctx.t(), String.t(), Date.t()) ::
          {:ok, map()} | {:error, :not_found}
  def get_nutrition_day_for_client(%Ctx{} = ctx, client_id, %Date{} = date) do
    with {:ok, _client} <- Clients.authorize_client(ctx, client_id) do
      {:ok, build_nutrition_day(ctx.business_id, client_id, date)}
    end
  end

  @spec list_client_nutrition_days(Ctx.t(), keyword()) ::
          {:ok, [map()]}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_client_nutrition_days(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, dates} <- resolve_nutrition_day_dates(opts) do
      {:ok, build_nutrition_days(ctx.business_id, client_id, dates)}
    end
  end

  @spec list_nutrition_days_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, [map()]}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_nutrition_days_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with {:ok, _client} <- Clients.authorize_client(ctx, client_id),
         {:ok, dates} <- resolve_nutrition_day_dates(opts) do
      {:ok, build_nutrition_days(ctx.business_id, client_id, dates)}
    end
  end

  @spec log_client_planned_item(Ctx.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def log_client_planned_item(%Ctx{} = ctx, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      log_entry(ctx.business_id, client_id, attrs)
    end
  end

  @spec add_client_extra(Ctx.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def add_client_extra(%Ctx{} = ctx, attrs) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      log_entry(ctx.business_id, client_id, Map.delete(attrs, :planned_item_id))
    end
  end

  @spec replace_client_item(Ctx.t(), map()) ::
          {:ok, FoodLogEntry.t()} | {:error, any()}
  def replace_client_item(%Ctx{} = ctx, attrs) do
    meal_slot = attrs[:meal_slot]
    planned_item_id = attrs[:planned_item_id]
    explicit_meal_id = attrs[:meal_id]

    with {:ok, client_id} <- Ctx.fetch_client_id(ctx),
         {:ok, date} <- fetch_date(attrs),
         true <- is_binary(planned_item_id) do
      Repo.transaction(fn ->
        replace_item_transaction(
          ctx.business_id,
          client_id,
          date,
          meal_slot,
          explicit_meal_id,
          planned_item_id,
          attrs
        )
      end)
    else
      false -> {:error, :not_found}
      {:error, reason} -> {:error, reason}
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
      |> where([e], not is_nil(e.planned_item_id))
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
        update_freeze(existing, snapshot, meal_id)

      %MealLog{} = existing ->
        maybe_refresh_unfulfilled_freeze(existing, snapshot, meal_id)

      nil ->
        insert_meal_log(business_id, client_id, date, meal_slot, snapshot, meal_id)
    end
  end

  # Same option, no fulfilments yet: coach may still be editing the meal. Refresh
  # the freeze from the live meal. Once any fulfilment exists, the freeze is a fact.
  defp maybe_refresh_unfulfilled_freeze(%MealLog{} = existing, snapshot, meal_id) do
    same_option? =
      is_nil(meal_id) or is_nil(existing.nutrition_meal_id) or meal_id == existing.nutrition_meal_id

    if same_option? and not is_nil(snapshot) and not has_fulfilments?(existing.id) do
      update_freeze(existing, snapshot, meal_id || existing.nutrition_meal_id)
    else
      {:ok, existing}
    end
  end

  defp update_freeze(%MealLog{} = meal_log, snapshot, meal_id) do
    meal_log
    |> change(nutrition_meal_id: meal_id, planned_snapshot: snapshot)
    |> put_change(:planned_calories, snapshot && (snap_get(snapshot, :total_calories) || 0.0) * 1.0)
    |> Repo.update()
  end

  defp has_fulfilments?(meal_log_id) do
    FoodLogEntry
    |> FoodLogEntry.for_meal_log(meal_log_id)
    |> where([e], not is_nil(e.planned_item_id))
    |> Repo.exists?()
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

    {entry_attrs, planned_item_id, preload_item} =
      case attrs[:planned_item_id] do
        nil ->
          {attrs, nil, nil}

        id ->
          case prepare_planned_log_attrs(meal_log, meal, id, attrs) do
            {:ok, prepared, item} -> {prepared, id, item}
            {:error, reason} -> Repo.rollback(reason)
          end
      end

    with {:ok, entry} <-
           create_food_log_entry(business_id, meal_log.id, entry_attrs, planned_item_id, preload_item),
         {:ok, _meal_log} <- recalculate_logged_calories(meal_log),
         :ok <- stamp_client_activity(business_id, client_id, occurred_at) do
      entry
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp replace_item_transaction(
         business_id,
         client_id,
         date,
         meal_slot,
         explicit_meal_id,
         planned_item_id,
         attrs
       ) do
    occurred_at = DateTime.utc_now(:second)
    meal_id = resolve_slot_meal_id(business_id, client_id, date, meal_slot, explicit_meal_id)
    meal = meal_id && load_meal_with_items(business_id, client_id, meal_id)
    snapshot = build_planned_snapshot(meal)
    validate_snapshot!(meal_id, snapshot)
    meal_log = get_or_create_meal_log!(business_id, client_id, date, meal_slot, snapshot, meal_id)

    unless freeze_has_planned_item?(meal_log, planned_item_id) do
      Repo.rollback(:not_found)
    end

    FoodLogEntry
    |> FoodLogEntry.for_meal_log(meal_log.id)
    |> where([e], e.planned_item_id == ^planned_item_id)
    |> Repo.delete_all()

    with {:ok, entry} <- create_food_log_entry(business_id, meal_log.id, attrs, planned_item_id),
         {:ok, _meal_log} <- recalculate_logged_calories(meal_log),
         :ok <- stamp_client_activity(business_id, client_id, occurred_at) do
      entry
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  # Log-planned: food/recipe come from the freeze (or live meal item). Portion
  # stays client-supplied. Unknown planned ids fail rather than logging extras.
  defp prepare_planned_log_attrs(meal_log, meal, planned_item_id, attrs) do
    with true <- freeze_has_planned_item?(meal_log, planned_item_id),
         item when not is_nil(item) <-
           find_freeze_item(meal_log, planned_item_id) || find_live_meal_item(meal, planned_item_id) do
      {:ok, merge_planned_identity(attrs, item), find_live_meal_item(meal, planned_item_id)}
    else
      false -> {:error, :not_found}
      nil -> {:error, :not_found}
    end
  end

  defp merge_planned_identity(attrs, %MealItem{} = item) do
    cond do
      not is_nil(item.food_id) ->
        attrs |> Map.put(:food_id, item.food_id) |> Map.delete(:recipe_id)

      not is_nil(item.recipe_id) ->
        attrs |> Map.put(:recipe_id, item.recipe_id) |> Map.delete(:food_id)

      true ->
        attrs
    end
  end

  defp merge_planned_identity(attrs, item) when is_map(item) do
    food_id = snap_get(item, :food_id)
    recipe_id = snap_get(item, :recipe_id)

    cond do
      not is_nil(food_id) ->
        attrs |> Map.put(:food_id, food_id) |> Map.delete(:recipe_id)

      not is_nil(recipe_id) ->
        attrs |> Map.put(:recipe_id, recipe_id) |> Map.delete(:food_id)

      true ->
        attrs
    end
  end

  defp freeze_has_planned_item?(%MealLog{} = meal_log, planned_item_id) do
    meal_log.planned_snapshot
    |> snapshot_items()
    |> Enum.any?(fn item -> snap_get(item, :id) == planned_item_id end)
  end

  defp find_freeze_item(%MealLog{} = meal_log, planned_item_id) do
    meal_log.planned_snapshot
    |> snapshot_items()
    |> Enum.find(fn item -> snap_get(item, :id) == planned_item_id end)
  end

  defp find_live_meal_item(nil, _planned_item_id), do: nil

  defp find_live_meal_item(%Meal{meal_items: items}, planned_item_id) when is_list(items) do
    Enum.find(items, &(&1.id == planned_item_id))
  end

  defp find_live_meal_item(_meal, _planned_item_id), do: nil

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
      business_id: business_id,
      nutrition_meal_log_id: meal_log_id,
      planned_item_id: item.id,
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

    freeze_ids =
      meal_log.planned_snapshot
      |> snapshot_items()
      |> Enum.map(&snap_get(&1, :id))
      |> Enum.reject(&is_nil/1)
      |> MapSet.new()

    already_logged =
      FoodLogEntry
      |> FoodLogEntry.for_meal_log(meal_log.id)
      |> FoodLogEntry.logged_planned_item_ids()
      |> Repo.all()
      |> MapSet.new()

    # Once the freeze is stable, only fulfil items that were frozen — later builder
    # additions are tomorrow's plan, not this day's diary.
    entries =
      meal.meal_items
      |> Enum.filter(&MapSet.member?(freeze_ids, &1.id))
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
  defp create_food_log_entry(business_id, meal_log_id, attrs, planned_item_id, item \\ nil) do
    changeset =
      business_id
      |> FoodLogEntry.insert_changeset(meal_log_id, attrs)
      |> put_planned_item_id(planned_item_id)

    if changeset.valid? do
      changeset
      |> resolve_and_compute(business_id, item)
      |> validate_required([:food_name])
      |> Repo.insert()
    else
      {:error, %{changeset | action: :insert}}
    end
  end

  defp put_planned_item_id(changeset, nil), do: changeset

  defp put_planned_item_id(changeset, planned_item_id),
    do: put_change(changeset, :planned_item_id, planned_item_id)

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
      "weight_g" => item.weight_g
    }
  end

  defp snapshot_item(%MealItem{} = item) do
    macros = MacroCalc.for_meal_item(item)
    {name, _} = item_name(item)

    %{
      id: item.id,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
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

  defp snapshot_items(nil), do: []

  defp snapshot_items(snapshot) when is_map(snapshot) do
    case snap_get(snapshot, :items) do
      items when is_list(items) -> items
      _ -> []
    end
  end

  defp snapshot_items(_), do: []

  defp normalize_planned(item) when is_map(item) do
    %{
      id: snap_get(item, :id),
      food_id: snap_get(item, :food_id),
      recipe_id: snap_get(item, :recipe_id),
      food_name: snap_get(item, :food_name),
      amount: snap_get(item, :amount),
      unit: snap_get(item, :unit),
      weight_g: snap_get(item, :weight_g),
      calories: snap_get(item, :calories),
      protein_g: snap_get(item, :protein_g),
      carbs_g: snap_get(item, :carbs_g),
      fat_g: snap_get(item, :fat_g),
      fiber_g: snap_get(item, :fiber_g)
    }
  end

  defp fulfilment_status(planned, %FoodLogEntry{} = entry) do
    if same_food_or_recipe?(planned, entry), do: :as_planned, else: :swapped
  end

  defp same_food_or_recipe?(planned, entry) do
    planned_food_id = snap_get(planned, :food_id)
    planned_recipe_id = snap_get(planned, :recipe_id)

    cond do
      not is_nil(planned_food_id) -> planned_food_id == entry.food_id
      not is_nil(planned_recipe_id) -> planned_recipe_id == entry.recipe_id
      true -> false
    end
  end

  defp snap_get(map, key) when is_map(map) and is_atom(key) do
    Map.get(map, key) || Map.get(map, Atom.to_string(key))
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

  defp resolve_nutrition_day_dates(opts) do
    date = Keyword.get(opts, :date)
    from_date = Keyword.get(opts, :from)
    to_date = Keyword.get(opts, :to)

    cond do
      not is_nil(date) ->
        {:ok, [date]}

      not is_nil(from_date) and not is_nil(to_date) ->
        cond do
          Date.compare(from_date, to_date) == :gt ->
            {:error, :invalid_date_range}

          Date.diff(to_date, from_date) > 30 ->
            {:error, :date_range_too_wide}

          true ->
            {:ok, Enum.to_list(Date.range(from_date, to_date))}
        end

      not is_nil(from_date) or not is_nil(to_date) ->
        {:error, :incomplete_date_range}

      true ->
        {:ok, [Date.utc_today()]}
    end
  end

  defp build_nutrition_days(business_id, client_id, dates) do
    logs_by_date =
      MealLog
      |> MealLog.for_client(business_id, client_id)
      |> MealLog.for_date_range(hd(dates), List.last(dates))
      |> MealLog.oldest()
      |> MealLog.include_entries()
      |> Repo.all()
      |> Enum.group_by(& &1.date)

    plans = load_nutrition_day_plans(business_id, client_id, dates)

    Enum.map(dates, fn date ->
      schedule = nutrition_day_schedule(plans, date)
      logs = Map.get(logs_by_date, date, [])
      assemble_nutrition_day(date, schedule, logs)
    end)
  end

  defp build_nutrition_day(business_id, client_id, date) do
    business_id
    |> build_nutrition_days(client_id, [date])
    |> hd()
  end

  defp load_nutrition_day_plans(business_id, client_id, dates) do
    from_date = hd(dates)
    to_date = List.last(dates)

    Plan
    |> Plan.for_client(business_id, client_id)
    |> Plan.for_status(:active)
    |> where([plan], is_nil(plan.start_date) or plan.start_date <= ^to_date)
    |> where([plan], is_nil(plan.end_date) or plan.end_date >= ^from_date)
    |> Plan.newest()
    |> preload(days: ^PlanDay.include_day_meals(PlanDay.by_position(), business_id))
    |> Repo.all()
  end

  defp nutrition_day_schedule(plans, date) do
    case Enum.find(plans, &plan_active_on?(&1, date)) do
      nil ->
        %{plan: nil, slots: [], chosen: %{}}

      plan ->
        day_name = Easy.Utils.weekday_name(date)
        day = Enum.find(plan.days, &(day_name in &1.weekdays))
        %{plan: plan, slots: schedule_slots_from_day(day), chosen: %{}}
    end
  end

  defp plan_active_on?(plan, date) do
    (is_nil(plan.start_date) or Date.compare(plan.start_date, date) != :gt) and
      (is_nil(plan.end_date) or Date.compare(plan.end_date, date) != :lt)
  end

  defp schedule_slots_from_day(nil), do: []

  defp schedule_slots_from_day(day) do
    day.day_meals
    |> Enum.group_by(& &1.meal_slot)
    |> Enum.map(fn {slot, options} ->
      %{meal_slot: slot, options: Enum.sort_by(options, & &1.position)}
    end)
    |> Enum.sort_by(fn %{meal_slot: slot} ->
      Enum.find_index(MealSlot.values(), &(&1 == slot)) || length(MealSlot.values())
    end)
  end

  defp assemble_nutrition_day(date, schedule, logs) do
    plan = schedule.plan
    plan_slots = Map.new(schedule.slots, fn %{meal_slot: slot, options: options} -> {slot, options} end)
    logs_by_slot = Map.new(logs, fn ml -> {ml.meal_slot, ml} end)

    slot_keys =
      (Map.keys(plan_slots) ++ Map.keys(logs_by_slot))
      |> Enum.uniq()
      |> Enum.sort_by(fn slot -> Enum.find_index(MealSlot.values(), &(&1 == slot)) || 99 end)

    %{
      date: date,
      plan_id: plan && plan.id,
      targets: day_targets(plan),
      slots:
        Enum.map(slot_keys, fn slot ->
          options = Map.get(plan_slots, slot, [])
          meal_log = Map.get(logs_by_slot, slot)
          chosen_id = Map.get(schedule.chosen, to_string(slot)) || (meal_log && meal_log.nutrition_meal_id)
          active = active_day_meal(options, chosen_id)

          %{
            meal_slot: slot,
            meal_id: chosen_id || (active && active.nutrition_meal_id),
            planned_calories: slot_planned_calories(meal_log, active),
            logged_calories: (meal_log && meal_log.logged_calories) || 0.0,
            options: Enum.map(options, &day_option/1),
            rows: if(meal_log, do: diary_rows(meal_log), else: [])
          }
        end)
    }
  end

  defp day_targets(nil),
    do: %{calories: nil, protein_g: nil, carbs_g: nil, fat_g: nil, fiber_g: nil}

  defp day_targets(%Plan{} = plan) do
    %{
      calories: plan.target_calories,
      protein_g: plan.target_protein_g,
      carbs_g: plan.target_carbs_g,
      fat_g: plan.target_fat_g,
      fiber_g: plan.target_fiber_g
    }
  end

  defp active_day_meal([], _chosen_id), do: nil
  defp active_day_meal(options, nil), do: hd(options)

  defp active_day_meal(options, chosen_id) do
    Enum.find(options, hd(options), &(&1.nutrition_meal_id == chosen_id))
  end

  defp slot_planned_calories(%MealLog{planned_calories: cal}, _active) when not is_nil(cal), do: cal

  defp slot_planned_calories(_meal_log, %DayMeal{meal: %Meal{meal_items: items}}) when is_list(items) do
    MacroCalc.meal_totals(items).calories
  end

  defp slot_planned_calories(_meal_log, _active), do: 0.0

  defp day_option(%DayMeal{} = day_meal) do
    meal = day_meal.meal

    items =
      case meal do
        %Meal{meal_items: items} when is_list(items) -> items
        _ -> []
      end

    %{
      meal_id: day_meal.nutrition_meal_id,
      meal_name: if(match?(%Meal{}, meal), do: meal.name, else: nil),
      position: day_meal.position,
      items: Enum.map(items, &day_option_item/1)
    }
  end

  defp day_option_item(%MealItem{} = item) do
    {food_name, nutrition} =
      case {item.food, item.recipe} do
        {%Food{} = f, _} ->
          {f.name,
           %{
             calories_per_100g: f.calories_per_100g,
             protein_g_per_100g: f.protein_g_per_100g,
             carbs_g_per_100g: f.carbs_g_per_100g,
             fat_g_per_100g: f.fat_g_per_100g,
             fiber_g_per_100g: f.fiber_g_per_100g
           }}

        {_, %Recipe{} = r} ->
          {r.name, MacroCalc.recipe_totals(r)}

        _ ->
          {nil, nil}
      end

    %{
      meal_item_id: item.id,
      position: item.position,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      food_name: food_name,
      amount: item.amount,
      unit: item.unit,
      weight_g: item.weight_g,
      nutrition: nutrition
    }
  end

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
