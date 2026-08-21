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

  ## Nutrition Day reads

  @spec get_client_nutrition_day(Ctx.t(), Date.t()) :: {:ok, map()} | {:error, :not_found}
  def get_client_nutrition_day(%Ctx{} = ctx, %Date{} = date) do
    with {:ok, %{nutrition_days: [day]}} <- list_client_nutrition_days(ctx, date: date) do
      {:ok, day}
    end
  end

  @spec get_nutrition_day_for_client(Ctx.t(), String.t(), Date.t()) ::
          {:ok, map()} | {:error, :not_found}
  def get_nutrition_day_for_client(%Ctx{} = ctx, client_id, %Date{} = date) do
    with {:ok, %{nutrition_days: [day]}} <- list_nutrition_days_for_client(ctx, client_id, date: date) do
      {:ok, day}
    end
  end

  @spec list_client_nutrition_days(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), nutrition_days: [map()]}}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_client_nutrition_days(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client} <- Clients.get_client_account(ctx) do
      list_days(ctx, client, opts, :client)
    end
  end

  @spec list_nutrition_days_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), nutrition_days: [map()]}}
          | {:error, :not_found | :invalid_date_range | :date_range_too_wide | :incomplete_date_range}
  def list_nutrition_days_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with {:ok, client} <- Clients.authorize_client(ctx, client_id) do
      list_days(ctx, client, opts, :coach)
    end
  end

  ## Client commands

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
      fingerprint =
        command_fingerprint("POST", date, "extras", %{
          meal_slot: command.meal_slot,
          food_id: command.food_id,
          recipe_id: command.recipe_id,
          portion: command.portion,
          notes: command.notes
        })

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
      fingerprint =
        command_fingerprint("POST", date, "planned-items", %{
          meal_slot: command.meal_slot,
          meal_item_id: command.meal_item_id
        })

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
         {:ok, meal_slot} <- MealSlot.cast(attrs[:meal_slot]) do
      fingerprint = command_fingerprint("POST", date, "planned-options", %{meal_slot: meal_slot})
      replay_or_run(client, uuid, fingerprint, fn -> record_planned_option(ctx, client, date, meal_slot) end)
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
      fingerprint = command_fingerprint("POST", date, "planned-day", %{})
      replay_or_run(client, uuid, fingerprint, fn -> record_planned_day(ctx, client, date) end)
    end
  end

  def log_client_planned_day(%Ctx{}, %Date{}, _key), do: {:error, :invalid_idempotency_key}

  @spec switch_client_option(Ctx.t(), Date.t(), map(), String.t()) ::
          {:ok, map()}
          | {:error,
             :not_found
             | :client_inactive
             | :invalid_idempotency_key
             | :future_date
             | :cannot_switch_past_slot
             | :conflict
             | Ecto.Changeset.t()}
  def switch_client_option(%Ctx{} = ctx, %Date{} = date, attrs, key) when is_binary(key) do
    with {:ok, uuid} <- cast_uuid(key),
         {:ok, client} <- load_active_client(ctx),
         {:ok, command} <- cast_switch_command(attrs) do
      fingerprint =
        command_fingerprint("POST", date, "active-option", %{
          meal_slot: command.meal_slot,
          meal_id: command.meal_id,
          expected_revision: command.expected_revision
        })

      replay_or_run(client, uuid, fingerprint, fn -> record_switch(ctx, client, date, command) end)
    end
  end

  def switch_client_option(%Ctx{}, %Date{}, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec replace_client_planned_item(Ctx.t(), Date.t(), map(), String.t()) ::
          {:ok, map()}
          | {:error,
             :not_found
             | :client_inactive
             | :invalid_idempotency_key
             | :invalid_portion
             | :future_date
             | :outside_correction_window
             | :cannot_start_past_slot
             | :conflict
             | Ecto.Changeset.t()}
  def replace_client_planned_item(%Ctx{} = ctx, %Date{} = date, attrs, key) when is_binary(key) do
    with {:ok, uuid} <- cast_uuid(key),
         {:ok, client} <- load_active_client(ctx),
         {:ok, command} <- cast_replace_command(attrs) do
      fingerprint =
        command_fingerprint("POST", date, "replacements", %{
          meal_slot: command.meal_slot,
          meal_item_id: command.meal_item_id,
          food_id: command.food_id,
          recipe_id: command.recipe_id,
          portion: command.portion,
          notes: command.notes,
          expected_revision: command.expected_revision
        })

      replay_or_run(client, uuid, fingerprint, fn -> record_replacement(ctx, client, date, command) end)
    end
  end

  def replace_client_planned_item(%Ctx{}, %Date{}, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec update_client_entry(Ctx.t(), Date.t(), String.t(), map(), String.t()) ::
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
  def update_client_entry(%Ctx{} = ctx, %Date{} = date, entry_id, attrs, key)
      when is_binary(entry_id) and is_binary(key) do
    with {:ok, uuid} <- cast_uuid(key),
         {:ok, client} <- load_active_client(ctx),
         {:ok, command} <- cast_update_command(attrs) do
      fingerprint =
        command_fingerprint("PATCH", date, "entries/#{entry_id}", %{
          expected_revision: command.expected_revision,
          portion: command.portion,
          notes: command.notes
        })

      replay_or_run(client, uuid, fingerprint, fn -> record_update(ctx, client, date, entry_id, command) end)
    end
  end

  def update_client_entry(%Ctx{}, %Date{}, _entry_id, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec delete_client_entry(Ctx.t(), Date.t(), String.t(), map(), String.t()) ::
          {:ok, map()}
          | {:error,
             :not_found
             | :client_inactive
             | :invalid_idempotency_key
             | :future_date
             | :outside_correction_window
             | :conflict
             | Ecto.Changeset.t()}
  def delete_client_entry(%Ctx{} = ctx, %Date{} = date, entry_id, attrs, key)
      when is_binary(entry_id) and is_binary(key) do
    with {:ok, uuid} <- cast_uuid(key),
         {:ok, client} <- load_active_client(ctx),
         {:ok, expected_revision} <- cast_revision(attrs[:expected_revision]) do
      fingerprint =
        command_fingerprint("DELETE", date, "entries/#{entry_id}", %{expected_revision: expected_revision})

      replay_or_run(client, uuid, fingerprint, fn ->
        record_delete(ctx, client, date, entry_id, expected_revision)
      end)
    end
  end

  def delete_client_entry(%Ctx{}, %Date{}, _entry_id, _attrs, _key), do: {:error, :invalid_idempotency_key}

  ## Ledger sweeping

  @spec purge_expired_command_ledger(DateTime.t()) :: {:ok, non_neg_integer()}
  def purge_expired_command_ledger(now \\ DateTime.utc_now(:second)) do
    case Repo.all(from(row in DiaryCommandLedger.expired(now), select: row.id, limit: 1000)) do
      [] ->
        {:ok, 0}

      ids ->
        {count, nil} = Repo.delete_all(from(row in DiaryCommandLedger, where: row.id in ^ids))
        {:ok, count}
    end
  end

  ## Command casting

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

  defp cast_switch_command(attrs) do
    with {:ok, meal_slot} <- MealSlot.cast(attrs[:meal_slot]),
         {:ok, meal_id} <- cast_id(attrs[:meal_id]),
         {:ok, revision} <- cast_revision(attrs[:expected_revision]) do
      {:ok, %{meal_slot: meal_slot, meal_id: meal_id, expected_revision: revision}}
    end
  end

  defp cast_replace_command(attrs) do
    with {:ok, extra} <- cast_extra_command(attrs),
         {:ok, meal_item_id} <- cast_id(attrs[:meal_item_id]),
         {:ok, revision} <- cast_revision(attrs[:expected_revision]) do
      {:ok, Map.merge(extra, %{meal_item_id: meal_item_id, expected_revision: revision})}
    end
  end

  defp cast_update_command(attrs) do
    with {:ok, revision} <- cast_revision(attrs[:expected_revision]),
         {:ok, portion} <- optional_portion(attrs[:portion]) do
      {:ok, %{expected_revision: revision, portion: portion, notes: Map.get(attrs, :notes, :unchanged)}}
    end
  end

  defp optional_portion(nil), do: {:ok, nil}
  defp optional_portion(portion), do: cast_portion(portion)

  defp cast_revision(revision) when is_integer(revision) and revision > 0, do: {:ok, revision}
  defp cast_revision(_revision), do: {:error, :not_found}

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

  defp cast_portion(%{kind: kind} = portion) when kind in [:gram, "gram"],
    do: {:ok, Map.put(portion, :kind, :gram)}

  defp cast_portion(%{kind: kind} = portion) when kind in [:serving, "serving"],
    do: {:ok, Map.put(portion, :kind, :serving)}

  defp cast_portion(_portion), do: {:error, :invalid_portion}

  ## Command execution

  defp record_extra(ctx, client, date, command) do
    timezone = applied_timezone(client)
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    with :ok <- ensure_writable(date, slot_timezone(client, date, command.meal_slot, timezone)),
         {:ok, [resolved]} <-
           Library.resolve_items(ctx, [%{kind: command.kind, id: command.id, portion: command.portion}]) do
      slot =
        locked_slot(client, date, command.meal_slot) ||
          create_frozen_slot!(client, date, timezone, command.meal_slot, nil, freeze_source(ctx, date, today))

      {:ok, _entry} =
        Repo.insert(DiaryEntry.insert_changeset(client.business_id, client.id, slot.id, resolved_entry_attrs(resolved, command)))

      {:ok, assemble_day(ctx, client, date, :client)}
    end
  end

  defp record_planned_item(ctx, client, date, command) do
    timezone = applied_timezone(client)
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    with :ok <- ensure_writable(date, slot_timezone(client, date, command.meal_slot, timezone)),
         {:ok, slot} <- ensure_planned_slot(ctx, client, date, timezone, today, command.meal_slot),
         {:ok, item} <- find_frozen_item(slot, command.meal_item_id) do
      fulfil_or_extra!(client, slot, item)
      {:ok, assemble_day(ctx, client, date, :client)}
    end
  end

  defp record_planned_option(ctx, client, date, meal_slot) do
    timezone = applied_timezone(client)
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    with :ok <- ensure_writable(date, slot_timezone(client, date, meal_slot, timezone)),
         {:ok, slot} <- ensure_planned_slot(ctx, client, date, timezone, today, meal_slot) do
      fulfil_remaining_active!(client, slot)
      {:ok, assemble_day(ctx, client, date, :client)}
    end
  end

  defp record_planned_day(ctx, client, date) do
    timezone = applied_timezone(client)
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)
    frozen = frozen_by_slot(client, date)

    with :ok <- ensure_day_writable(date, timezone, frozen) do
      meal_slots = planned_day_meal_slots(ctx, date, today, frozen)
      Enum.each(meal_slots, &fulfil_day_slot!(ctx, client, date, timezone, today, &1))
      {:ok, assemble_day(ctx, client, date, :client)}
    end
  end

  defp ensure_day_writable(date, fallback_timezone, frozen) when map_size(frozen) == 0,
    do: ensure_writable(date, fallback_timezone)

  defp ensure_day_writable(date, _fallback_timezone, frozen) do
    Enum.reduce_while(frozen, :ok, fn {_meal_slot, slot}, :ok ->
      case ensure_writable(date, slot.applied_timezone) do
        :ok -> {:cont, :ok}
        {:error, _reason} = error -> {:halt, error}
      end
    end)
  end

  defp planned_day_meal_slots(ctx, date, today, frozen) do
    if Date.compare(date, today) == :eq do
      covered_meal_slots(ctx, date)
    else
      Map.keys(frozen)
    end
  end

  defp covered_meal_slots(ctx, date) do
    case Programming.resolve_client_coverage(ctx, date) do
      {:ok, nil} -> []
      {:ok, guidance} -> Enum.map(live_slots(guidance.day_pattern, guidance.plan, nil, true), & &1.meal_slot)
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp fulfil_day_slot!(ctx, client, date, timezone, today, meal_slot) do
    case ensure_planned_slot(ctx, client, date, timezone, today, meal_slot) do
      {:ok, slot} -> fulfil_remaining_active!(client, slot)
      {:error, :cannot_start_past_slot} -> :ok
      {:error, reason} -> Repo.rollback(reason)
    end
  end

  defp record_switch(ctx, client, date, command) do
    timezone = applied_timezone(client)

    with :ok <- ensure_switchable(date, slot_timezone(client, date, command.meal_slot, timezone)),
         {:ok, slot} <- ensure_switch_slot(ctx, client, date, timezone, command),
         :ok <- ensure_revision(slot, command.expected_revision),
         {:ok, option} <- find_frozen_option(slot, command.meal_id) do
      activate_option!(slot, option)
      {:ok, assemble_day(ctx, client, date, :client)}
    end
  end

  defp ensure_switchable(date, timezone) do
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    cond do
      Date.compare(date, today) == :gt -> {:error, :future_date}
      Date.compare(date, today) == :lt -> {:error, :cannot_switch_past_slot}
      true -> :ok
    end
  end

  defp ensure_switch_slot(ctx, client, date, timezone, command) do
    case locked_slot(client, date, command.meal_slot) do
      %DiarySlot{has_coverage: true, frozen_options: [_ | _]} = slot -> {:ok, slot}
      %DiarySlot{} -> {:error, :not_found}
      nil -> freeze_slot_for_switch(ctx, client, date, timezone, command)
    end
  end

  defp freeze_slot_for_switch(ctx, client, date, timezone, command) do
    if command.expected_revision != 1 do
      {:error, stale_revision_changeset(%DiarySlot{revision: 1})}
    else
      with {true, guidance} <- coverage_guidance(ctx, date),
           true <- live_option?(guidance, command.meal_slot, command.meal_id) do
        {:ok, create_frozen_slot!(client, date, timezone, command.meal_slot, command.meal_id, {true, guidance})}
      else
        _missing -> {:error, :not_found}
      end
    end
  end

  defp live_option?(guidance, meal_slot, meal_id) do
    guidance.day_pattern
    |> pattern_options()
    |> Enum.any?(&(&1.meal_slot == meal_slot and &1.nutrition_meal_id == meal_id))
  end

  defp find_frozen_option(slot, meal_id) do
    case Enum.find(slot.frozen_options, &(&1.source_meal_id == meal_id)) do
      nil -> {:error, :not_found}
      option -> {:ok, option}
    end
  end

  defp activate_option!(%DiarySlot{active_frozen_option_id: id} = slot, %{id: id}), do: slot

  defp activate_option!(slot, option) do
    case Repo.update(
           DiarySlot.update_changeset(slot, %{
             active_frozen_option_id: option.id,
             revision: slot.revision + 1
           })
         ) do
      {:ok, updated} -> updated
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end

  defp record_replacement(ctx, client, date, command) do
    timezone = applied_timezone(client)
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    with :ok <- ensure_writable(date, slot_timezone(client, date, command.meal_slot, timezone)),
         {:ok, slot} <- ensure_planned_slot(ctx, client, date, timezone, today, command.meal_slot),
         {:ok, item} <- find_any_frozen_item(slot, command.meal_item_id),
         entry <- lock_replacement_entry(client, slot, item),
         {:ok, [resolved]} <-
           Library.resolve_items(ctx, [%{kind: command.kind, id: command.id, portion: command.portion}]),
         {:ok, _entry} <- replace_fulfilment(client, slot, item, entry, resolved, command) do
      {:ok, assemble_day(ctx, client, date, :client)}
    end
  end

  defp find_any_frozen_item(slot, meal_item_id) do
    items = Enum.flat_map(slot.frozen_options, &planned_items_for_option/1)

    case Enum.find(items, &(&1.id == meal_item_id or &1.source_meal_item_id == meal_item_id)) do
      nil -> {:error, :not_found}
      item -> {:ok, item}
    end
  end

  defp lock_replacement_entry(client, slot, item) do
    DiaryEntry
    |> DiaryEntry.for_client(client.business_id, client.id)
    |> where(
      [entry],
      entry.nutrition_diary_slot_id == ^slot.id and entry.frozen_planned_item_id == ^item.id
    )
    |> lock("FOR UPDATE")
    |> Repo.one()
  end

  defp replace_fulfilment(client, slot, item, nil, resolved, command) do
    if command.expected_revision != 1 do
      {:error, stale_revision_changeset(%DiaryEntry{revision: 1})}
    else
      attrs =
        resolved
        |> resolved_entry_attrs(command)
        |> Map.merge(%{
          frozen_planned_item_id: item.id,
          frozen_option_id: item.nutrition_diary_frozen_option_id
        })

      Repo.insert(DiaryEntry.insert_changeset(client.business_id, client.id, slot.id, attrs))
    end
  end

  defp replace_fulfilment(_client, _slot, _item, entry, resolved, command) do
    with :ok <- ensure_entry_revision(entry, command.expected_revision) do
      Repo.update(
        DiaryEntry.update_changeset(
          entry,
          Map.put(resolved_entry_attrs(resolved, command), :revision, entry.revision + 1)
        )
      )
    end
  end

  defp record_update(ctx, client, date, entry_id, command) do
    with {:ok, entry} <- lock_entry(client, date, entry_id),
         :ok <- ensure_writable(date, entry.diary_slot.applied_timezone),
         :ok <- ensure_entry_revision(entry, command.expected_revision),
         {:ok, attrs} <- update_attrs(entry, command) do
      case Repo.update(DiaryEntry.update_changeset(entry, attrs)) do
        {:ok, _entry} -> {:ok, assemble_day(ctx, client, date, :client)}
        {:error, changeset} -> Repo.rollback(changeset)
      end
    end
  end

  defp record_delete(ctx, client, date, entry_id, expected_revision) do
    with {:ok, entry} <- lock_entry(client, date, entry_id),
         :ok <- ensure_writable(date, entry.diary_slot.applied_timezone),
         :ok <- ensure_entry_revision(entry, expected_revision) do
      case Repo.delete(entry) do
        {:ok, _deleted} -> {:ok, assemble_day(ctx, client, date, :client)}
        {:error, changeset} -> Repo.rollback(changeset)
      end
    end
  end

  defp lock_entry(client, date, entry_id) do
    entry =
      DiaryEntry
      |> DiaryEntry.for_client(client.business_id, client.id)
      |> DiaryEntry.lock_id(entry_id)
      |> Repo.one()
      |> Repo.preload(:diary_slot)

    case entry do
      %DiaryEntry{diary_slot: %DiarySlot{local_date: ^date}} -> {:ok, entry}
      _mismatch -> {:error, :not_found}
    end
  end

  defp update_attrs(entry, %{portion: nil, notes: notes}) do
    {:ok, maybe_put_notes(%{revision: entry.revision + 1}, notes)}
  end

  defp update_attrs(entry, command) do
    with {:ok, ratio, grams} <- portion_scale(entry, command.portion) do
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
        complete: nutrients.complete,
        revision: entry.revision + 1
      }

      {:ok, maybe_put_notes(attrs, command.notes)}
    end
  end

  defp maybe_put_notes(attrs, :unchanged), do: attrs
  defp maybe_put_notes(attrs, notes), do: Map.put(attrs, :notes, notes)

  defp portion_scale(%{weight_g: weight_g}, %{kind: :gram, grams: grams})
       when is_number(weight_g) and weight_g > 0 and is_number(grams) and grams > 0,
       do: {:ok, grams / weight_g, grams / 1}

  defp portion_scale(%{amount: stored, unit: unit, weight_g: weight_g}, %{
         kind: :serving,
         amount: amount,
         unit: unit
       })
       when is_number(stored) and stored > 0 and is_number(amount) and amount > 0 do
    ratio = amount / stored
    grams = if is_number(weight_g) and weight_g > 0, do: weight_g * ratio, else: nil
    {:ok, ratio, grams}
  end

  defp portion_scale(_entry, _portion), do: {:error, :invalid_portion}

  defp ensure_writable(date, timezone) do
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    cond do
      Date.compare(date, today) == :gt -> {:error, :future_date}
      Date.diff(today, date) > @correction_days -> {:error, :outside_correction_window}
      true -> :ok
    end
  end

  defp slot_timezone(client, date, meal_slot, fallback) do
    slot =
      DiarySlot
      |> DiarySlot.for_client(client.business_id, client.id)
      |> DiarySlot.for_date(date)
      |> where([slot], slot.meal_slot == ^meal_slot)
      |> Repo.one()

    (slot && slot.applied_timezone) || fallback
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

      not scheduled_meal_slot?(ctx, date, meal_slot) ->
        {:error, :not_found}

      true ->
        {:ok, create_frozen_slot!(client, date, timezone, meal_slot, nil, freeze_source(ctx, date, today))}
    end
  end

  defp scheduled_meal_slot?(ctx, date, meal_slot) do
    case coverage_guidance(ctx, date) do
      {false, nil} -> false
      {true, guidance} -> Enum.any?(live_slots(guidance.day_pattern, guidance.plan, nil, true), &(&1.meal_slot == meal_slot))
    end
  end

  defp ensure_revision(%DiarySlot{revision: revision}, revision), do: :ok
  defp ensure_revision(slot, _expected), do: {:error, stale_revision_changeset(slot)}

  defp ensure_entry_revision(%DiaryEntry{revision: revision}, revision), do: :ok
  defp ensure_entry_revision(entry, _expected), do: {:error, stale_revision_changeset(entry)}

  defp stale_revision_changeset(record) do
    record
    |> Ecto.Changeset.change()
    |> Ecto.Changeset.add_error(:revision, "is stale")
    |> Map.put(:action, :stale_revision)
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
    |> Enum.each(&insert_fulfilment_or_copy!(client, slot, &1))
  end

  defp planned_items_for_option(nil), do: []
  defp planned_items_for_option(option), do: List.wrap(option.planned_items)

  defp fulfil_or_extra!(client, slot, item) do
    if Enum.any?(slot.entries, &(&1.frozen_planned_item_id == item.id)) do
      insert_copy!(client, slot, item)
    else
      insert_fulfilment_or_copy!(client, slot, item)
    end
  end

  defp insert_fulfilment_or_copy!(client, slot, item) do
    case Repo.insert(DiaryEntry.insert_changeset(client.business_id, client.id, slot.id, fulfilment_attrs(item))) do
      {:ok, entry} ->
        entry

      {:error, changeset} ->
        # A partial unique index allows one fulfilment per planned item. Losing
        # that race is not an error: the entry still counts, as an unlinked copy.
        if Keyword.has_key?(changeset.errors, :frozen_planned_item_id) do
          insert_copy!(client, slot, item)
        else
          Repo.rollback(changeset)
        end
    end
  end

  defp insert_copy!(client, slot, item) do
    case Repo.insert(DiaryEntry.insert_changeset(client.business_id, client.id, slot.id, copy_attrs(item))) do
      {:ok, entry} -> entry
      {:error, changeset} -> Repo.rollback(changeset)
    end
  end

  defp fulfilment_attrs(item), do: Map.put(copy_attrs(item), :frozen_planned_item_id, item.id)

  defp copy_attrs(item) do
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
      source_food_id: item.source_food_id,
      source_recipe_id: item.source_recipe_id,
      food_id: item.food_id,
      recipe_id: item.recipe_id,
      frozen_option_id: item.nutrition_diary_frozen_option_id
    }
  end

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

  ## Idempotency ledger

  defp command_fingerprint(method, date, segment, payload) do
    DiaryCommandLedger.fingerprint(method, "/v1/client/nutrition-days/#{Date.to_iso8601(date)}/#{segment}", payload)
  end

  defp replay_or_run(client, key, fingerprint, fun) do
    Repo.transaction(fn ->
      case reserve_ledger(client, key, fingerprint) do
        {:replay, outcome} -> outcome
        :conflict -> Repo.rollback(:conflict)
        {:run, ledger} -> run_and_store(ledger, fun)
      end
    end)
    |> case do
      {:ok, {status, _value} = outcome} when status in [:ok, :error] -> outcome
      {:error, reason} -> {:error, reason}
    end
  end

  defp run_and_store(ledger, fun) do
    outcome = fun.()

    case outcome do
      {:ok, _day} -> stamp_client_activity!(ledger.business_id, ledger.client_id)
      {:error, _reason} -> :ok
    end

    store_outcome!(ledger, outcome)
  end

  defp stamp_client_activity!(business_id, client_id) do
    Client
    |> Client.last_active_stamp(business_id, client_id, DateTime.utc_now(:second))
    |> Repo.update_all([])
    |> case do
      {1, nil} -> :ok
      {0, nil} -> Repo.rollback(:not_found)
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
        # Our insert lost the (client, key) race: lock and compare against the
        # winner's row. If it vanished before we locked it (the winner rolled
        # back), the key is free again — retry the insert.
        case lock_ledger(client, key) do
          nil -> insert_fresh_ledger(client, key, fingerprint)
          ledger -> compare_reserved(ledger, fingerprint)
        end
    end
  end

  defp compare_reserved(%DiaryCommandLedger{fingerprint: fingerprint} = ledger, fingerprint) do
    if ledger.outcome do
      {:replay, :erlang.binary_to_term(ledger.outcome)}
    else
      {:run, ledger}
    end
  end

  defp compare_reserved(_ledger, _fingerprint), do: :conflict

  defp lock_ledger(client, key) do
    DiaryCommandLedger
    |> DiaryCommandLedger.for_client(client.business_id, client.id)
    |> DiaryCommandLedger.lock_key(key)
    |> Repo.one()
  end

  defp store_outcome!(ledger, outcome) do
    case Repo.update(DiaryCommandLedger.update_changeset(ledger, %{outcome: :erlang.term_to_binary(outcome)})) do
      {:ok, _ledger} -> outcome
      {:error, changeset} -> Repo.rollback(changeset)
    end
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

  defp create_frozen_slot!(client, date, timezone, meal_slot, active_meal_id, {has_coverage, guidance}) do
    attrs =
      %{
        local_date: date,
        meal_slot: meal_slot,
        applied_timezone: timezone,
        has_coverage: has_coverage,
        revision: 1
      }
      |> Map.merge(frozen_target_attrs(guidance))

    case insert_slot_row(client, attrs) do
      {:inserted, slot} ->
        freeze_slot!(slot, meal_slot, guidance, active_meal_id)

      :conflict ->
        # Lost the slot-identity race: a concurrent request created and froze
        # this slot; lock and use theirs.
        locked_slot(client, date, meal_slot) || Repo.rollback(:conflict)
    end
  end

  defp insert_slot_row(client, attrs) do
    now = DateTime.utc_now(:second)

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

  defp freeze_slot!(slot, _meal_slot, nil, _active_meal_id), do: slot

  defp freeze_slot!(slot, meal_slot, %{plan: plan, day_pattern: pattern}, active_meal_id) do
    meals = Map.new(List.wrap(plan.meals), &{&1.id, &1})

    options =
      pattern
      |> pattern_options()
      |> Enum.filter(&(&1.meal_slot == meal_slot))
      |> Enum.sort_by(&{&1.position, &1.id})

    frozen = Enum.map(options, &insert_frozen_option!(slot, &1, meals))
    active = Enum.find(frozen, &(&1.source_meal_id == active_meal_id)) || List.first(frozen)

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
          source_meal_id: option.nutrition_meal_id,
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
          source_food_id: item.food_id,
          source_recipe_id: item.recipe_id,
          food_id: item.food_id,
          recipe_id: item.recipe_id
        })
      )
  end

  ## Read-model assembly

  defp list_days(ctx, client, opts, actor) do
    client = Repo.preload(client, :business)
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = opts |> Keyword.get(:limit, 20) |> max(1) |> min(100)

    with {:ok, dates} <- resolve_dates(opts, local_today(client)) do
      page = dates |> Enum.drop(offset) |> Enum.take(limit)
      {:ok, %{count: length(dates), nutrition_days: Enum.map(page, &assemble_day(ctx, client, &1, actor))}}
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

  defp assemble_day(ctx, client, date, actor) do
    frozen = frozen_by_slot(client, date)
    timezone = day_timezone(Map.values(frozen), applied_timezone(client))
    today = LocalCalendar.to_local_date(DateTime.utc_now(), timezone)

    case live_guidance(ctx, client.id, date, today, actor) do
      {:ok, nil} -> merge_day(date, today, timezone, nil, frozen)
      {:ok, guidance} -> merge_day(date, today, timezone, guidance, frozen)
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

  defp merge_day(date, today, timezone, guidance, frozen) do
    live =
      if guidance do
        guidance.day_pattern
        |> live_slots(guidance.plan, timezone, write_eligible?(date, today))
        |> Map.new(&{&1.meal_slot, &1})
      else
        %{}
      end

    slots =
      MealSlot.values()
      |> Enum.map(&merged_slot(&1, frozen, live))
      |> Enum.reject(&is_nil/1)

    targets = if(guidance, do: targets(guidance.plan), else: frozen_targets(frozen))
    applied = day_timezone(slots, timezone)

    %{
      date: date,
      plan_id: guidance && guidance.plan.id,
      write_eligible: Enum.any?(slots, & &1.write_eligible) or (slots == [] and write_eligible?(date, today)),
      applied_timezone: applied,
      targets: targets,
      slots: slots,
      summary: day_summary(slots, targets)
    }
  end

  defp merged_slot(slot, frozen, live) do
    cond do
      Map.has_key?(frozen, slot) -> frozen_slot_view(Map.fetch!(frozen, slot))
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

  defp frozen_slot_view(%DiarySlot{} = slot) do
    ordered = Enum.sort_by(slot.frozen_options, &{&1.position, &1.id})
    active = active_frozen_option(slot, ordered)
    items = if active, do: active.planned_items, else: []
    today = LocalCalendar.to_local_date(DateTime.utc_now(), slot.applied_timezone)

    %{
      meal_slot: slot.meal_slot,
      meal_id: active && active.source_meal_id,
      revision: slot.revision,
      applied_timezone: slot.applied_timezone,
      write_eligible: write_eligible?(slot.local_date, today),
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

  defp local_today(%Client{} = client) do
    LocalCalendar.to_local_date(DateTime.utc_now(), applied_timezone(client))
  end

  defp applied_timezone(%Client{} = client) do
    LocalCalendar.applied_timezone(client.timezone, business_timezone(client))
  end

  defp business_timezone(%Client{business: %Easy.Orgs.Business{timezone: timezone}}), do: timezone
  defp business_timezone(_client), do: nil

  ## Status derivation

  defp write_eligible?(date, today), do: Date.diff(today, date) in 0..@correction_days

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
end
