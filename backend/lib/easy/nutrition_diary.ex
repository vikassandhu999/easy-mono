defmodule Easy.Nutrition.Diary do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.Day
  alias Easy.Nutrition.Diary.{CorrectionPolicy, DayAssembler}

  alias Easy.Nutrition.{
    DiaryEntry,
    DiaryFrozenOption,
    DiaryFrozenPlannedItem,
    DiarySlot,
    Library,
    MealSlot,
    Menu,
    NutrientTotals,
    Programming
  }

  alias Easy.Repo

  import Ecto.Query

  ## Nutrition Day reads

  @spec get_client_nutrition_day(Ctx.t(), Date.t()) :: {:ok, Day.t()} | {:error, :not_found}
  def get_client_nutrition_day(%Ctx{} = ctx, %Date{} = date) do
    with {:ok, %{nutrition_days: [day]}} <- list_client_nutrition_days(ctx, date: date) do
      {:ok, day}
    end
  end

  @spec get_nutrition_day_for_client(Ctx.t(), String.t(), Date.t()) ::
          {:ok, Day.t()} | {:error, :not_found}
  def get_nutrition_day_for_client(%Ctx{} = ctx, client_id, %Date{} = date) do
    with {:ok, %{nutrition_days: [day]}} <-
           list_nutrition_days_for_client(ctx, client_id, date: date) do
      {:ok, day}
    end
  end

  @spec list_client_nutrition_days(Ctx.t(), keyword()) ::
          {:ok, Day.list_result()}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_client_nutrition_days(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client} <- Clients.get_client_account(ctx) do
      DayAssembler.list(ctx, client, opts, :client)
    end
  end

  @spec list_nutrition_days_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, Day.list_result()}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_nutrition_days_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with {:ok, client} <- Clients.authorize_client(ctx, client_id) do
      DayAssembler.list(ctx, client, opts, :coach)
    end
  end

  @spec save_client_nutrition_day(Ctx.t(), Date.t(), map()) ::
          {:ok, Day.t()} | {:error, atom() | Ecto.Changeset.t()}
  def save_client_nutrition_day(%Ctx{} = ctx, %Date{} = date, %{slots: slots})
      when is_list(slots) do
    with {:ok, client} <- load_active_client(ctx),
         {:ok, drafts} <- each_ok(slots, &cast_slot/1),
         :ok <- unique_values(drafts, :meal_slot) do
      Repo.transaction(fn -> save_day(ctx, client, date, drafts) end)
    end
  end

  def save_client_nutrition_day(%Ctx{}, %Date{}, _attrs), do: {:error, :not_found}

  defp save_day(ctx, client, date, drafts) do
    now = DateTime.utc_now(:second)

    with {:ok, _slots} <-
           each_ok(Enum.sort_by(drafts, & &1.meal_slot), &save_slot(ctx, client, date, &1, now)),
         {:ok, day} <- DayAssembler.assemble(ctx, client, date, :client, now) do
      if drafts != [], do: Client.last_active_stamp(client.business_id, client.id, now) |> Repo.update_all([])
      day
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp cast_slot(attrs) when is_map(attrs) do
    with {:ok, meal_slot} <- MealSlot.cast(attrs[:meal_slot]),
         {:ok, revision} <- cast_revision(attrs[:expected_revision]),
         {:ok, meal_id} <- optional_id(attrs[:meal_id]),
         {:ok, entries} <- each_ok(attrs[:entries], &cast_entry/1),
         :ok <- unique_values(entries, :entry_id),
         :ok <- unique_values(Enum.reject(entries, &is_nil(&1.planned_item_ref)), :planned_item_ref) do
      {:ok, %{meal_slot: meal_slot, meal_id: meal_id, expected_revision: revision, entries: entries}}
    end
  end

  defp cast_slot(_attrs), do: {:error, :not_found}

  defp cast_entry(attrs) when is_map(attrs) do
    with {:ok, entry_id} <- cast_id(attrs[:id]),
         {:ok, portion} <- cast_portion(attrs[:portion]),
         {:ok, planned_item_ref} <- optional_id(attrs[:planned_item_ref]),
         {:ok, kind, id} <- optional_item_ref(attrs) do
      {:ok,
       %{
         entry_id: entry_id,
         planned_item_ref: planned_item_ref,
         kind: kind,
         id: id,
         portion: portion,
         notes: attrs[:notes]
       }}
    end
  end

  defp cast_entry(_attrs), do: {:error, :not_found}

  defp unique_values(items, key) do
    if length(Enum.uniq_by(items, &Map.fetch!(&1, key))) == length(items),
      do: :ok,
      else: {:error, :conflict}
  end

  defp each_ok(items, fun) when is_list(items) do
    Enum.reduce_while(items, {:ok, []}, fn item, {:ok, acc} ->
      case fun.(item) do
        {:ok, value} -> {:cont, {:ok, acc ++ [value]}}
        {:error, _reason} = error -> {:halt, error}
      end
    end)
  end

  defp each_ok(_items, _fun), do: {:error, :not_found}

  defp save_slot(ctx, client, date, draft, now) do
    existing = locked_slot(client, date, draft.meal_slot)

    timezone =
      if existing, do: existing.applied_timezone, else: CorrectionPolicy.applied_timezone(client)

    with :ok <- ensure_writable(date, timezone, now),
         :ok <- ensure_revision(existing, draft.expected_revision),
         {:ok, slot} <- start_slot(ctx, client, date, draft, existing, timezone, now),
         {:ok, slot} <- select_option(slot, draft.meal_id, date, now),
         {:ok, _entries} <- replace_entries(ctx, client, slot, draft.entries) do
      Repo.update(
        DiarySlot.update_changeset(slot, %{revision: draft.expected_revision + 1})
        |> Ecto.Changeset.force_change(:active_frozen_option_id, slot.active_frozen_option_id)
      )
    end
  end

  defp start_slot(_ctx, _client, _date, _draft, %DiarySlot{} = slot, _timezone, _now),
    do: {:ok, slot}

  defp start_slot(ctx, client, date, draft, nil, timezone, now) do
    today = CorrectionPolicy.local_today(timezone, now)

    with {:ok, source} <- freeze_source(ctx, date, today) do
      create_frozen_slot(client, date, timezone, draft.meal_slot, source, now)
    end
  end

  defp select_option(slot, meal_id, date, now) do
    active = Enum.find(slot.frozen_options, &(&1.id == slot.active_frozen_option_id))
    current_id = active && active.source_meal_id

    cond do
      current_id == meal_id ->
        {:ok, slot}

      is_nil(meal_id) ->
        {:error, :not_found}

      true ->
        with :ok <-
               CorrectionPolicy.validate_switch(
                 date,
                 CorrectionPolicy.local_today(slot.applied_timezone, now)
               ),
             {:ok, option} <- find_frozen_option(slot, meal_id) do
          {:ok, %{slot | active_frozen_option_id: option.id}}
        end
    end
  end

  defp replace_entries(ctx, client, slot, drafts) do
    wanted = Enum.map(drafts, & &1.entry_id)

    DiaryEntry
    |> DiaryEntry.for_client(client.business_id, client.id)
    |> where([entry], entry.nutrition_diary_slot_id == ^slot.id and entry.id not in ^wanted)
    |> Repo.delete_all()

    each_ok(drafts, &save_entry(ctx, client, slot, &1))
  end

  defp save_entry(ctx, client, slot, command) do
    existing = Enum.find(slot.entries, &(&1.id == command.entry_id))

    with {:ok, planned} <- planned_for_entry(slot, existing, command.planned_item_ref),
         {:ok, attrs} <- entry_attrs(ctx, existing || planned, command) do
      if existing do
        Repo.update(DiaryEntry.update_changeset(existing, attrs))
      else
        client.business_id
        |> DiaryEntry.insert_changeset(client.id, slot.id, link_planned_item(attrs, planned))
        |> Ecto.Changeset.put_change(:id, command.entry_id)
        |> Ecto.Changeset.unique_constraint(:id, name: :nutrition_diary_entries_pkey)
        |> Repo.insert()
      end
    end
  end

  defp planned_for_entry(_slot, %DiaryEntry{frozen_planned_item_id: nil}, nil), do: {:ok, nil}

  defp planned_for_entry(slot, %DiaryEntry{} = entry, ref) do
    planned =
      Enum.find_value(slot.frozen_options, fn option ->
        Enum.find(option.planned_items, &(&1.id == entry.frozen_planned_item_id))
      end)

    if planned && (is_nil(ref) || planned.source_meal_item_id == ref),
      do: {:ok, planned},
      else: {:error, :not_found}
  end

  defp planned_for_entry(_slot, nil, nil), do: {:ok, nil}
  defp planned_for_entry(slot, nil, ref), do: find_frozen_item(slot, ref)

  defp load_active_client(ctx) do
    with {:ok, client} <- Clients.get_client_account(ctx) do
      client = Repo.preload(client, :business)
      if client.status == :active, do: {:ok, client}, else: {:error, :client_inactive}
    end
  end

  defp optional_id(nil), do: {:ok, nil}
  defp optional_id(id), do: cast_id(id)

  defp optional_item_ref(attrs) do
    case {attrs[:food_id], attrs[:recipe_id]} do
      {nil, nil} -> {:ok, nil, nil}
      {food_id, nil} -> cast_item_ref(:food, food_id)
      {nil, recipe_id} -> cast_item_ref(:recipe, recipe_id)
      _both -> {:error, :not_found}
    end
  end

  defp cast_item_ref(kind, id) do
    with {:ok, id} <- cast_id(id), do: {:ok, kind, id}
  end

  defp cast_revision(revision) when is_integer(revision) and revision >= 0, do: {:ok, revision}
  defp cast_revision(_revision), do: {:error, :not_found}

  defp cast_id(id) do
    case Ecto.UUID.cast(id) do
      {:ok, uuid} -> {:ok, uuid}
      :error -> {:error, :not_found}
    end
  end

  defp cast_portion(%{kind: kind} = portion) when kind in [:gram, "gram"],
    do: {:ok, Map.put(portion, :kind, :gram)}

  defp cast_portion(%{kind: kind} = portion) when kind in [:serving, "serving"],
    do: {:ok, Map.put(portion, :kind, :serving)}

  defp cast_portion(_portion), do: {:error, :invalid_portion}

  defp link_planned_item(attrs, nil), do: attrs

  defp link_planned_item(attrs, item) do
    Map.merge(attrs, %{
      frozen_planned_item_id: item.id,
      frozen_option_id: item.nutrition_diary_frozen_option_id
    })
  end

  defp entry_attrs(_ctx, nil, %{kind: nil}), do: {:error, :not_found}

  defp entry_attrs(ctx, source, command) do
    if source && same_source?(source, command) do
      with {:ok, changes} <- update_attrs(ctx, source, command) do
        {:ok, Map.merge(snapshot_attrs(source), changes)}
      end
    else
      with {:ok, [resolved]} <-
             Library.resolve_items(ctx, [
               %{kind: command.kind, id: command.id, portion: command.portion}
             ]) do
        {:ok, resolved_entry_attrs(resolved, command)}
      end
    end
  end

  defp same_source?(_source, %{kind: nil}), do: true
  defp same_source?(%{source_food_id: id}, %{kind: :food, id: id}), do: true
  defp same_source?(%{source_recipe_id: id}, %{kind: :recipe, id: id}), do: true
  defp same_source?(_source, _command), do: false

  defp snapshot_attrs(source) do
    Map.take(source, [
      :kind,
      :display_name,
      :portion_kind,
      :weight_g,
      :amount,
      :unit,
      :serving_label,
      :calories,
      :protein,
      :carbohydrates,
      :fat,
      :fiber,
      :complete,
      :source_food_id,
      :source_recipe_id,
      :food_id,
      :recipe_id
    ])
  end

  defp update_attrs(ctx, entry, command) do
    with {:ok, ratio, grams} <- portion_scale(ctx, entry, command.portion) do
      nutrients = NutrientTotals.scale(NutrientTotals.from_fields(entry), ratio)

      attrs = %{
        portion_kind: command.portion.kind,
        weight_g: grams,
        amount: Map.get(command.portion, :amount),
        unit: Map.get(command.portion, :unit),
        serving_label: Map.get(command.portion, :label),
        calories: nutrients.calories,
        protein: nutrients.protein,
        carbohydrates: nutrients.carbohydrates,
        fat: nutrients.fat,
        fiber: nutrients.fiber,
        complete: nutrients.complete
      }

      {:ok, Map.put(attrs, :notes, command.notes)}
    end
  end

  defp portion_scale(_ctx, %{weight_g: weight_g}, %{kind: :gram, grams: grams})
       when is_number(weight_g) and weight_g > 0 and is_number(grams) and grams > 0,
       do: {:ok, grams / weight_g, grams / 1}

  defp portion_scale(_ctx, %{amount: stored, unit: unit, serving_label: label, weight_g: weight_g}, %{
         kind: :serving,
         amount: amount,
         unit: unit,
         label: label
       })
       when is_number(stored) and stored > 0 and is_number(amount) and amount > 0 do
    ratio = amount / stored
    grams = if is_number(weight_g) and weight_g > 0, do: weight_g * ratio, else: nil
    {:ok, ratio, grams}
  end

  defp portion_scale(ctx, %{weight_g: stored} = entry, portion)
       when is_number(stored) and stored > 0 do
    spec = %{kind: entry.kind, id: entry.source_food_id || entry.source_recipe_id, portion: portion}

    case Library.resolve_items(ctx, [spec]) do
      {:ok, [%{portion: %{grams: grams}}]} when is_number(grams) and grams > 0 ->
        {:ok, grams / stored, grams}

      {:error, reason} ->
        {:error, reason}

      _ ->
        {:error, :invalid_portion}
    end
  end

  defp portion_scale(_ctx, _entry, _portion), do: {:error, :invalid_portion}

  defp ensure_writable(date, timezone, now) do
    today = CorrectionPolicy.local_today(timezone, now)
    CorrectionPolicy.validate_write(date, today)
  end

  defp ensure_revision(nil, 0), do: :ok

  defp ensure_revision(nil, _expected),
    do: {:error, stale_revision_changeset(%DiarySlot{revision: 0})}

  defp ensure_revision(%DiarySlot{revision: revision}, revision), do: :ok
  defp ensure_revision(slot, _expected), do: {:error, stale_revision_changeset(slot)}

  defp stale_revision_changeset(record) do
    record
    |> Ecto.Changeset.change()
    |> Ecto.Changeset.add_error(:revision, "is stale")
    |> Map.put(:action, :stale_revision)
  end

  defp find_frozen_item(slot, planned_item_ref) do
    ordered = Enum.sort_by(slot.frozen_options, &{&1.position, &1.id})
    items = planned_items_for_option(active_frozen_option(slot, ordered))

    case Enum.find(items, &(&1.source_meal_item_id == planned_item_ref)) do
      nil -> {:error, :not_found}
      item -> {:ok, item}
    end
  end

  defp find_frozen_option(slot, meal_id) do
    case Enum.find(slot.frozen_options, &(&1.source_meal_id == meal_id)) do
      nil -> {:error, :not_found}
      option -> {:ok, option}
    end
  end

  defp planned_items_for_option(nil), do: []
  defp planned_items_for_option(option), do: option.planned_items

  defp resolved_entry_attrs(resolved, command) do
    nutrients = resolved.nutrients
    portion = resolved.portion

    %{
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
      source_food_id: if(resolved.kind == :food, do: resolved.item.id),
      source_recipe_id: if(resolved.kind == :recipe, do: resolved.item.id),
      food_id: if(resolved.kind == :food, do: resolved.item.id),
      recipe_id: if(resolved.kind == :recipe, do: resolved.item.id)
    }
  end

  ## Freezing

  defp locked_slot(client, date, meal_slot) do
    DiarySlot
    |> DiarySlot.lock_identity(client.business_id, client.id, date, meal_slot)
    |> DiarySlot.include_frozen(client.business_id)
    |> Repo.one()
  end

  defp freeze_source(ctx, date, today) do
    if Date.compare(date, today) == :eq do
      coverage_guidance(ctx, date)
    else
      {:ok, {false, nil}}
    end
  end

  defp coverage_guidance(ctx, date) do
    case Programming.resolve_client_coverage(ctx, date, lock: true) do
      {:ok, nil} -> {:ok, {false, nil}}
      {:ok, guidance} -> {:ok, {true, guidance}}
      {:error, reason} -> {:error, reason}
    end
  end

  defp create_frozen_slot(
         client,
         date,
         timezone,
         meal_slot,
         {has_coverage, guidance},
         now
       ) do
    attrs =
      %{
        local_date: date,
        meal_slot: meal_slot,
        applied_timezone: timezone,
        has_coverage: has_coverage,
        revision: 1
      }
      |> Map.merge(frozen_target_attrs(guidance))

    case insert_slot_row(client, attrs, now) do
      {:inserted, slot} ->
        freeze_slot(slot, meal_slot, guidance)

      :conflict ->
        case locked_slot(client, date, meal_slot) do
          %DiarySlot{} = slot -> {:error, stale_revision_changeset(slot)}
          nil -> {:error, :conflict}
        end
    end
  end

  defp insert_slot_row(client, attrs, now) do
    {_count, rows} =
      Repo.insert_all(
        DiarySlot,
        [
          Map.merge(attrs, %{
            id: Ecto.UUID.generate(),
            business_id: client.business_id,
            client_id: client.id,
            inserted_at: now,
            updated_at: now
          })
        ],
        on_conflict: :nothing,
        conflict_target: [:business_id, :client_id, :local_date, :meal_slot],
        returning: true
      )

    case rows do
      [slot] -> {:inserted, slot}
      [] -> :conflict
    end
  end

  defp frozen_target_attrs(nil), do: %{}

  defp frozen_target_attrs(%{plan: plan}) do
    %{
      target_calories: plan.target_calories,
      target_protein_g: plan.target_protein_g,
      target_carbs_g: plan.target_carbs_g,
      target_fat_g: plan.target_fat_g,
      target_fiber_g: plan.target_fiber_g
    }
  end

  defp freeze_slot(slot, _meal_slot, nil),
    do: {:ok, %{slot | frozen_options: [], entries: []}}

  defp freeze_slot(slot, meal_slot, %{plan: plan, day_pattern: pattern}) do
    frozen =
      plan.menu
      |> Menu.meals_for_slot(pattern, meal_slot)
      |> Enum.with_index(&insert_frozen_option!(slot, &1, &2))

    active = List.first(frozen)

    case Repo.update(DiarySlot.update_changeset(slot, %{active_frozen_option_id: active && active.id})) do
      {:ok, updated} ->
        {:ok, Repo.preload(updated, [frozen_options: :planned_items, entries: []], force: true)}

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  defp insert_frozen_option!(slot, meal, position) do
    {:ok, frozen} =
      Repo.insert(
        DiaryFrozenOption.insert_changeset(slot.business_id, slot.id, %{
          position: position,
          meal_name: meal.name,
          source_meal_id: meal.id
        })
      )

    meal.meal_items
    |> Enum.with_index()
    |> Enum.each(fn {item, position} -> insert_frozen_item!(slot, frozen, item, position) end)

    Repo.preload(frozen, :planned_items, force: true)
  end

  defp insert_frozen_item!(slot, option, item, position) do
    attrs =
      Map.merge(Map.from_struct(item.nutrients), %{
        kind: item.kind,
        display_name: item.name,
        portion_kind: item.portion.kind,
        weight_g: item.weight_g,
        amount: item.portion.amount,
        unit: item.portion.unit,
        serving_label: item.portion.label,
        position: position,
        source_meal_item_id: item.id,
        source_food_id: item.food_id,
        source_recipe_id: item.recipe_id,
        food_id: item.food_id,
        recipe_id: item.recipe_id
      })

    {:ok, _item} = Repo.insert(DiaryFrozenPlannedItem.insert_changeset(slot.business_id, slot.id, option.id, attrs))
  end

  defp active_frozen_option(%DiarySlot{active_frozen_option_id: id}, options) when not is_nil(id) do
    Enum.find(options, &(&1.id == id)) || List.first(options)
  end

  defp active_frozen_option(_slot, options), do: List.first(options)
end
