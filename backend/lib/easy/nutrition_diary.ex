defmodule Easy.Nutrition.Diary do
  alias Easy.ClientAccess
  alias Easy.ClientAccount
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.Day
  alias Easy.Nutrition.Diary.{CorrectionPolicy, DayAssembler}
  alias Easy.Nutrition.Diary.EntryResolver
  alias Easy.Nutrition.Diary.Input

  alias Easy.Nutrition.{
    DiaryDay,
    DiarySlot,
    Menu,
    PlanReader
  }

  alias Easy.Nutrition.DiarySlot.Document
  alias Easy.Repo
  alias Easy.Result
  alias Easy.Revision

  import Ecto.Query

  @type save_error ::
          PlanReader.read_error()
          | :client_inactive
          | :future_date
          | :cannot_switch_past_slot
          | Ecto.Changeset.t()

  ## Nutrition Day reads

  @spec list_client_nutrition_days(Ctx.t(), keyword()) ::
          {:ok, Day.list_result()}
          | {:error, DayAssembler.list_error()}
  def list_client_nutrition_days(%Ctx{} = ctx, opts \\ []) do
    with {:ok, client} <- ClientAccount.get_client_account(ctx) do
      DayAssembler.list(ctx, client, opts, :client)
    end
  end

  @spec list_nutrition_days_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, Day.list_result()}
          | {:error, DayAssembler.list_error()}
  def list_nutrition_days_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with {:ok, client} <- ClientAccess.authorize_client(ctx, client_id) do
      DayAssembler.list(ctx, client, opts, :coach)
    end
  end

  @spec save_client_nutrition_day(Ctx.t(), Date.t(), Input.t()) ::
          {:ok, Day.t()} | {:error, save_error()}
  def save_client_nutrition_day(%Ctx{} = ctx, %Date{} = date, %{slots: slots})
      when is_list(slots) do
    with {:ok, client} <- load_active_client(ctx),
         :ok <- Input.validate_slots(slots) do
      Repo.snapshot(fn -> save_day(ctx, client, date, slots) end)
      |> then(&Easy.ChatRecordNotes.notify_result(ctx, &1))
    end
  end

  defp save_day(ctx, client, date, drafts) do
    now = DateTime.utc_now(:second)

    with {:ok, _slots} <-
           Result.traverse(Enum.sort_by(drafts, & &1.meal_slot), &save_slot(ctx, client, date, &1, now)),
         {:ok, day} <- DayAssembler.assemble(ctx, client, date, :client, now),
         {:ok, _activity} <- record_activity(ctx, drafts, now) do
      {:ok, day}
    end
  end

  defp record_activity(_ctx, [], _now), do: {:ok, :unchanged}
  defp record_activity(ctx, _drafts, now), do: ClientAccount.record_client_activity(ctx, now)

  defp save_slot(ctx, client, date, draft, now) do
    existing =
      DiarySlot.for_client(client.business_id, client.id)
      |> DiarySlot.for_date(date)
      |> where([slot], slot.meal_slot == ^draft.meal_slot)
      |> lock("FOR UPDATE")
      |> Repo.one()

    timezone = if existing, do: existing.applied_timezone, else: Client.applied_timezone(client)

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
         {:ok, entries} <- EntryResolver.resolve(ctx, slot.document, draft.meal_id, draft.entries) do
      changeset =
        slot
        |> DiarySlot.update_changeset(%{meal_id: draft.meal_id, entries: entries})
        |> publication(draft, now)

      with {:ok, saved} <- persist_slot(changeset),
           {:ok, _} <- share_note(ctx, existing, saved, Map.get(draft, :share, false)) do
        {:ok, saved}
      end
    end
  end

  defp publication(changeset, %{share: true} = draft, now) do
    changeset = changeset |> Ecto.Changeset.cast(draft, [:note_to_coach]) |> Ecto.Changeset.validate_length(:note_to_coach, max: 4000)

    if draft.entries == [] and is_nil(changeset.data.shared_at) do
      Ecto.Changeset.add_error(changeset, :entries, "record food before sharing a meal")
    else
      Ecto.Changeset.put_change(changeset, :shared_at, changeset.data.shared_at || now)
    end
  end

  defp publication(changeset, _draft, _now), do: changeset

  defp share_note(ctx, previous, saved, true) do
    if is_nil(previous) or is_nil(previous.shared_at) or previous.note_to_coach != saved.note_to_coach,
      do: Easy.ChatRecordNotes.share(ctx, :meal, saved, saved.note_to_coach),
      else: {:ok, :unchanged}
  end

  defp share_note(_ctx, _previous, _saved, _share), do: {:ok, :quiet}

  defp persist_slot(changeset) do
    with {:error, %{errors: errors}} = error <- Repo.insert_or_update(changeset) do
      conflict? = Enum.any?(errors, fn {_, {_, opts}} -> opts[:constraint] == :unique end)
      if conflict?, do: {:error, :conflict}, else: error
    end
  end

  defp start_slot(_ctx, _client, %DiarySlot{document: %Document{}} = slot, _now), do: {:ok, slot}

  defp start_slot(ctx, client, %DiarySlot{} = slot, now) do
    today = CorrectionPolicy.local_today(slot.applied_timezone, now)

    with {:ok, guidance} <- freeze_source(ctx, slot.local_date, today),
         {:ok, day} <- freeze_day(client, slot.local_date, guidance) do
      meals = if guidance, do: Menu.meals_for_slot(guidance.plan.menu, guidance.day_pattern, slot.meal_slot), else: []

      {:ok,
       %{
         slot
         | nutrition_diary_day_id: day.id,
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

  defp load_active_client(ctx) do
    with {:ok, client} <- ClientAccount.get_client_account(ctx) do
      client = Repo.preload(client, :business)
      if client.status == :active, do: {:ok, client}, else: {:error, :client_inactive}
    end
  end

  defp ensure_writable(date, timezone, now) do
    today = CorrectionPolicy.local_today(timezone, now)
    CorrectionPolicy.validate_write(date, today)
  end

  defp ensure_revision(nil, 0), do: :ok

  defp ensure_revision(nil, _expected),
    do: {:error, Revision.stale(%DiarySlot{revision: 0})}

  defp ensure_revision(%DiarySlot{revision: revision}, revision), do: :ok
  defp ensure_revision(slot, _expected), do: {:error, Revision.stale(slot)}

  ## Freezing

  defp freeze_source(ctx, date, date), do: PlanReader.resolve_client_coverage(ctx, date, lock: true)
  defp freeze_source(_ctx, _date, _today), do: {:ok, nil}

  defp freeze_day(client, date, guidance) do
    attrs = DiaryDay.target_attrs(guidance && guidance.plan)

    with {:ok, _day} <-
           client.business_id
           |> DiaryDay.insert_changeset(client.id, date, attrs)
           |> Repo.insert(on_conflict: :nothing, conflict_target: [:business_id, :client_id, :local_date]) do
      case Repo.one(DiaryDay.for_date(client.business_id, client.id, date)) do
        nil -> {:error, :not_found}
        day -> {:ok, day}
      end
    end
  end
end
