defmodule Easy.Nutrition.Diary.DayAssembler do
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.Day
  alias Easy.Nutrition.Diary.CorrectionPolicy

  alias Easy.Nutrition.{
    DiaryEntry,
    DiaryFrozenOption,
    DiaryFrozenPlannedItem,
    DiarySlot,
    Food,
    Meal,
    MealItem,
    MealOption,
    MealSlot,
    NutrientTotals,
    Programming,
    Recipe
  }

  alias Easy.Repo

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
    client = Repo.preload(client, :business)
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)

    with {:ok, dates} <- resolve_dates(opts, CorrectionPolicy.local_today(client, now)),
         page = dates |> Enum.drop(offset) |> Enum.take(limit),
         {:ok, days} <- each_ok(page, &assemble(ctx, client, &1, actor, now)) do
      {:ok, %{count: length(dates), nutrition_days: days}}
    end
  end

  @spec assemble(Ctx.t(), Client.t(), Date.t(), actor()) :: {:ok, Day.t()} | {:error, :not_found}
  def assemble(%Ctx{} = ctx, %Client{} = client, %Date{} = date, actor) when actor in [:client, :coach] do
    assemble(ctx, client, date, actor, DateTime.utc_now())
  end

  @spec assemble(Ctx.t(), Client.t(), Date.t(), actor(), DateTime.t()) ::
          {:ok, Day.t()} | {:error, :not_found}
  def assemble(%Ctx{} = ctx, %Client{} = client, %Date{} = date, actor, %DateTime{} = now)
      when actor in [:client, :coach] do
    frozen = frozen_by_slot(client, date)
    timezone = day_timezone(Map.values(frozen), CorrectionPolicy.applied_timezone(client))
    today = CorrectionPolicy.local_today(timezone, now)

    case live_guidance(ctx, client.id, date, today, actor) do
      {:ok, guidance} -> {:ok, merge_day(date, today, timezone, guidance, frozen, now)}
      {:error, reason} -> {:error, reason}
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

  defp merge_day(date, today, timezone, guidance, frozen, now) do
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

    targets = if(guidance, do: targets(guidance.plan), else: frozen_targets(frozen))
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
    meals = Map.new(List.wrap(plan.meals), &{&1.id, &1})
    grouped = Enum.group_by(List.wrap(pattern.meal_options), & &1.meal_slot)

    MealSlot.values()
    |> Enum.filter(&Map.has_key?(grouped, &1))
    |> Enum.map(&slot_from_options(&1, Map.fetch!(grouped, &1), meals, timezone, write_eligible))
  end

  defp slot_from_options(slot, options, meals, timezone, write_eligible) do
    ordered = Enum.sort_by(options, &{&1.position, &1.id})
    default = hd(ordered)
    items = meal_items(meals[default.nutrition_meal_id])

    %{
      meal_slot: slot,
      meal_id: default.nutrition_meal_id,
      revision: nil,
      applied_timezone: timezone,
      write_eligible: write_eligible,
      planned_calories: NutrientTotals.sum(items).calories,
      logged_calories: nil,
      options: Enum.map(ordered, &option_data(&1, meals)),
      rows: []
    }
  end

  defp frozen_slot_view(%DiarySlot{} = slot, now) do
    ordered = Enum.sort_by(slot.frozen_options, &{&1.position, &1.id})
    active = active_frozen_option(slot, ordered)
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
      meal_id: option.source_meal_id,
      meal_name: option.meal_name,
      position: option.position,
      items: Enum.map(option.planned_items, &frozen_item_data/1)
    }
  end

  defp item_data(%MealItem{} = item) do
    %{
      planned_item_ref: item.id,
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
      planned_item_ref: item.id,
      kind: item.kind,
      name: item.display_name,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      position: item.position,
      portion: portion_data(item),
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
      portion: portion_data(entry),
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

  defp portion_data(item) do
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

  defp targets(plan) do
    %{
      calories: plan.target_calories,
      protein_g: plan.target_protein_g,
      carbs_g: plan.target_carbs_g,
      fat_g: plan.target_fat_g,
      fiber_g: plan.target_fiber_g
    }
  end

  defp frozen_targets(frozen) do
    case frozen |> Map.values() |> Enum.find(& &1.has_coverage) do
      nil ->
        %{calories: nil, protein_g: nil, carbs_g: nil, fat_g: nil, fiber_g: nil}

      slot ->
        %{
          calories: slot.target_calories,
          protein_g: slot.target_protein_g,
          carbs_g: slot.target_carbs_g,
          fat_g: slot.target_fat_g,
          fiber_g: slot.target_fiber_g
        }
    end
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
    entry.kind == item.kind and entry.source_food_id == item.source_food_id and
      entry.source_recipe_id == item.source_recipe_id
  end

  defp day_summary(slots, targets) do
    rows = Enum.flat_map(slots, & &1.rows)
    entries = for %{entry: entry} when not is_nil(entry) <- rows, do: entry
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

  defp each_ok(items, fun) do
    Enum.reduce_while(items, {:ok, []}, fn item, {:ok, acc} ->
      case fun.(item) do
        {:ok, value} -> {:cont, {:ok, [value | acc]}}
        {:error, _reason} = error -> {:halt, error}
      end
    end)
    |> case do
      {:ok, values} -> {:ok, Enum.reverse(values)}
      {:error, _reason} = error -> error
    end
  end
end
