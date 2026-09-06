defmodule Easy.Nutrition.Diary do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.Day
  alias Easy.Nutrition.Diary.{CorrectionPolicy, DayAssembler}

  alias Easy.Nutrition.{
    DiaryDay,
    DiaryEntry,
    DiaryFrozenOption,
    DiaryFrozenPlannedItem,
    DiarySlot,
    Library,
    Menu,
    NutrientTotals,
    Programming
  }

  alias Easy.Repo
  alias Easy.Result
  alias Easy.Revision

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
         :ok <- validate_slots(slots) do
      Repo.snapshot(fn -> {:ok, save_day(ctx, client, date, slots)} end)
    end
  rescue
    error in Postgrex.Error ->
      if error.postgres[:code] == :serialization_failure,
        do: {:error, :conflict},
        else: reraise(error, __STACKTRACE__)
  end

  defp save_day(ctx, client, date, drafts) do
    now = DateTime.utc_now(:second)

    with {:ok, _slots} <-
           Result.traverse(Enum.sort_by(drafts, & &1.meal_slot), &save_slot(ctx, client, date, &1, now)),
         {:ok, day} <- DayAssembler.assemble(ctx, client, date, :client, now) do
      if drafts != [], do: Client.last_active_stamp(client.business_id, client.id, now) |> Repo.update_all([])
      day
    else
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp validate_slots(slots) do
    with :ok <- unique_values(slots, :meal_slot), {:ok, _} <- Result.traverse(slots, &validate_entries/1), do: :ok
  end

  defp validate_entries(slot) do
    planned = Enum.reject(slot.entries, &is_nil(&1.planned_item_ref))

    with :ok <- unique_values(slot.entries, :id), :ok <- unique_values(planned, :planned_item_ref) do
      if Enum.any?(slot.entries, &(&1.food_id && &1.recipe_id)) do
        changeset = Ecto.Changeset.change(%DiaryEntry{})
        {:error, Ecto.Changeset.add_error(changeset, :food_id, "must supply at most one Library reference")}
      else
        {:ok, slot}
      end
    end
  end

  defp unique_values(items, key) do
    if length(Enum.uniq_by(items, &Map.fetch!(&1, key))) == length(items),
      do: :ok,
      else: {:error, :conflict}
  end

  defp save_slot(ctx, client, date, draft, now) do
    existing = locked_slot(client, date, draft.meal_slot)

    timezone =
      if existing, do: existing.applied_timezone, else: CorrectionPolicy.applied_timezone(client)

    with :ok <- ensure_writable(date, timezone, now),
         :ok <- ensure_revision(existing, draft.expected_revision),
         {:ok, slot} <- start_slot(ctx, client, date, draft, existing, timezone, now),
         {:ok, option_id} <- select_option(slot, draft.meal_id, date, now),
         changeset =
           DiarySlot.update_changeset(slot, %{
             active_frozen_option_id: option_id,
             revision: draft.expected_revision + 1
           }),
         {:ok, _entries} <- replace_entries(ctx, client, Ecto.Changeset.apply_changes(changeset), draft.entries) do
      Repo.update(changeset)
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
    active = DiarySlot.active_option(slot)
    current_id = active && active.source_meal_id

    cond do
      current_id == meal_id ->
        {:ok, slot.active_frozen_option_id}

      is_nil(meal_id) ->
        {:error, :not_found}

      true ->
        with :ok <-
               CorrectionPolicy.validate_switch(
                 date,
                 CorrectionPolicy.local_today(slot.applied_timezone, now)
               ),
             {:ok, option} <- find_frozen_option(slot, meal_id) do
          {:ok, option.id}
        end
    end
  end

  defp replace_entries(ctx, client, slot, drafts) do
    wanted = Enum.map(drafts, & &1.id)

    DiaryEntry
    |> DiaryEntry.for_client(client.business_id, client.id)
    |> where([entry], entry.nutrition_diary_slot_id == ^slot.id and entry.id not in ^wanted)
    |> Repo.delete_all()

    Result.traverse(drafts, &save_entry(ctx, client, slot, &1))
  end

  defp save_entry(ctx, client, slot, command) do
    existing = Enum.find(slot.entries, &(&1.id == command.id))

    with {:ok, planned} <- planned_for_entry(slot, existing, command.planned_item_ref),
         {:ok, attrs} <- entry_attrs(ctx, existing || planned, command) do
      if existing do
        Repo.update(DiaryEntry.update_changeset(existing, attrs))
      else
        client.business_id
        |> DiaryEntry.insert_changeset(client.id, slot.id, link_planned_item(attrs, planned))
        |> Ecto.Changeset.put_change(:id, command.id)
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

  defp link_planned_item(attrs, nil), do: attrs

  defp link_planned_item(attrs, item) do
    Map.merge(attrs, %{
      frozen_planned_item_id: item.id,
      frozen_option_id: item.nutrition_diary_frozen_option_id
    })
  end

  defp entry_attrs(_ctx, nil, %{food_id: nil, recipe_id: nil}), do: {:error, :not_found}

  defp entry_attrs(ctx, source, command) do
    if source && same_source?(source, command) do
      with {:ok, changes} <- update_attrs(ctx, source, command) do
        {:ok, Map.merge(snapshot_attrs(source), changes)}
      end
    else
      with {:ok, [resolved]} <-
             Library.resolve_items(ctx, [
               %{kind: Library.item_kind(command), id: command.food_id || command.recipe_id, portion: command.portion}
             ]) do
        {:ok, resolved_entry_attrs(resolved, command)}
      end
    end
  end

  defp same_source?(_source, %{food_id: nil, recipe_id: nil}), do: true
  defp same_source?(source, command), do: source.food_id == command.food_id and source.recipe_id == command.recipe_id

  defp snapshot_attrs(source), do: Map.take(source, [:display_name, :portion, :nutrients, :food_id, :recipe_id])

  defp update_attrs(ctx, entry, command) do
    with {:ok, ratio, grams} <- portion_scale(ctx, entry, command.portion) do
      {:ok, %{portion: Map.put(command.portion, :grams, grams), nutrients: NutrientTotals.scale(entry.nutrients, ratio), notes: command.notes}}
    end
  end

  defp portion_scale(_ctx, %{portion: %{grams: weight_g}}, %{kind: :gram, grams: grams})
       when is_number(weight_g) and weight_g > 0 and is_number(grams) and grams > 0,
       do: {:ok, grams / weight_g, grams / 1}

  defp portion_scale(_ctx, %{portion: %{amount: stored, unit: unit, label: label, grams: weight_g}}, %{
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

  defp portion_scale(ctx, %{portion: %{grams: stored}} = entry, portion)
       when is_number(stored) and stored > 0 do
    spec = %{kind: Library.item_kind(entry), id: entry.food_id || entry.recipe_id, portion: portion}

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
    do: {:error, Revision.stale(%DiarySlot{revision: 0})}

  defp ensure_revision(%DiarySlot{revision: revision}, revision), do: :ok
  defp ensure_revision(slot, _expected), do: {:error, Revision.stale(slot)}

  defp find_frozen_item(slot, planned_item_ref) do
    items = planned_items_for_option(DiarySlot.active_option(slot))

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
    %{
      display_name: resolved.item.name,
      portion: resolved.portion,
      nutrients: resolved.nutrients,
      notes: command.notes,
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
        revision: 1,
        nutrition_diary_day_id: freeze_day(client, date, guidance, now).id
      }

    case insert_slot_row(client, attrs, now) do
      {:inserted, slot} ->
        freeze_slot(slot, meal_slot, guidance)

      :conflict ->
        case locked_slot(client, date, meal_slot) do
          %DiarySlot{} = slot -> {:error, Revision.stale(slot)}
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

  defp freeze_day(client, date, guidance, now) do
    attrs =
      Map.merge(DiaryDay.target_attrs(guidance && guidance.plan), %{
        id: Ecto.UUID.generate(),
        business_id: client.business_id,
        client_id: client.id,
        local_date: date,
        inserted_at: now,
        updated_at: now
      })

    Repo.insert_all(DiaryDay, [attrs], on_conflict: :nothing, conflict_target: [:business_id, :client_id, :local_date])
    Repo.one(DiaryDay.for_date(client.business_id, client.id, date))
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
    attrs = %{
      display_name: item.name,
      portion: item.portion,
      nutrients: item.nutrients,
      position: position,
      source_meal_item_id: item.id,
      food_id: item.food_id,
      recipe_id: item.recipe_id
    }

    {:ok, _item} = Repo.insert(DiaryFrozenPlannedItem.insert_changeset(slot.business_id, slot.id, option.id, attrs))
  end
end
