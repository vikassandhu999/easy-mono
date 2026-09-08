defmodule Easy.Nutrition.Diary do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.Day
  alias Easy.Nutrition.Diary.{CorrectionPolicy, DayAssembler}

  alias Easy.Nutrition.{
    DiaryDay,
    DiarySlot,
    Library,
    Menu,
    NutrientTotals,
    Programming
  }

  alias Easy.Nutrition.DiarySlot.Document
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
      Repo.snapshot(fn -> save_day(ctx, client, date, slots) end)
    end
  end

  defp save_day(ctx, client, date, drafts) do
    now = DateTime.utc_now(:second)

    with {:ok, _slots} <-
           Result.traverse(Enum.sort_by(drafts, & &1.meal_slot), &save_slot(ctx, client, date, &1, now)),
         {:ok, day} <- DayAssembler.assemble(ctx, client, date, :client, now) do
      if drafts != [], do: Client.last_active_stamp(client.business_id, client.id, now) |> Repo.update_all([])
      {:ok, day}
    end
  end

  # Request-shape rules the slot document cannot see: one draft per Meal Slot,
  # one draft per entry ID, one Library source per entry. Planned references
  # are validated by the document itself.
  defp validate_slots(slots) do
    entries = Enum.flat_map(slots, & &1.entries)

    errors =
      [
        {:slots, "repeats a Meal Slot", duplicates?(slots, & &1.meal_slot)},
        {:entries, "repeats an entry ID", Enum.any?(slots, &duplicates?(&1.entries, fn entry -> entry.id end))},
        {:entries, "must supply at most one Library reference", Enum.any?(entries, &(&1.food_id && &1.recipe_id))}
      ]
      |> Enum.filter(&elem(&1, 2))

    case errors do
      [] -> :ok
      errors -> {:error, Enum.reduce(errors, Ecto.Changeset.change(%DiarySlot{}), fn {field, message, _}, changeset -> Ecto.Changeset.add_error(changeset, field, message) end)}
    end
  end

  defp duplicates?(items, key), do: length(Enum.uniq_by(items, key)) != length(items)

  defp save_slot(ctx, client, date, draft, now) do
    existing =
      DiarySlot.for_client(client.business_id, client.id)
      |> DiarySlot.for_date(date)
      |> where([slot], slot.meal_slot == ^draft.meal_slot)
      |> lock("FOR UPDATE")
      |> Repo.one()

    timezone = if existing, do: existing.applied_timezone, else: CorrectionPolicy.applied_timezone(client)

    slot =
      existing ||
        %DiarySlot{
          business_id: client.business_id,
          client_id: client.id,
          local_date: date,
          meal_slot: draft.meal_slot,
          applied_timezone: timezone
        }

    with :ok <- ensure_writable(date, timezone, now),
         :ok <- ensure_revision(existing, draft.expected_revision),
         {:ok, slot} <- start_slot(ctx, client, slot, now),
         :ok <- validate_selection(slot, draft.meal_id, now),
         {:ok, entries} <- Result.traverse(draft.entries, &prepare_entry(ctx, slot.document, draft.meal_id, &1)) do
      slot
      |> DiarySlot.update_changeset(%{meal_id: draft.meal_id, entries: entries})
      |> persist_slot()
    end
  end

  defp persist_slot(changeset) do
    with {:error, %{errors: errors}} = error <- Repo.insert_or_update(changeset) do
      conflict? = Enum.any?(errors, fn {_, {_, opts}} -> opts[:constraint] == :unique end)
      if conflict?, do: {:error, :conflict}, else: error
    end
  end

  defp start_slot(_ctx, _client, %DiarySlot{document: %Document{}} = slot, _now), do: {:ok, slot}

  defp start_slot(ctx, client, %DiarySlot{} = slot, now) do
    today = CorrectionPolicy.local_today(slot.applied_timezone, now)

    with {:ok, guidance} <- freeze_source(ctx, slot.local_date, today) do
      meals = if guidance, do: Menu.meals_for_slot(guidance.plan.menu, guidance.day_pattern, slot.meal_slot), else: []

      {:ok,
       %{
         slot
         | nutrition_diary_day_id: freeze_day(client, slot.local_date, guidance, now).id,
           has_coverage: not is_nil(guidance),
           document: Document.from_meals(meals)
       }}
    end
  end

  defp validate_selection(%{document: %{meal_id: meal_id}}, meal_id, _now), do: :ok
  defp validate_selection(_slot, nil, _now), do: {:error, :not_found}

  defp validate_selection(slot, meal_id, now) do
    today = CorrectionPolicy.local_today(slot.applied_timezone, now)

    with :ok <- CorrectionPolicy.validate_switch(slot.local_date, today) do
      if Enum.any?(slot.document.options, &(&1.id == meal_id)), do: :ok, else: {:error, :not_found}
    end
  end

  defp prepare_entry(ctx, document, meal_id, command) do
    with {:ok, source, planned_ref} <- Document.entry_source(document, meal_id, command),
         {:ok, attrs} <- entry_attrs(ctx, source, command) do
      {:ok, Map.merge(attrs, %{id: command.id, planned_item_ref: planned_ref})}
    end
  end

  defp load_active_client(ctx) do
    with {:ok, client} <- Clients.get_client_account(ctx) do
      client = Repo.preload(client, :business)
      if client.status == :active, do: {:ok, client}, else: {:error, :client_inactive}
    end
  end

  defp entry_attrs(_ctx, nil, %{food_id: nil, recipe_id: nil}), do: {:error, :not_found}

  defp entry_attrs(ctx, source, command) do
    if source && same_source?(source, command) do
      with {:ok, changes} <- update_attrs(ctx, source, command) do
        {:ok, Map.merge(snapshot_attrs(source), changes)}
      end
    else
      spec = %{kind: Library.item_kind(command), id: command.food_id || command.recipe_id, portion: command.portion}

      with {:ok, resolved} <- Library.resolve_items(ctx, [spec]) do
        {:ok, resolved_entry_attrs(Map.fetch!(resolved, spec), command)}
      end
    end
  end

  defp same_source?(_source, %{food_id: nil, recipe_id: nil}), do: true
  defp same_source?(source, command), do: source.food_id == command.food_id and source.recipe_id == command.recipe_id

  defp snapshot_attrs(source), do: Map.take(source, [:name, :portion, :nutrients, :food_id, :recipe_id])

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

    with {:ok, resolved} <- Library.resolve_items(ctx, [spec]) do
      case Map.fetch!(resolved, spec).portion do
        %{grams: grams} when is_number(grams) and grams > 0 -> {:ok, grams / stored, grams}
        _ -> {:error, :invalid_portion}
      end
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

  defp resolved_entry_attrs(resolved, command) do
    %{
      name: resolved.item.name,
      portion: resolved.portion,
      nutrients: resolved.nutrients,
      notes: command.notes,
      food_id: if(resolved.kind == :food, do: resolved.item.id),
      recipe_id: if(resolved.kind == :recipe, do: resolved.item.id)
    }
  end

  ## Freezing

  defp freeze_source(ctx, date, date), do: Programming.resolve_client_coverage(ctx, date, lock: true)
  defp freeze_source(_ctx, _date, _today), do: {:ok, nil}

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
end
