defmodule Easy.Nutrition.MealWriter do
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.DayReader
  alias Easy.Nutrition.DiaryEntry
  alias Easy.Nutrition.DiaryMeal
  alias Easy.Nutrition.EntryResolver
  alias Easy.Plans.Plan
  alias Easy.Plans.Revision
  alias Easy.RecordJournal
  alias Easy.Repo
  import Ecto.Query

  @spec save(Ctx.t(), Client.t(), Date.t(), map()) :: {:ok, DiaryMeal.t(), [map()]} | {:error, term()}
  def save(ctx, client, date, draft) do
    old =
      Repo.one(
        from(m in DiaryMeal,
          where: m.business_id == ^ctx.business_id and m.client_id == ^client.id and m.id == ^draft["id"]
        )
      )

    save_existing(ctx, client, date, draft, old)
  end

  defp save_existing(_ctx, _client, _date, %{"request_id" => request}, %{request_id: request} = old), do: {:ok, old, []}

  defp save_existing(ctx, client, date, draft, old) do
    with :ok <- check_existing(old, date, draft["expected_revision"]) do
      persist(ctx, client, date, draft, old)
    end
  end

  defp check_existing(nil, _, 0), do: :ok
  defp check_existing(%{local_date: date, revision: revision}, date, revision), do: :ok
  defp check_existing(_, _, _), do: {:error, :conflict}

  defp persist(ctx, client, date, draft, old) do
    with {:ok, planned} <- prescription(ctx, client, date, draft, old),
         {:ok, entries} <- resolve_entries(ctx, draft, old, planned) do
      if unchanged?(ctx, draft, entries, old) do
        {:ok, old, []}
      else
        persist_changes(ctx, client, date, draft, entries, old)
      end
    end
  end

  defp persist_changes(ctx, client, date, draft, entries, old) do
    with {:ok, meal} <- save_meal(ctx, client, date, draft, old),
         {:ok, changes} <- replace_entries(ctx, meal, entries),
         {:ok, _} <- share_note(ctx, draft, old, meal) do
      {:ok, meal, [RecordJournal.change(meal.id, "meal", old, meal, "meal") | changes]}
    end
  end

  defp unchanged?(_ctx, _draft, _entries, nil), do: false

  defp unchanged?(ctx, draft, entries, old) do
    previous =
      Repo.all(
        from(e in DiaryEntry,
          where: e.meal_id == ^old.id and e.business_id == ^ctx.business_id and is_nil(e.deleted_at)
        )
      )

    header = DiaryMeal.update_changeset(old, Map.drop(draft, ["request_id", "expected_revision", "entries", "share"]))

    header.changes == %{} and not (draft["share"] == true and is_nil(old.shared_at)) and
      length(previous) == length(entries) and
      Enum.all?(entries, &unchanged_entry?(&1, previous))
  end

  defp unchanged_entry?(draft, previous) do
    case Enum.find(previous, &(&1.id == draft["id"])) do
      nil -> false
      row -> Map.drop(DiaryEntry.update_changeset(row, draft).changes, [:request_id]) == %{}
    end
  end

  defp prescription(
         _ctx,
         _client,
         _date,
         %{"plan_revision_id" => nil, "slot_id" => nil, "chosen_meal_id" => nil},
         _old
       ),
       do: {:ok, []}

  defp prescription(ctx, client, date, draft, old) do
    revision =
      Repo.one(
        from(r in Revision,
          join: p in Plan,
          on: p.id == r.plan_id,
          where:
            r.id == ^draft["plan_revision_id"] and p.business_id == ^ctx.business_id and p.client_id == ^client.id and
              p.domain == :nutrition and (is_nil(r.effective_on) or r.effective_on <= ^date) and
              fragment("plan_covers(?, ?)", p.id, type(^date, :date))
        )
      )

    with true <- not is_nil(revision) || {:error, :not_found},
         :ok <- same_prescription(old, revision.id, draft["slot_id"]),
         slot when not is_nil(slot) <-
           DayReader.pattern(revision.content, date)["slots"]
           |> Enum.find(&(&1["id"] == draft["slot_id"])),
         true <- draft["chosen_meal_id"] in slot["meal_ids"] || {:error, :not_found},
         meal when not is_nil(meal) <- Enum.find(revision.content["meals"], &(&1["id"] == draft["chosen_meal_id"])) do
      {:ok, meal["items"]}
    else
      nil -> {:error, :not_found}
      {:error, _} = error -> error
    end
  end

  defp same_prescription(nil, _, _), do: :ok
  defp same_prescription(%{plan_revision_id: id, slot_id: slot}, id, slot), do: :ok
  defp same_prescription(_, _, _), do: {:error, :conflict}

  defp resolve_entries(ctx, draft, old, planned) do
    previous =
      if old,
        do: Repo.all(from(e in DiaryEntry, where: e.meal_id == ^old.id and e.business_id == ^ctx.business_id)),
        else: []

    ids = Enum.map(draft["entries"], & &1["id"])

    if length(ids) == length(Enum.uniq(ids)) do
      Easy.Result.traverse(draft["entries"], &resolve_entry(ctx, &1, previous, planned))
    else
      {:error, :conflict}
    end
  end

  defp resolve_entry(ctx, entry, previous, planned) do
    item = Enum.find(planned, &(&1["id"] == entry["planned_item_id"]))

    if entry["planned_item_id"] && is_nil(item),
      do: {:error, :not_found},
      else: EntryResolver.resolve(ctx, entry, Enum.find(previous, &(&1.id == entry["id"])), item)
  end

  defp save_meal(ctx, client, date, draft, old) do
    attrs =
      draft
      |> Map.drop(["entries", "expected_revision", "share"])
      |> Map.merge(%{
        "client_id" => client.id,
        "local_date" => date,
        "timezone" => if(old, do: old.timezone, else: Client.applied_timezone(client)),
        "revision" => if(old, do: old.revision + 1, else: 1)
      })

    attrs =
      if draft["share"],
        do: Map.put(attrs, "shared_at", (old && old.shared_at) || DateTime.utc_now(:second)),
        else: attrs

    cs =
      if old,
        do: DiaryMeal.update_changeset(old, attrs),
        else: DiaryMeal.insert_changeset(ctx.business_id, RecordJournal.actor(ctx), attrs)

    Repo.insert_or_update(cs)
  end

  defp replace_entries(ctx, meal, drafts) do
    previous = Repo.all(from(e in DiaryEntry, where: e.business_id == ^ctx.business_id and e.meal_id == ^meal.id))

    with {:ok, writes} <- Easy.Result.traverse(drafts, &save_entry(ctx, meal, &1, previous)),
         {:ok, removed} <- remove_entries(previous, Enum.map(drafts, & &1["id"]), meal.id) do
      {:ok, Enum.reject(writes, &is_nil/1) ++ removed}
    end
  end

  defp save_entry(ctx, meal, draft, previous) do
    old = Enum.find(previous, &(&1.id == draft["id"]))
    attrs = Map.merge(draft, %{"meal_id" => meal.id, "deleted_at" => nil})

    cs =
      if old,
        do: DiaryEntry.update_changeset(old, attrs),
        else: DiaryEntry.insert_changeset(ctx.business_id, RecordJournal.actor(ctx), attrs)

    if old && Map.drop(cs.changes, [:request_id]) == %{} do
      {:ok, nil}
    else
      with {:ok, row} <- Repo.insert_or_update(cs), do: {:ok, RecordJournal.change(meal.id, "entry", old, row, "meal")}
    end
  end

  defp remove_entries(previous, ids, meal_id) do
    previous
    |> Enum.reject(&(&1.id in ids or &1.deleted_at))
    |> Easy.Result.traverse(fn row ->
      with {:ok, _} <- Repo.update(Ecto.Changeset.change(row, deleted_at: DateTime.utc_now(:second))),
           do: {:ok, RecordJournal.change(meal_id, "entry", row, nil, "meal")}
    end)
  end

  defp share_note(ctx, %{"share" => true}, old, meal) do
    if is_nil(old) or is_nil(old.shared_at) or old.note_to_coach != meal.note_to_coach,
      do: Easy.ChatRecordNotes.share(ctx, :meal, meal, meal.note_to_coach),
      else: {:ok, :unchanged}
  end

  defp share_note(_, _, _, _), do: {:ok, :quiet}
end
