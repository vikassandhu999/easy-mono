defmodule Easy.Nutrition.Diary.DayAssembler do
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.Day
  alias Easy.Nutrition.Diary.CorrectionPolicy

  alias Easy.Nutrition.{
    DiaryDay,
    DiaryEntry,
    DiaryFrozenOption,
    DiaryFrozenPlannedItem,
    DiarySlot,
    Library,
    MealSlot,
    Menu,
    NutrientTotals,
    Portions,
    Programming
  }

  alias Easy.Repo
  alias Easy.Result

  @type actor :: :client | :coach
  @type list_error :: :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range

  @spec list(Ctx.t(), Client.t(), keyword(), actor()) :: {:ok, Day.list_result()} | {:error, list_error()}
  def list(%Ctx{} = ctx, %Client{} = client, opts, actor) when is_list(opts) and actor in [:client, :coach] do
    list(ctx, client, opts, actor, DateTime.utc_now())
  end

  @spec list(Ctx.t(), Client.t(), keyword(), actor(), DateTime.t()) ::
          {:ok, Day.list_result()} | {:error, list_error()}
  def list(%Ctx{} = ctx, %Client{} = client, opts, actor, %DateTime{} = now)
      when is_list(opts) and actor in [:client, :coach] do
    Repo.snapshot(fn ->
      client = Repo.preload(client, :business)

      with {:ok, dates} <- resolve_dates(opts, CorrectionPolicy.local_today(client, now)),
           {:ok, days} <- Result.traverse(dates, &assemble(ctx, client, &1, actor, now)) do
        {:ok, %{nutrition_days: days}}
      end
    end)
  end

  @spec assemble(Ctx.t(), Client.t(), Date.t(), actor()) :: {:ok, Day.t()} | {:error, :not_found}
  def assemble(%Ctx{} = ctx, %Client{} = client, %Date{} = date, actor) when actor in [:client, :coach] do
    assemble(ctx, client, date, actor, DateTime.utc_now())
  end

  @spec assemble(Ctx.t(), Client.t(), Date.t(), actor(), DateTime.t()) ::
          {:ok, Day.t()} | {:error, :not_found}
  def assemble(%Ctx{} = ctx, %Client{} = client, %Date{} = date, actor, %DateTime{} = now)
      when actor in [:client, :coach] do
    Repo.snapshot(fn -> assemble_day(ctx, client, date, actor, now) end)
  end

  defp assemble_day(ctx, client, date, actor, now) do
    frozen = frozen_by_slot(client, date)
    frozen_day = Repo.one(DiaryDay.for_date(client.business_id, client.id, date))
    items = Enum.flat_map(Map.values(frozen), fn slot -> slot.entries ++ Enum.flat_map(slot.frozen_options, & &1.planned_items) end)
    timezone = day_timezone(Map.values(frozen), CorrectionPolicy.applied_timezone(client))
    today = CorrectionPolicy.local_today(timezone, now)

    case live_guidance(ctx, client.id, date, today, actor) do
      {:ok, guidance} ->
        live_items = if guidance, do: Menu.items(guidance.plan.menu), else: []
        {:ok, available} = Library.available_items(ctx, items ++ live_items)
        day = merge_day(date, today, timezone, guidance, frozen, frozen_day, now)
        {:ok, day |> available_sources(available) |> round_values()}

      {:error, reason} ->
        {:error, reason}
    end
  end

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

  defp live_guidance(ctx, client_id, date, today, actor) do
    if Date.compare(date, today) == :lt do
      {:ok, nil}
    else
      resolve_guidance(ctx, client_id, date, actor)
    end
  end

  defp resolve_guidance(ctx, _client_id, date, :client), do: Programming.resolve_client_coverage(ctx, date)
  defp resolve_guidance(ctx, client_id, date, :coach), do: Programming.resolve_coverage_for_client(ctx, client_id, date)

  defp merge_day(date, today, timezone, guidance, frozen, frozen_day, now) do
    live =
      if guidance do
        guidance.day_pattern
        |> live_slots(guidance.plan, timezone, CorrectionPolicy.write_eligible?(date, today))
        |> Map.new(&{&1.meal_slot, &1})
      else
        %{}
      end

    slots =
      MealSlot.values()
      |> Enum.map(&merged_slot(&1, frozen, live, now))
      |> Enum.reject(&is_nil/1)

    targets = DiaryDay.targets(frozen_day || (guidance && guidance.plan))
    applied = day_timezone(slots, timezone)

    %{
      date: date,
      plan_id: guidance && guidance.plan.id,
      write_eligible:
        Enum.any?(slots, & &1.write_eligible) or
          (slots == [] and CorrectionPolicy.write_eligible?(date, today)),
      applied_timezone: applied,
      targets: targets,
      slots: slots,
      summary: day_summary(slots, targets)
    }
  end

  defp merged_slot(slot, frozen, live, now) do
    cond do
      Map.has_key?(frozen, slot) -> frozen_slot_view(Map.fetch!(frozen, slot), now)
      Map.has_key?(live, slot) -> Map.fetch!(live, slot)
      true -> nil
    end
  end

  defp frozen_by_slot(client, date) do
    DiarySlot
    |> DiarySlot.for_client(client.business_id, client.id)
    |> DiarySlot.for_date(date)
    |> DiarySlot.include_frozen(client.business_id)
    |> Repo.all()
    |> Map.new(&{&1.meal_slot, &1})
  end

  defp live_slots(nil, _plan, _timezone, _write_eligible), do: []

  defp live_slots(pattern, plan, timezone, write_eligible) do
    MealSlot.values()
    |> Enum.flat_map(fn slot ->
      case Menu.meals_for_slot(plan.menu, pattern, slot) do
        [] -> []
        meals -> [slot_from_meals(slot, meals, timezone, write_eligible)]
      end
    end)
  end

  defp slot_from_meals(slot, [default | _rest] = meals, timezone, write_eligible) do
    items = default.meal_items

    %{
      meal_slot: slot,
      meal_id: default.id,
      revision: 0,
      applied_timezone: timezone,
      write_eligible: write_eligible,
      planned_calories: NutrientTotals.combine(Enum.map(items, & &1.nutrients)).calories,
      logged_calories: nil,
      options: Enum.with_index(meals, &option_data/2),
      rows: Enum.with_index(items, fn item, position -> row(:pending, item_data(item, position), nil) end)
    }
  end

  defp frozen_slot_view(%DiarySlot{} = slot, now) do
    ordered = Enum.sort_by(slot.frozen_options, &{&1.position, &1.id})
    active = DiarySlot.active_option(slot)
    items = if active, do: active.planned_items, else: []
    today = CorrectionPolicy.local_today(slot.applied_timezone, now)

    %{
      meal_slot: slot.meal_slot,
      meal_id: active && active.source_meal_id,
      revision: slot.revision,
      applied_timezone: slot.applied_timezone,
      write_eligible: CorrectionPolicy.write_eligible?(slot.local_date, today),
      planned_calories: NutrientTotals.sum(items).calories,
      logged_calories: NutrientTotals.sum(slot.entries).calories,
      options: Enum.map(ordered, &frozen_option_data/1),
      rows: frozen_rows(slot, active, today)
    }
  end

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

  defp row(status, planned, entry) do
    item = if entry, do: entry_data(entry), else: planned
    ref = planned && planned.planned_item_ref

    %{
      id: ref || entry.id,
      entry_id: entry && entry.id,
      planned_item_ref: ref,
      status: status,
      kind: item.kind,
      name: item.name || "Food",
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      portion: item.portion,
      nutrients: item.nutrients,
      notes: entry && entry.notes
    }
  end

  defp option_data(meal, position) do
    %{meal_id: meal.id, meal_name: meal.name, position: position, items: Enum.with_index(meal.meal_items, &item_data/2)}
  end

  defp frozen_option_data(%DiaryFrozenOption{} = option) do
    %{
      meal_id: option.source_meal_id,
      meal_name: option.meal_name,
      position: option.position,
      items: Enum.map(option.planned_items, &frozen_item_data/1)
    }
  end

  defp item_data(item, position) do
    %{
      planned_item_ref: item.id,
      kind: Library.item_kind(item),
      name: item.name,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      position: position,
      portion: Portions.format(item.portion),
      nutrients: item.nutrients
    }
  end

  defp frozen_item_data(%DiaryFrozenPlannedItem{} = item) do
    %{
      planned_item_ref: item.source_meal_item_id,
      kind: Library.item_kind(item),
      name: item.display_name,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      position: item.position,
      portion: Portions.format(item.portion),
      nutrients: item.nutrients
    }
  end

  defp entry_data(%DiaryEntry{} = entry) do
    %{
      id: entry.id,
      kind: Library.item_kind(entry),
      name: entry.display_name,
      food_id: entry.food_id,
      recipe_id: entry.recipe_id,
      portion: Portions.format(entry.portion),
      nutrients: entry.nutrients,
      notes: entry.notes,
      inserted_at: entry.inserted_at,
      updated_at: entry.updated_at
    }
  end

  defp day_timezone(slots, fallback) do
    Enum.find_value(MealSlot.values(), fallback, fn meal_slot ->
      case Enum.find(slots, &(&1.meal_slot == meal_slot and is_binary(&1.applied_timezone))) do
        %{applied_timezone: timezone} -> timezone
        _missing -> nil
      end
    end)
  end

  defp planned_status(nil, _item, date, today) do
    if Date.compare(date, today) == :lt, do: :skipped, else: :pending
  end

  defp planned_status(entry, item, _date, _today) do
    if same_source?(entry, item), do: :as_planned, else: :swapped
  end

  defp same_source?(entry, item) do
    entry.food_id == item.food_id and entry.recipe_id == item.recipe_id
  end

  defp day_summary(slots, targets) do
    rows = Enum.flat_map(slots, & &1.rows)
    entries = Enum.reject(rows, &is_nil(&1.entry_id))
    logged = NutrientTotals.combine(Enum.map(entries, & &1.nutrients))
    planned = NutrientTotals.combine(Enum.map(Enum.flat_map(slots, &active_option_items/1), & &1.nutrients))

    %{
      logged: logged,
      planned: planned,
      counts: status_counts(rows),
      has_intake: entries != [],
      adherence: calorie_adherence(entries, logged.calories, targets.calories)
    }
  end

  defp active_option_items(slot) do
    option = Enum.find(slot.options, &(&1.meal_id == slot.meal_id)) || List.first(slot.options)
    (option && option.items) || []
  end

  defp status_counts(rows) do
    Map.merge(
      %{as_planned: 0, swapped: 0, added: 0, recorded: 0, pending: 0, skipped: 0},
      Enum.frequencies_by(rows, & &1.status)
    )
  end

  defp calorie_adherence([], _logged, _target), do: :none

  defp calorie_adherence(_entries, logged, target)
       when is_number(logged) and is_number(target) and target > 0,
       do: calorie_band(logged / target)

  defp calorie_adherence(_entries, _logged, _target), do: nil

  defp calorie_band(pct) when pct < 0.9, do: :under
  defp calorie_band(pct) when pct > 1.1, do: :over
  defp calorie_band(_pct), do: :on

  defp available_sources(%{food_id: food_id, recipe_id: recipe_id} = item, available) do
    %{item | food_id: if(MapSet.member?(available, {:food, food_id}), do: food_id), recipe_id: if(MapSet.member?(available, {:recipe, recipe_id}), do: recipe_id)}
  end

  defp available_sources(%_{} = value, _available), do: value
  defp available_sources(map, available) when is_map(map), do: Map.new(map, fn {key, value} -> {key, available_sources(value, available)} end)
  defp available_sources(list, available) when is_list(list), do: Enum.map(list, &available_sources(&1, available))
  defp available_sources(value, _available), do: value

  defp round_values(%_{} = value), do: value

  defp round_values(map) when is_map(map),
    do:
      Map.new(map, fn
        {:portion, portion} -> {:portion, portion}
        {key, value} -> {key, round_values(value)}
      end)

  defp round_values(list) when is_list(list), do: Enum.map(list, &round_values/1)
  defp round_values(value) when is_float(value), do: Float.round(value, 1)
  defp round_values(value), do: value
end
