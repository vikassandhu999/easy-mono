defmodule Easy.Nutrition.Diary do
  alias Easy.Clients
  alias Easy.Ctx
  alias Easy.Nutrition.Day
  alias Easy.Nutrition.Diary.{CorrectionPolicy, DayAssembler}
  alias Easy.Nutrition.Diary.Idempotency

  alias Easy.Nutrition.{
    DiaryEntry,
    DiaryFrozenOption,
    DiaryFrozenPlannedItem,
    DiarySlot,
    Food,
    Library,
    Meal,
    MealItem,
    MealSlot,
    NutrientTotals,
    Programming,
    Recipe
  }

  alias Easy.Repo

  import Ecto.Query

  @type portion_input() :: %{
          required(:kind) => :gram | :serving | String.t(),
          optional(:grams) => number() | nil,
          optional(:amount) => number() | nil,
          optional(:unit) => String.t() | nil,
          optional(:label) => String.t() | nil
        }

  @type add_extra_input() :: %{
          required(:meal_slot) => atom() | String.t(),
          optional(:food_id) => String.t(),
          optional(:recipe_id) => String.t(),
          required(:portion) => portion_input(),
          optional(:notes) => String.t() | nil
        }

  @type planned_item_input() :: %{
          required(:meal_slot) => atom() | String.t(),
          required(:planned_item_ref) => String.t()
        }

  @type planned_option_input() :: %{required(:meal_slot) => atom() | String.t()}

  @type switch_option_input() :: %{
          required(:meal_slot) => atom() | String.t(),
          required(:meal_id) => String.t(),
          required(:expected_revision) => pos_integer()
        }

  @type replacement_input() :: %{
          required(:meal_slot) => atom() | String.t(),
          required(:planned_item_ref) => String.t(),
          optional(:food_id) => String.t(),
          optional(:recipe_id) => String.t(),
          required(:portion) => portion_input(),
          optional(:notes) => String.t() | nil,
          required(:expected_revision) => pos_integer()
        }

  @type update_entry_input() :: %{
          required(:expected_revision) => pos_integer(),
          optional(:portion) => portion_input() | nil,
          optional(:notes) => String.t() | nil
        }

  @type delete_entry_input() :: %{required(:expected_revision) => pos_integer()}

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
    with {:ok, %{nutrition_days: [day]}} <- list_nutrition_days_for_client(ctx, client_id, date: date) do
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

  ## Client commands

  @spec add_client_extra(Ctx.t(), Date.t(), add_extra_input(), String.t()) ::
          {:ok, Day.t()}
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
      Idempotency.run(
        client,
        uuid,
        :add_extra,
        date,
        %{
          meal_slot: command.meal_slot,
          food_id: command.food_id,
          recipe_id: command.recipe_id,
          portion: command.portion,
          notes: command.notes
        },
        fn now -> record_extra(ctx, client, date, command, now) end
      )
    end
  end

  def add_client_extra(%Ctx{}, %Date{}, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec log_client_planned_item(Ctx.t(), Date.t(), planned_item_input(), String.t()) ::
          {:ok, Day.t()}
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
      Idempotency.run(
        client,
        uuid,
        :log_planned_item,
        date,
        %{
          meal_slot: command.meal_slot,
          meal_item_id: command.planned_item_ref
        },
        fn now -> record_planned_item(ctx, client, date, command, now) end
      )
    end
  end

  def log_client_planned_item(%Ctx{}, %Date{}, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec log_client_planned_option(Ctx.t(), Date.t(), planned_option_input(), String.t()) ::
          {:ok, Day.t()}
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
      Idempotency.run(client, uuid, :log_planned_option, date, %{meal_slot: meal_slot}, fn now ->
        record_planned_option(ctx, client, date, meal_slot, now)
      end)
    end
  end

  def log_client_planned_option(%Ctx{}, %Date{}, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec log_client_planned_day(Ctx.t(), Date.t(), String.t()) ::
          {:ok, Day.t()}
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
      Idempotency.run(client, uuid, :log_planned_day, date, %{}, fn now ->
        record_planned_day(ctx, client, date, now)
      end)
    end
  end

  def log_client_planned_day(%Ctx{}, %Date{}, _key), do: {:error, :invalid_idempotency_key}

  @spec switch_client_option(Ctx.t(), Date.t(), switch_option_input(), String.t()) ::
          {:ok, Day.t()}
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
      Idempotency.run(
        client,
        uuid,
        :switch_option,
        date,
        %{
          meal_slot: command.meal_slot,
          meal_id: command.meal_id,
          expected_revision: command.expected_revision
        },
        fn now -> record_switch(ctx, client, date, command, now) end
      )
    end
  end

  def switch_client_option(%Ctx{}, %Date{}, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec replace_client_planned_item(Ctx.t(), Date.t(), replacement_input(), String.t()) ::
          {:ok, Day.t()}
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
      Idempotency.run(
        client,
        uuid,
        :replace_planned_item,
        date,
        %{
          meal_slot: command.meal_slot,
          meal_item_id: command.planned_item_ref,
          food_id: command.food_id,
          recipe_id: command.recipe_id,
          portion: command.portion,
          notes: command.notes,
          expected_revision: command.expected_revision
        },
        fn now -> record_replacement(ctx, client, date, command, now) end
      )
    end
  end

  def replace_client_planned_item(%Ctx{}, %Date{}, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec update_client_entry(Ctx.t(), Date.t(), String.t(), update_entry_input(), String.t()) ::
          {:ok, Day.t()}
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
      Idempotency.run(
        client,
        uuid,
        {:update_entry, entry_id},
        date,
        %{
          expected_revision: command.expected_revision,
          portion: command.portion,
          notes: command.notes
        },
        fn now -> record_update(ctx, client, date, entry_id, command, now) end
      )
    end
  end

  def update_client_entry(%Ctx{}, %Date{}, _entry_id, _attrs, _key), do: {:error, :invalid_idempotency_key}

  @spec delete_client_entry(Ctx.t(), Date.t(), String.t(), delete_entry_input(), String.t()) ::
          {:ok, Day.t()}
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
      Idempotency.run(
        client,
        uuid,
        {:delete_entry, entry_id},
        date,
        %{expected_revision: expected_revision},
        fn now -> record_delete(ctx, client, date, entry_id, expected_revision, now) end
      )
    end
  end

  def delete_client_entry(%Ctx{}, %Date{}, _entry_id, _attrs, _key), do: {:error, :invalid_idempotency_key}

  ## Ledger sweeping

  @spec purge_expired_command_ledger(DateTime.t()) :: {:ok, non_neg_integer()}
  def purge_expired_command_ledger(now \\ DateTime.utc_now(:second)) do
    Idempotency.purge_expired(now)
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
         {:ok, planned_item_ref} <- cast_id(attrs[:planned_item_ref]) do
      {:ok, %{meal_slot: meal_slot, planned_item_ref: planned_item_ref}}
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
         {:ok, planned_item_ref} <- cast_id(attrs[:planned_item_ref]),
         {:ok, revision} <- cast_revision(attrs[:expected_revision]) do
      {:ok, Map.merge(extra, %{planned_item_ref: planned_item_ref, expected_revision: revision})}
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

  defp record_extra(ctx, client, date, command, now) do
    timezone = CorrectionPolicy.applied_timezone(client)
    today = CorrectionPolicy.local_today(timezone, now)

    with :ok <- ensure_writable(date, slot_timezone(client, date, command.meal_slot, timezone), now),
         {:ok, [resolved]} <-
           Library.resolve_items(ctx, [%{kind: command.kind, id: command.id, portion: command.portion}]),
         {:ok, slot} <- ensure_extra_slot(ctx, client, date, timezone, today, command.meal_slot, now) do
      case Repo.insert(
             DiaryEntry.insert_changeset(
               client.business_id,
               client.id,
               slot.id,
               resolved_entry_attrs(resolved, command)
             )
           ) do
        {:ok, _entry} -> DayAssembler.assemble(ctx, client, date, :client, now)
        {:error, changeset} -> {:rollback, changeset}
      end
    end
  end

  defp record_planned_item(ctx, client, date, command, now) do
    timezone = CorrectionPolicy.applied_timezone(client)
    today = CorrectionPolicy.local_today(timezone, now)

    with :ok <- ensure_writable(date, slot_timezone(client, date, command.meal_slot, timezone), now),
         {:ok, slot} <- ensure_planned_slot(ctx, client, date, timezone, today, command.meal_slot, now),
         {:ok, item} <- find_frozen_item(slot, command.planned_item_ref),
         :ok <- fulfil_or_extra(client, slot, item) do
      DayAssembler.assemble(ctx, client, date, :client, now)
    end
  end

  defp record_planned_option(ctx, client, date, meal_slot, now) do
    timezone = CorrectionPolicy.applied_timezone(client)
    today = CorrectionPolicy.local_today(timezone, now)

    with :ok <- ensure_writable(date, slot_timezone(client, date, meal_slot, timezone), now),
         {:ok, slot} <- ensure_planned_slot(ctx, client, date, timezone, today, meal_slot, now),
         :ok <- fulfil_remaining_active(client, slot) do
      DayAssembler.assemble(ctx, client, date, :client, now)
    end
  end

  defp record_planned_day(ctx, client, date, now) do
    timezone = CorrectionPolicy.applied_timezone(client)
    today = CorrectionPolicy.local_today(timezone, now)
    frozen = frozen_by_slot(client, date)

    with :ok <- ensure_day_writable(date, timezone, frozen, now),
         {:ok, meal_slots} <- planned_day_meal_slots(ctx, date, today, frozen),
         :ok <- fulfil_day_slots(ctx, client, date, timezone, today, meal_slots, now) do
      DayAssembler.assemble(ctx, client, date, :client, now)
    end
  end

  defp ensure_day_writable(date, fallback_timezone, frozen, now) when map_size(frozen) == 0,
    do: ensure_writable(date, fallback_timezone, now)

  defp ensure_day_writable(date, _fallback_timezone, frozen, now) do
    Enum.reduce_while(frozen, :ok, fn {_meal_slot, slot}, :ok ->
      case ensure_writable(date, slot.applied_timezone, now) do
        :ok -> {:cont, :ok}
        {:error, _reason} = error -> {:halt, error}
      end
    end)
  end

  defp planned_day_meal_slots(ctx, date, today, frozen) do
    if Date.compare(date, today) == :eq do
      covered_meal_slots(ctx, date)
    else
      {:ok, Map.keys(frozen)}
    end
  end

  defp covered_meal_slots(ctx, date) do
    case Programming.resolve_client_coverage(ctx, date) do
      {:ok, nil} -> {:ok, []}
      {:ok, guidance} -> {:ok, guidance.day_pattern |> pattern_options() |> covered_slots()}
      {:error, reason} -> {:rollback, reason}
    end
  end

  defp covered_slots(options) do
    covered = MapSet.new(options, & &1.meal_slot)
    Enum.filter(MealSlot.values(), &MapSet.member?(covered, &1))
  end

  defp fulfil_day_slots(ctx, client, date, timezone, today, meal_slots, now) do
    Enum.reduce_while(meal_slots, :ok, fn meal_slot, :ok ->
      case fulfil_day_slot(ctx, client, date, timezone, today, meal_slot, now) do
        :ok -> {:cont, :ok}
        {:rollback, _reason} = rollback -> {:halt, rollback}
      end
    end)
  end

  defp fulfil_day_slot(ctx, client, date, timezone, today, meal_slot, now) do
    case ensure_planned_slot(ctx, client, date, timezone, today, meal_slot, now) do
      {:ok, slot} -> fulfil_remaining_active(client, slot)
      {:error, :cannot_start_past_slot} -> :ok
      {:error, reason} -> {:rollback, reason}
      {:rollback, _reason} = rollback -> rollback
    end
  end

  defp record_switch(ctx, client, date, command, now) do
    timezone = CorrectionPolicy.applied_timezone(client)

    with :ok <- ensure_switchable(date, slot_timezone(client, date, command.meal_slot, timezone), now),
         {:ok, slot} <- ensure_switch_slot(ctx, client, date, timezone, command, now),
         :ok <- ensure_revision(slot, command.expected_revision),
         {:ok, option} <- find_frozen_option(slot, command.meal_id),
         {:ok, _slot} <- activate_option(slot, option) do
      DayAssembler.assemble(ctx, client, date, :client, now)
    end
  end

  defp ensure_switchable(date, timezone, now) do
    today = CorrectionPolicy.local_today(timezone, now)
    CorrectionPolicy.validate_switch(date, today)
  end

  defp ensure_switch_slot(ctx, client, date, timezone, command, now) do
    case locked_slot(client, date, command.meal_slot) do
      %DiarySlot{has_coverage: true, frozen_options: [_ | _]} = slot -> {:ok, slot}
      %DiarySlot{} -> {:error, :not_found}
      nil -> freeze_slot_for_switch(ctx, client, date, timezone, command, now)
    end
  end

  defp freeze_slot_for_switch(ctx, client, date, timezone, command, now) do
    if command.expected_revision != 1 do
      {:error, stale_revision_changeset(%DiarySlot{revision: 1})}
    else
      with {:ok, {true, guidance}} <- coverage_guidance(ctx, date),
           true <- live_option?(guidance, command.meal_slot, command.meal_id) do
        create_frozen_slot(
          client,
          date,
          timezone,
          command.meal_slot,
          command.meal_id,
          {true, guidance},
          now
        )
      else
        {:rollback, _reason} = rollback -> rollback
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

  defp activate_option(%DiarySlot{active_frozen_option_id: id} = slot, %{id: id}), do: {:ok, slot}

  defp activate_option(slot, option) do
    case Repo.update(
           DiarySlot.update_changeset(slot, %{
             active_frozen_option_id: option.id,
             revision: slot.revision + 1
           })
         ) do
      {:ok, updated} -> {:ok, updated}
      {:error, changeset} -> {:rollback, changeset}
    end
  end

  defp record_replacement(ctx, client, date, command, now) do
    timezone = CorrectionPolicy.applied_timezone(client)
    today = CorrectionPolicy.local_today(timezone, now)

    with :ok <- ensure_writable(date, slot_timezone(client, date, command.meal_slot, timezone), now),
         {:ok, slot} <- ensure_planned_slot(ctx, client, date, timezone, today, command.meal_slot, now),
         {:ok, item} <- find_any_frozen_item(slot, command.planned_item_ref),
         entry <- lock_replacement_entry(client, slot, item),
         {:ok, [resolved]} <-
           Library.resolve_items(ctx, [%{kind: command.kind, id: command.id, portion: command.portion}]),
         {:ok, _entry} <- replace_fulfilment(client, slot, item, entry, resolved, command) do
      DayAssembler.assemble(ctx, client, date, :client, now)
    end
  end

  defp find_any_frozen_item(slot, planned_item_ref) do
    items = Enum.flat_map(slot.frozen_options, &planned_items_for_option/1)

    case Enum.find(items, &(&1.id == planned_item_ref or &1.source_meal_item_id == planned_item_ref)) do
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

  defp record_update(ctx, client, date, entry_id, command, now) do
    with {:ok, entry} <- lock_entry(client, date, entry_id),
         :ok <- ensure_writable(date, entry.diary_slot.applied_timezone, now),
         :ok <- ensure_entry_revision(entry, command.expected_revision),
         {:ok, attrs} <- update_attrs(entry, command) do
      case Repo.update(DiaryEntry.update_changeset(entry, attrs)) do
        {:ok, _entry} -> DayAssembler.assemble(ctx, client, date, :client, now)
        {:error, changeset} -> {:rollback, changeset}
      end
    end
  end

  defp record_delete(ctx, client, date, entry_id, expected_revision, now) do
    with {:ok, entry} <- lock_entry(client, date, entry_id),
         :ok <- ensure_writable(date, entry.diary_slot.applied_timezone, now),
         :ok <- ensure_entry_revision(entry, expected_revision) do
      case Repo.delete(entry) do
        {:ok, _deleted} -> DayAssembler.assemble(ctx, client, date, :client, now)
        {:error, changeset} -> {:rollback, changeset}
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

  defp ensure_writable(date, timezone, now) do
    today = CorrectionPolicy.local_today(timezone, now)
    CorrectionPolicy.validate_write(date, today)
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

  defp ensure_planned_slot(ctx, client, date, timezone, today, meal_slot, now) do
    case locked_slot(client, date, meal_slot) do
      %DiarySlot{has_coverage: true} = slot -> {:ok, slot}
      %DiarySlot{} -> {:error, :not_found}
      nil -> start_planned_slot(ctx, client, date, timezone, today, meal_slot, now)
    end
  end

  defp ensure_extra_slot(ctx, client, date, timezone, today, meal_slot, now) do
    case locked_slot(client, date, meal_slot) do
      %DiarySlot{} = slot ->
        {:ok, slot}

      nil ->
        with {:ok, source} <- freeze_source(ctx, date, today) do
          create_frozen_slot(client, date, timezone, meal_slot, nil, source, now)
        end
    end
  end

  defp start_planned_slot(ctx, client, date, timezone, today, meal_slot, now) do
    if Date.compare(date, today) != :eq do
      {:error, :cannot_start_past_slot}
    else
      with {:ok, source} <- coverage_guidance(ctx, date),
           true <- scheduled_meal_slot?(source, meal_slot) do
        create_frozen_slot(client, date, timezone, meal_slot, nil, source, now)
      else
        {:rollback, _reason} = rollback -> rollback
        false -> {:error, :not_found}
      end
    end
  end

  defp scheduled_meal_slot?({false, nil}, _meal_slot), do: false

  defp scheduled_meal_slot?({true, guidance}, meal_slot),
    do: Enum.any?(pattern_options(guidance.day_pattern), &(&1.meal_slot == meal_slot))

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

  defp find_frozen_item(slot, planned_item_ref) do
    ordered = Enum.sort_by(slot.frozen_options, &{&1.position, &1.id})
    items = planned_items_for_option(active_frozen_option(slot, ordered))

    case Enum.find(items, &(&1.id == planned_item_ref or &1.source_meal_item_id == planned_item_ref)) do
      nil -> {:error, :not_found}
      item -> {:ok, item}
    end
  end

  defp fulfil_remaining_active(client, slot) do
    ordered = Enum.sort_by(slot.frozen_options, &{&1.position, &1.id})
    active = active_frozen_option(slot, ordered)
    fulfilled = MapSet.new(slot.entries, & &1.frozen_planned_item_id)

    active
    |> planned_items_for_option()
    |> Enum.reject(&MapSet.member?(fulfilled, &1.id))
    |> Enum.reduce_while(:ok, fn item, :ok ->
      case insert_fulfilment_or_copy(client, slot, item) do
        {:ok, _entry} -> {:cont, :ok}
        {:rollback, _reason} = rollback -> {:halt, rollback}
      end
    end)
  end

  defp planned_items_for_option(nil), do: []
  defp planned_items_for_option(option), do: List.wrap(option.planned_items)

  defp fulfil_or_extra(client, slot, item) do
    result =
      if Enum.any?(slot.entries, &(&1.frozen_planned_item_id == item.id)) do
        insert_copy(client, slot, item)
      else
        insert_fulfilment_or_copy(client, slot, item)
      end

    case result do
      {:ok, _entry} -> :ok
      {:rollback, _reason} = rollback -> rollback
    end
  end

  defp insert_fulfilment_or_copy(client, slot, item) do
    case Repo.insert(DiaryEntry.insert_changeset(client.business_id, client.id, slot.id, fulfilment_attrs(item))) do
      {:ok, entry} ->
        {:ok, entry}

      {:error, changeset} ->
        # A partial unique index allows one fulfilment per planned item. Losing
        # that race is not an error: the entry still counts, as an unlinked copy.
        if Keyword.has_key?(changeset.errors, :frozen_planned_item_id) do
          insert_copy(client, slot, item)
        else
          {:rollback, changeset}
        end
    end
  end

  defp insert_copy(client, slot, item) do
    case Repo.insert(DiaryEntry.insert_changeset(client.business_id, client.id, slot.id, copy_attrs(item))) do
      {:ok, entry} -> {:ok, entry}
      {:error, changeset} -> {:rollback, changeset}
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
    case Programming.resolve_client_coverage(ctx, date) do
      {:ok, nil} -> {:ok, {false, nil}}
      {:ok, guidance} -> {:ok, {true, guidance}}
      {:error, reason} -> {:rollback, reason}
    end
  end

  defp create_frozen_slot(
         client,
         date,
         timezone,
         meal_slot,
         active_meal_id,
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
        freeze_slot(slot, meal_slot, guidance, active_meal_id)

      :conflict ->
        # Lost the slot-identity race: a concurrent request created and froze
        # this slot; lock and use theirs.
        case locked_slot(client, date, meal_slot) do
          %DiarySlot{} = slot -> {:ok, slot}
          nil -> {:rollback, :conflict}
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

  defp freeze_slot(slot, _meal_slot, nil, _active_meal_id), do: {:ok, slot}

  defp freeze_slot(slot, meal_slot, %{plan: plan, day_pattern: pattern}, active_meal_id) do
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
        {:ok, Repo.preload(updated, [frozen_options: :planned_items, entries: []], force: true)}

      {:error, changeset} ->
        {:rollback, changeset}
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

  ## Write-side snapshot shape helpers

  defp frozen_by_slot(client, date) do
    DiarySlot
    |> DiarySlot.for_client(client.business_id, client.id)
    |> DiarySlot.for_date(date)
    |> DiarySlot.include_frozen(client.business_id)
    |> Repo.all()
    |> Map.new(&{&1.meal_slot, &1})
  end

  defp active_frozen_option(%DiarySlot{active_frozen_option_id: id}, options) when not is_nil(id) do
    Enum.find(options, &(&1.id == id)) || List.first(options)
  end

  defp active_frozen_option(_slot, options), do: List.first(options)

  defp item_kind(%MealItem{food_id: food_id}) when not is_nil(food_id), do: :food
  defp item_kind(%MealItem{}), do: :recipe

  defp item_name(%MealItem{food: %Food{name: name}}), do: name
  defp item_name(%MealItem{recipe: %Recipe{name: name}}), do: name
  defp item_name(_item), do: nil

  defp meal_items(%Meal{meal_items: items}) when is_list(items), do: items
  defp meal_items(_meal), do: []
end
