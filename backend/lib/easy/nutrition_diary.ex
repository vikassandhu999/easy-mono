defmodule Easy.Nutrition.Diary do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.LocalCalendar

  alias Easy.Nutrition.{
    DiaryCommandLedger,
    DiaryEntry,
    DiaryFrozenOption,
    DiaryFrozenPlannedItem,
    DiarySlot,
    Food,
    Library,
    Meal,
    MealItem,
    MealOption,
    MealSlot,
    NutrientTotals,
    Programming,
    Recipe
  }

  alias Easy.Repo

  import Ecto.Query

  @correction_days 7

  @spec get_client_nutrition_day(Ctx.t(), Date.t()) :: {:ok, map()} | {:error, :not_found}
  def get_client_nutrition_day(%Ctx{} = ctx, %Date{} = date) do
    with {:ok, [day]} <- list_client_nutrition_days(ctx, date: date) do
      {:ok, day}
    end
  end

  @spec get_nutrition_day_for_client(Ctx.t(), String.t(), Date.t()) ::
          {:ok, map()} | {:error, :not_found}
  def get_nutrition_day_for_client(%Ctx{} = ctx, client_id, %Date{} = date) do
    with {:ok, [day]} <- list_nutrition_days_for_client(ctx, client_id, date: date) do
      {:ok, day}
    end
  end

  @spec list_client_nutrition_days(Ctx.t(), keyword()) ::
          {:ok, [map()]}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_client_nutrition_days(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client} <- Clients.get_client_account(ctx) do
      list_days(ctx, client, opts, :client)
    end
  end

  @spec list_nutrition_days_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, [map()]}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_nutrition_days_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with {:ok, client} <- Clients.authorize_client(ctx, client_id) do
      list_days(ctx, client, opts, :coach)
    end
  end

  @spec add_client_extra(Ctx.t(), Date.t(), map(), String.t()) ::
          {:ok, map()}
          | {:error,
             :not_found
             | :client_inactive
             | :invalid_idempotency_key
             | :invalid_portion
             | :future_date
             | :outside_correction_window
             | :conflict
             | Ecto.Changeset.t()}
  def add_client_extra(%Ctx{} = ctx, %Date{} = date, attrs, key) when is_binary(key) do
    with {:ok, uuid} <- cast_uuid(key),
         {:ok, client} <- load_active_client(ctx),
         {:ok, command} <- cast_extra_command(attrs) do
      fingerprint = extra_fingerprint(date, command)
      replay_or_run(client, uuid, fingerprint, fn -> record_extra(ctx, client, date, command) end)
    end
  end

  def add_client_extra(%Ctx{}, %Date{}, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec log_client_planned_item(Ctx.t(), Date.t(), map(), String.t()) ::
          {:ok, map()}
          | {:error,
             :not_found
             | :client_inactive
             | :invalid_idempotency_key
             | :future_date
             | :outside_correction_window
             | :cannot_start_past_slot
             | :conflict
             | Ecto.Changeset.t()}
  def log_client_planned_item(%Ctx{} = ctx, %Date{} = date, attrs, key) when is_binary(key) do
    with {:ok, uuid} <- cast_uuid(key),
         {:ok, client} <- load_active_client(ctx),
         {:ok, command} <- cast_planned_item_command(attrs) do
      fingerprint = planned_item_fingerprint(date, command)
      replay_or_run(client, uuid, fingerprint, fn -> record_planned_item(ctx, client, date, command) end)
    end
  end

  def log_client_planned_item(%Ctx{}, %Date{}, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec log_client_planned_option(Ctx.t(), Date.t(), map(), String.t()) ::
          {:ok, map()}
          | {:error,
             :not_found
             | :client_inactive
             | :invalid_idempotency_key
             | :future_date
             | :outside_correction_window
             | :cannot_start_past_slot
             | :conflict
             | Ecto.Changeset.t()}
  def log_client_planned_option(%Ctx{} = ctx, %Date{} = date, attrs, key) when is_binary(key) do
    with {:ok, uuid} <- cast_uuid(key),
         {:ok, client} <- load_active_client(ctx),
         {:ok, command} <- cast_planned_option_command(attrs) do
      fingerprint = planned_option_fingerprint(date, command)
      replay_or_run(client, uuid, fingerprint, fn -> record_planned_option(ctx, client, date, command) end)
    end
  end

  def log_client_planned_option(%Ctx{}, %Date{}, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec log_client_planned_day(Ctx.t(), Date.t(), String.t()) ::
          {:ok, map()}
          | {:error,
             :not_found
             | :client_inactive
             | :invalid_idempotency_key
             | :future_date
             | :outside_correction_window
             | :conflict
             | Ecto.Changeset.t()}
  def log_client_planned_day(%Ctx{} = ctx, %Date{} = date, key) when is_binary(key) do
    with {:ok, uuid} <- cast_uuid(key),
         {:ok, client} <- load_active_client(ctx) do
      fingerprint = planned_day_fingerprint(date)
      replay_or_run(client, uuid, fingerprint, fn -> record_planned_day(ctx, client, date) end)
    end
  end

  def log_client_planned_day(%Ctx{}, %Date{}, _key), do: {:error, :invalid_idempotency_key}

  @spec purge_expired_command_ledger(DateTime.t()) :: {:ok, non_neg_integer()}
  def purge_expired_command_ledger(now \\ DateTime.utc_now(:second)) do
    ids =
      DiaryCommandLedger
      |> DiaryCommandLedger.expired(now)
      |> then(&from(row in &1, select: row.id, limit: 1000))
      |> Repo.all()

    {:ok, delete_expired_ids(ids)}
  end

  defp delete_expired_ids([]), do: 0

  defp delete_expired_ids(ids) do
    {count, nil} = Repo.delete_all(from(row in DiaryCommandLedger, where: row.id in ^ids))
    count
  end

  defp list_days(ctx, client, opts, actor) do
    client = Repo.preload(client, :business)

    with {:ok, dates} <- resolve_dates(opts, local_today(client)) do
      {:ok, Enum.map(dates, &assemble_day(ctx, client, &1, actor))}
    end
  end

  defp assemble_day(ctx, client, date, actor) do
    today = local_today(client)
    frozen = frozen_by_slot(client, date)

    case live_guidance(ctx, client.id, date, today, actor) do
      {:ok, nil} -> merge_day(date, today, nil, frozen)
      {:ok, guidance} -> merge_day(date, today, guidance, frozen)
    end
  end

  defp merge_day(date, today, guidance, frozen) do
    live = if guidance, do: live_slot_map(guidance), else: %{}

    slots =
      MealSlot.values()
      |> Enum.map(&merged_slot(&1, frozen, live, today))
      |> Enum.reject(&is_nil/1)

    %{
      date: date,
      plan_id: guidance && guidance.plan.id,
      write_eligible: Date.diff(today, date) in 0..@correction_days,
      targets: if(guidance, do: targets(guidance.plan), else: empty_targets()),
      slots: slots
    }
  end

  defp merged_slot(slot, frozen, live, today) do
    cond do
      Map.has_key?(frozen, slot) -> frozen_slot_view(Map.fetch!(frozen, slot), today)
      Map.has_key?(live, slot) -> Map.fetch!(live, slot)
      true -> nil
    end
  end

  defp live_guidance(ctx, client_id, date, today, actor) do
    if Date.compare(date, today) == :lt do
      {:ok, nil}
    else
      resolve_guidance(ctx, client_id, date, actor)
    end
  end

  defp resolve_guidance(ctx, _client_id, date, :client), do: Programming.resolve_client_coverage(ctx, date)
  defp resolve_guidance(ctx, client_id, date, :coach), do: Programming.resolve_coverage_for_client(ctx, client_id, date)

  defp live_slot_map(%{plan: plan, day_pattern: pattern}) do
    Map.new(live_slots(pattern, plan), &{&1.meal_slot, &1})
  end

  defp frozen_by_slot(client, date) do
    DiarySlot
    |> DiarySlot.for_client(client.business_id, client.id)
    |> DiarySlot.for_date(date)
    |> DiarySlot.include_frozen(client.business_id)
    |> Repo.all()
    |> Map.new(&{&1.meal_slot, &1})
  end

  defp live_slots(nil, _plan), do: []

  defp live_slots(pattern, plan) do
    meals = Map.new(List.wrap(plan.meals), &{&1.id, &1})
    grouped = Enum.group_by(List.wrap(pattern.meal_options), & &1.meal_slot)

    MealSlot.values()
    |> Enum.filter(&Map.has_key?(grouped, &1))
    |> Enum.map(&slot_from_options(&1, Map.fetch!(grouped, &1), meals))
  end

  defp slot_from_options(slot, options, meals) do
    ordered = Enum.sort_by(options, &{&1.position, &1.id})
    default = hd(ordered)
    items = meal_items(meals[default.nutrition_meal_id])

    %{
      meal_slot: slot,
      meal_id: default.nutrition_meal_id,
      planned_calories: planned_calories(items),
      logged_calories: 0.0,
      options: Enum.map(ordered, &option_data(&1, meals)),
      rows: []
    }
  end

  defp frozen_slot_view(%DiarySlot{} = slot, today) do
    ordered = Enum.sort_by(slot.frozen_options, &{&1.position, &1.id})
    active = active_frozen_option(slot, ordered)
    items = if active, do: active.planned_items, else: []

    %{
      meal_slot: slot.meal_slot,
      meal_id: active && active.nutrition_meal_id,
      planned_calories: planned_calories(items),
      logged_calories: logged_calories(slot.entries),
      options: Enum.map(ordered, &frozen_option_data/1),
      rows: frozen_rows(slot, active, today)
    }
  end

  defp active_frozen_option(%DiarySlot{active_frozen_option_id: id}, options) when not is_nil(id) do
    Enum.find(options, &(&1.id == id)) || List.first(options)
  end

  defp active_frozen_option(_slot, options), do: List.first(options)

  defp frozen_rows(%DiarySlot{has_coverage: false} = slot, _active, _today) do
    Enum.map(slot.entries, &row(:recorded, nil, &1))
  end

  defp frozen_rows(%DiarySlot{} = slot, active, today) do
    planned = if active, do: List.wrap(active.planned_items), else: []
    planned_ids = MapSet.new(planned, & &1.id)
    extras = Enum.reject(slot.entries, &MapSet.member?(planned_ids, &1.frozen_planned_item_id))

    Enum.map(planned, &planned_row(&1, slot, today)) ++ Enum.map(extras, &row(:added, nil, &1))
  end

  defp planned_row(item, slot, today) do
    entry = Enum.find(slot.entries, &(&1.frozen_planned_item_id == item.id))
    row(planned_status(entry, item, slot.local_date, today), frozen_item_data(item), entry)
  end

  defp planned_status(nil, _item, date, today) do
    if Date.compare(date, today) == :lt, do: :skipped, else: :pending
  end

  defp planned_status(entry, item, _date, _today) do
    if same_source?(entry, item), do: :as_planned, else: :swapped
  end

  defp same_source?(entry, item) do
    entry.kind == item.kind and entry.food_id == item.food_id and entry.recipe_id == item.recipe_id
  end

  defp row(status, planned, entry) do
    %{status: status, planned: planned, entry: entry && entry_data(entry)}
  end

  defp option_data(%MealOption{} = option, meals) do
    meal = meals[option.nutrition_meal_id]
    items = meal_items(meal)

    %{
      meal_id: option.nutrition_meal_id,
      meal_name: meal && meal.name,
      position: option.position,
      items: Enum.map(items, &item_data/1)
    }
  end

  defp frozen_option_data(%DiaryFrozenOption{} = option) do
    %{
      meal_id: option.nutrition_meal_id,
      meal_name: option.meal_name,
      position: option.position,
      items: Enum.map(option.planned_items, &frozen_item_data/1)
    }
  end

  defp item_data(%MealItem{} = item) do
    %{
      meal_item_id: item.id,
      kind: item_kind(item),
      name: item_name(item),
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      position: item.position,
      portion: portion_data(item),
      nutrients: NutrientTotals.from_fields(item)
    }
  end

  defp frozen_item_data(%DiaryFrozenPlannedItem{} = item) do
    %{
      meal_item_id: item.id,
      kind: item.kind,
      name: item.display_name,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      position: item.position,
      portion: frozen_portion(item),
      nutrients: NutrientTotals.from_fields(item)
    }
  end

  defp entry_data(%DiaryEntry{} = entry) do
    %{
      id: entry.id,
      kind: entry.kind,
      name: entry.display_name,
      food_id: entry.food_id,
      recipe_id: entry.recipe_id,
      portion: frozen_portion(entry),
      nutrients: NutrientTotals.from_fields(entry),
      notes: entry.notes,
      revision: entry.revision,
      inserted_at: entry.inserted_at,
      updated_at: entry.updated_at
    }
  end

  defp item_kind(%MealItem{food_id: food_id}) when not is_nil(food_id), do: :food
  defp item_kind(%MealItem{}), do: :recipe

  defp item_name(%MealItem{food: %Food{name: name}}), do: name
  defp item_name(%MealItem{recipe: %Recipe{name: name}}), do: name
  defp item_name(_item), do: nil

  defp portion_data(%MealItem{} = item) do
    %{kind: item.portion_kind, grams: item.weight_g, amount: item.amount, unit: item.unit, label: item.serving_label}
  end

  defp frozen_portion(item) do
    %{
      kind: item.portion_kind,
      grams: item.weight_g,
      amount: item.amount,
      unit: item.unit,
      label: item.serving_label
    }
  end

  defp meal_items(%Meal{meal_items: items}) when is_list(items), do: items
  defp meal_items(_meal), do: []

  defp planned_calories(items) do
    NutrientTotals.sum(items).calories
  end

  defp logged_calories(entries) do
    entries
    |> Enum.map(& &1.calories)
    |> Enum.reject(&is_nil/1)
    |> Enum.sum()
  end

  defp targets(plan) do
    %{
      calories: plan.target_calories,
      protein_g: plan.target_protein_g,
      carbs_g: plan.target_carbs_g,
      fat_g: plan.target_fat_g,
      fiber_g: plan.target_fiber_g
    }
  end

  defp empty_targets do
    %{calories: nil, protein_g: nil, carbs_g: nil, fat_g: nil, fiber_g: nil}
  end

  defp local_today(%Client{} = client) do
    LocalCalendar.to_local_date(DateTime.utc_now(), applied_timezone(client))
  end

  defp applied_timezone(%Client{} = client) do
    LocalCalendar.applied_timezone(client.timezone, business_timezone(client))
  end

  defp business_timezone(%Client{business: %Easy.Orgs.Business{timezone: timezone}}), do: timezone
  defp business_timezone(_client), do: nil

  defp resolve_dates(opts, today) do
    date = Keyword.get(opts, :date)
    from_date = Keyword.get(opts, :from)
    to_date = Keyword.get(opts, :to)

    cond do
      not is_nil(date) ->
        {:ok, [date]}

      not is_nil(from_date) and not is_nil(to_date) ->
        range_dates(from_date, to_date)

      not is_nil(from_date) or not is_nil(to_date) ->
        {:error, :incomplete_date_range}

      true ->
        {:ok, [today]}
    end
  end

  defp range_dates(from_date, to_date) do
    cond do
      Date.compare(from_date, to_date) == :gt ->
        {:error, :invalid_date_range}

      Date.diff(to_date, from_date) > 30 ->
        {:error, :date_range_too_wide}

      true ->
        {:ok, Enum.to_list(Date.range(from_date, to_date))}
    end
  end

  defp load_active_client(ctx) do
    with {:ok, client} <- Clients.get_client_account(ctx) do
      client = Repo.preload(client, :business)
      if client.status == :active, do: {:ok, client}, else: {:error, :client_inactive}
    end
  end

  defp cast_uuid(key) do
    case Ecto.UUID.cast(key) do
      {:ok, uuid} -> {:ok, uuid}
      :error -> {:error, :invalid_idempotency_key}
    end
  end

  defp cast_extra_command(attrs) do
    with {:ok, meal_slot} <- MealSlot.cast(attrs[:meal_slot]),
         {:ok, portion} <- cast_portion(attrs[:portion]),
         {:ok, kind, id} <- item_ref(attrs) do
      {:ok,
       %{
         meal_slot: meal_slot,
         kind: kind,
         id: id,
         food_id: if(kind == :food, do: id),
         recipe_id: if(kind == :recipe, do: id),
         portion: portion,
         notes: attrs[:notes]
       }}
    end
  end

  defp cast_planned_item_command(attrs) do
    with {:ok, meal_slot} <- MealSlot.cast(attrs[:meal_slot]),
         {:ok, meal_item_id} <- cast_id(attrs[:meal_item_id]) do
      {:ok, %{meal_slot: meal_slot, meal_item_id: meal_item_id}}
    end
  end

  defp cast_planned_option_command(attrs) do
    with {:ok, meal_slot} <- MealSlot.cast(attrs[:meal_slot]) do
      {:ok, %{meal_slot: meal_slot}}
    end
  end

  defp cast_id(id) do
    case Ecto.UUID.cast(id) do
      {:ok, uuid} -> {:ok, uuid}
      :error -> {:error, :not_found}
    end
  end

  defp item_ref(%{food_id: food_id, recipe_id: recipe_id}) when is_binary(food_id) and is_binary(recipe_id),
    do: {:error, :not_found}

  defp item_ref(%{food_id: food_id}) when is_binary(food_id), do: {:ok, :food, food_id}
  defp item_ref(%{recipe_id: recipe_id}) when is_binary(recipe_id), do: {:ok, :recipe, recipe_id}
  defp item_ref(_attrs), do: {:error, :not_found}

  defp cast_portion(%{kind: kind} = portion) do
    case portion_kind(kind) do
      nil -> {:error, :invalid_portion}
      atom -> {:ok, Map.put(portion, :kind, atom)}
    end
  end

  defp cast_portion(_portion), do: {:error, :invalid_portion}

  defp portion_kind(kind) when kind in [:gram, "gram"], do: :gram
  defp portion_kind(kind) when kind in [:serving, "serving"], do: :serving
  defp portion_kind(_kind), do: nil

  defp extra_fingerprint(date, command) do
    DiaryCommandLedger.fingerprint("POST", extra_path(date), extra_payload(command))
  end

  defp extra_path(date), do: "/v1/client/nutrition-days/#{Date.to_iso8601(date)}/extras"

  defp extra_payload(command) do
    %{
      meal_slot: command.meal_slot,
      food_id: command.food_id,
      recipe_id: command.recipe_id,
      portion: command.portion,
      notes: command.notes
    }
  end

  defp planned_item_fingerprint(date, command) do
    DiaryCommandLedger.fingerprint("POST", planned_item_path(date), %{
      meal_slot: command.meal_slot,
      meal_item_id: command.meal_item_id
    })
  end

  defp planned_option_fingerprint(date, command) do
    DiaryCommandLedger.fingerprint("POST", planned_option_path(date), %{meal_slot: command.meal_slot})
  end

  defp planned_day_fingerprint(date) do
    DiaryCommandLedger.fingerprint("POST", planned_day_path(date), %{})
  end

  defp planned_item_path(date), do: "/v1/client/nutrition-days/#{Date.to_iso8601(date)}/planned-items"
  defp planned_option_path(date), do: "/v1/client/nutrition-days/#{Date.to_iso8601(date)}/planned-options"
  defp planned_day_path(date), do: "/v1/client/nutrition-days/#{Date.to_iso8601(date)}/planned-day"

  defp replay_or_run(client, key, fingerprint, fun) do
    result =
      Repo.transaction(fn ->
        case reserve_ledger(client, key, fingerprint) do
          {:replay, day} -> day
          :conflict -> Repo.rollback(:conflict)
          {:run, ledger} -> run_and_store(ledger, fun)
        end
      end)

    unwrap_transaction(result)
  end

  defp run_and_store(ledger, fun) do
    case fun.() do
      {:ok, day} -> store_outcome!(ledger, day)
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp reserve_ledger(client, key, fingerprint) do
    case lock_ledger(client, key) do
      %DiaryCommandLedger{} = ledger -> compare_reserved(ledger, fingerprint)
      nil -> insert_fresh_ledger(client, key, fingerprint)
    end
  end

  defp insert_fresh_ledger(client, key, fingerprint) do
    now = DateTime.utc_now(:second)

    {_count, rows} =
      Repo.insert_all(
        DiaryCommandLedger,
        [
          %{
            id: Ecto.UUID.generate(),
            idempotency_key: key,
            fingerprint: fingerprint,
            outcome: nil,
            expires_at: DateTime.add(now, DiaryCommandLedger.retention_days(), :day),
            business_id: client.business_id,
            client_id: client.id,
            inserted_at: now,
            updated_at: now
          }
        ],
        on_conflict: :nothing,
        returning: true
      )

    case rows do
      [ledger] ->
        {:run, ledger}

      [] ->
        case lock_ledger(client, key) do
          nil -> insert_fresh_ledger(client, key, fingerprint)
          ledger -> compare_reserved(ledger, fingerprint)
        end
    end
  end

  defp compare_reserved(%DiaryCommandLedger{fingerprint: fingerprint} = ledger, fingerprint) do
    if ledger.outcome, do: {:replay, :erlang.binary_to_term(ledger.outcome)}, else: {:run, ledger}
  end

  defp compare_reserved(_ledger, _fingerprint), do: :conflict

  defp lock_ledger(client, key) do
    DiaryCommandLedger
    |> DiaryCommandLedger.for_client(client.business_id, client.id)
    |> DiaryCommandLedger.lock_key(key)
    |> Repo.one()
  end

  defp store_outcome!(ledger, day) do
    case Repo.update(DiaryCommandLedger.update_changeset(ledger, %{outcome: :erlang.term_to_binary(day)})) do
      {:ok, _ledger} -> day
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end

  defp unwrap_transaction({:ok, day}), do: {:ok, day}
  defp unwrap_transaction({:error, reason}), do: {:error, reason}

  defp record_extra(ctx, client, date, command) do
    timezone = applied_timezone(client)
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    with :ok <- ensure_writable(date, existing_timezone(client, date, command.meal_slot, timezone)),
         {:ok, [resolved]} <-
           Library.resolve_items(ctx, [%{kind: command.kind, id: command.id, portion: command.portion}]) do
      slot = fetch_or_create_slot!(ctx, client, date, timezone, today, command.meal_slot)
      insert_entry!(client, slot, resolved, command)
      {:ok, assemble_day(ctx, client, date, :client)}
    end
  end

  defp existing_timezone(client, date, meal_slot, fallback) do
    slot =
      DiarySlot
      |> DiarySlot.for_client(client.business_id, client.id)
      |> DiarySlot.for_date(date)
      |> where([slot], slot.meal_slot == ^meal_slot)
      |> Repo.one()

    (slot && slot.applied_timezone) || fallback
  end

  defp ensure_writable(date, timezone) do
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    cond do
      Date.compare(date, today) == :gt -> {:error, :future_date}
      Date.diff(today, date) > @correction_days -> {:error, :outside_correction_window}
      true -> :ok
    end
  end

  defp fetch_or_create_slot!(ctx, client, date, timezone, today, meal_slot) do
    locked = locked_slot(client, date, meal_slot)

    if locked do
      locked
    else
      insert_slot!(ctx, client, date, timezone, today, meal_slot)
    end
  end

  defp locked_slot(client, date, meal_slot) do
    DiarySlot
    |> DiarySlot.lock_identity(client.business_id, client.id, date, meal_slot)
    |> DiarySlot.include_frozen(client.business_id)
    |> Repo.one()
  end

  defp insert_slot!(ctx, client, date, timezone, today, meal_slot) do
    {has_coverage, guidance} = freeze_source(ctx, date, today)

    attrs = %{
      local_date: date,
      meal_slot: meal_slot,
      applied_timezone: timezone,
      has_coverage: has_coverage,
      revision: 1
    }

    case Repo.transaction(fn -> insert_slot_row!(client, attrs) end) do
      {:ok, slot} -> freeze_slot!(slot, meal_slot, guidance)
      {:error, changeset} -> recover_slot(changeset, client, date, meal_slot)
    end
  end

  defp insert_slot_row!(client, attrs) do
    case Repo.insert(DiarySlot.insert_changeset(client.business_id, client.id, attrs)) do
      {:ok, slot} -> slot
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end

  defp recover_slot(changeset, client, date, meal_slot) do
    if unique_slot_error?(changeset) do
      locked_slot(client, date, meal_slot) || Repo.rollback(changeset)
    else
      Repo.rollback(changeset)
    end
  end

  defp unique_slot_error?(changeset), do: Keyword.has_key?(changeset.errors, :client_id)

  defp freeze_source(ctx, date, today) do
    if Date.compare(date, today) == :eq do
      coverage_guidance(ctx, date)
    else
      {false, nil}
    end
  end

  defp coverage_guidance(ctx, date) do
    case Programming.resolve_client_coverage(ctx, date) do
      {:ok, nil} -> {false, nil}
      {:ok, guidance} -> {true, guidance}
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp freeze_slot!(slot, _meal_slot, nil), do: slot

  defp freeze_slot!(slot, meal_slot, %{plan: plan, day_pattern: pattern}) do
    meals = Map.new(List.wrap(plan.meals), &{&1.id, &1})

    options =
      pattern
      |> pattern_options()
      |> Enum.filter(&(&1.meal_slot == meal_slot))
      |> Enum.sort_by(&{&1.position, &1.id})

    frozen = Enum.map(options, &insert_frozen_option!(slot, &1, meals))
    active = List.first(frozen)

    case Repo.update(DiarySlot.update_changeset(slot, %{active_frozen_option_id: active && active.id})) do
      {:ok, updated} ->
        Repo.preload(updated, [frozen_options: :planned_items, entries: []], force: true)

      {:error, changeset} ->
        Repo.rollback(changeset)
    end
  end

  defp pattern_options(nil), do: []
  defp pattern_options(pattern), do: List.wrap(pattern.meal_options)

  defp insert_frozen_option!(slot, option, meals) do
    meal = meals[option.nutrition_meal_id]

    {:ok, frozen} =
      Repo.insert(
        DiaryFrozenOption.insert_changeset(slot.business_id, slot.id, %{
          position: option.position,
          meal_name: (meal && meal.name) || "",
          nutrition_meal_id: option.nutrition_meal_id
        })
      )

    Enum.each(meal_items(meal), &insert_frozen_item!(slot, frozen, &1))
    Repo.preload(frozen, :planned_items, force: true)
  end

  defp insert_frozen_item!(slot, option, %MealItem{} = item) do
    {:ok, _item} =
      Repo.insert(
        DiaryFrozenPlannedItem.insert_changeset(slot.business_id, slot.id, option.id, %{
          kind: item_kind(item),
          display_name: item_name(item) || "",
          portion_kind: item.portion_kind,
          weight_g: item.weight_g,
          amount: item.amount,
          unit: item.unit,
          serving_label: item.serving_label,
          calories: item.calories,
          protein: item.protein,
          carbohydrates: item.carbohydrates,
          fat: item.fat,
          fiber: item.fiber,
          complete: item.complete,
          position: item.position,
          source_meal_item_id: item.id,
          food_id: item.food_id,
          recipe_id: item.recipe_id
        })
      )
  end

  defp insert_entry!(client, slot, resolved, command) do
    nutrients = resolved.nutrients
    portion = resolved.portion

    {:ok, _entry} =
      Repo.insert(
        DiaryEntry.insert_changeset(client.business_id, client.id, slot.id, %{
          kind: resolved.kind,
          display_name: resolved.item.name,
          portion_kind: command.portion.kind,
          weight_g: portion.grams,
          amount: Map.get(portion, :amount),
          unit: Map.get(portion, :unit),
          serving_label: Map.get(portion, :label),
          calories: nutrients.calories,
          protein: nutrients.protein,
          carbohydrates: nutrients.carbohydrates,
          fat: nutrients.fat,
          fiber: nutrients.fiber,
          complete: nutrients.complete,
          notes: command.notes,
          food_id: if(resolved.kind == :food, do: resolved.item.id),
          recipe_id: if(resolved.kind == :recipe, do: resolved.item.id)
        })
      )
  end

  defp record_planned_item(ctx, client, date, command) do
    timezone = applied_timezone(client)
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    with :ok <- ensure_writable(date, existing_timezone(client, date, command.meal_slot, timezone)),
         {:ok, slot} <- ensure_planned_slot(ctx, client, date, timezone, today, command.meal_slot),
         {:ok, item} <- find_frozen_item(slot, command.meal_item_id) do
      fulfil_or_extra!(client, slot, item)
      {:ok, assemble_day(ctx, client, date, :client)}
    end
  end

  defp record_planned_option(ctx, client, date, command) do
    timezone = applied_timezone(client)
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    with :ok <- ensure_writable(date, existing_timezone(client, date, command.meal_slot, timezone)),
         {:ok, slot} <- ensure_planned_slot(ctx, client, date, timezone, today, command.meal_slot) do
      fulfil_remaining_active!(client, slot)
      {:ok, assemble_day(ctx, client, date, :client)}
    end
  end

  defp record_planned_day(ctx, client, date) do
    timezone = applied_timezone(client)
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    with :ok <- ensure_writable(date, timezone) do
      Enum.each(planned_day_meal_slots(ctx, client, date, today), fn meal_slot ->
        case ensure_planned_slot(ctx, client, date, timezone, today, meal_slot) do
          {:ok, slot} -> fulfil_remaining_active!(client, slot)
          {:error, :cannot_start_past_slot} -> :ok
          {:error, reason} -> Repo.rollback(reason)
        end
      end)

      {:ok, assemble_day(ctx, client, date, :client)}
    end
  end

  defp planned_day_meal_slots(ctx, client, date, today) do
    if Date.compare(date, today) == :eq do
      live_guidance_meal_slots(ctx, date)
    else
      Map.keys(frozen_by_slot(client, date))
    end
  end

  defp live_guidance_meal_slots(ctx, date) do
    case Programming.resolve_client_coverage(ctx, date) do
      {:ok, nil} -> []
      {:ok, guidance} -> Enum.map(live_slots(guidance.day_pattern, guidance.plan), & &1.meal_slot)
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp ensure_planned_slot(ctx, client, date, timezone, today, meal_slot) do
    case locked_slot(client, date, meal_slot) do
      %DiarySlot{has_coverage: true} = slot -> {:ok, slot}
      %DiarySlot{} -> {:error, :not_found}
      nil -> start_planned_slot(ctx, client, date, timezone, today, meal_slot)
    end
  end

  defp start_planned_slot(ctx, client, date, timezone, today, meal_slot) do
    cond do
      Date.compare(date, today) != :eq ->
        {:error, :cannot_start_past_slot}

      match?({false, _}, coverage_guidance(ctx, date)) ->
        {:error, :not_found}

      true ->
        {:ok, insert_slot!(ctx, client, date, timezone, today, meal_slot)}
    end
  end

  defp find_frozen_item(slot, meal_item_id) do
    ordered = Enum.sort_by(slot.frozen_options, &{&1.position, &1.id})
    items = planned_items_for_option(active_frozen_option(slot, ordered))

    case Enum.find(items, &(&1.id == meal_item_id or &1.source_meal_item_id == meal_item_id)) do
      nil -> {:error, :not_found}
      item -> {:ok, item}
    end
  end

  defp fulfil_remaining_active!(client, slot) do
    ordered = Enum.sort_by(slot.frozen_options, &{&1.position, &1.id})
    active = active_frozen_option(slot, ordered)
    fulfilled = MapSet.new(slot.entries, & &1.frozen_planned_item_id)

    active
    |> planned_items_for_option()
    |> Enum.reject(&MapSet.member?(fulfilled, &1.id))
    |> Enum.each(&insert_fulfilment_safe!(client, slot, &1))
  end

  defp planned_items_for_option(nil), do: []
  defp planned_items_for_option(option), do: List.wrap(option.planned_items)

  defp fulfil_or_extra!(client, slot, item) do
    if Enum.any?(slot.entries, &(&1.frozen_planned_item_id == item.id)) do
      insert_frozen_copy!(client, slot, item, false)
    else
      insert_fulfilment_safe!(client, slot, item)
    end
  end

  defp insert_fulfilment_safe!(client, slot, item) do
    case Repo.insert(DiaryEntry.insert_changeset(client.business_id, client.id, slot.id, frozen_entry_attrs(item, true))) do
      {:ok, entry} ->
        entry

      {:error, changeset} ->
        if unique_fulfilment_error?(changeset) do
          insert_frozen_copy!(client, slot, item, false)
        else
          Repo.rollback(changeset)
        end
    end
  end

  defp insert_frozen_copy!(client, slot, item, fulfil?) do
    case Repo.insert(DiaryEntry.insert_changeset(client.business_id, client.id, slot.id, frozen_entry_attrs(item, fulfil?))) do
      {:ok, entry} -> entry
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end

  defp frozen_entry_attrs(item, true) do
    item
    |> frozen_entry_attrs(false)
    |> Map.put(:frozen_planned_item_id, item.id)
  end

  defp frozen_entry_attrs(item, false) do
    %{
      kind: item.kind,
      display_name: item.display_name,
      portion_kind: item.portion_kind,
      weight_g: item.weight_g,
      amount: item.amount,
      unit: item.unit,
      serving_label: item.serving_label,
      calories: item.calories,
      protein: item.protein,
      carbohydrates: item.carbohydrates,
      fat: item.fat,
      fiber: item.fiber,
      complete: item.complete,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      frozen_option_id: item.nutrition_diary_frozen_option_id
    }
  end

  defp unique_fulfilment_error?(changeset),
    do: Keyword.has_key?(changeset.errors, :frozen_planned_item_id)
end
