defmodule Easy.Trackers.Records do
  alias Easy.Attachments.Attachment
  alias Easy.Ctx
  alias Easy.LocalCalendar
  alias Easy.Nutrition.DiaryMeal
  alias Easy.RecordJournal
  alias Easy.Repo
  alias Easy.Result
  alias Easy.Revision
  alias Easy.Trackers
  alias Easy.Trackers.Entry
  alias Easy.Trackers.EntryAttachment
  alias Easy.Training.TrainingSession
  alias Easy.Units
  import Ecto.Query
  import Ecto.Changeset

  @spec create_for_client(Ctx.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def create_for_client(ctx, client_id, attrs) do
    write(ctx, client_id, fn client ->
      case retry(ctx, client.id, value(attrs, :request_id)) do
        nil -> create(ctx, client, attrs)
        row -> retry_result(ctx, row, attrs, :create)
      end
    end)
  end

  @spec update_for_client(Ctx.t(), String.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def update_for_client(ctx, client_id, id, attrs) do
    write(ctx, client_id, &update_locked(ctx, &1, id, attrs))
  end

  defp update_locked(ctx, client, id, attrs) do
    with {:ok, old} <- get(ctx, client.id, id) do
      case retry(ctx, client.id, value(attrs, :request_id)) do
        %Entry{id: ^id} = row -> retry_result(ctx, row, attrs, :update)
        nil -> correct(ctx, client, old, attrs)
        _ -> {:error, :conflict}
      end
    end
  end

  @spec remove_for_client(Ctx.t(), String.t(), String.t(), integer()) :: {:ok, term()} | {:error, term()}
  def remove_for_client(ctx, client_id, id, expected) do
    write(ctx, client_id, fn client ->
      with {:ok, old} <- get(ctx, client.id, id), do: remove(old, expected)
    end)
  end

  defp remove(%Entry{deleted_at: at} = row, _) when not is_nil(at), do: {:ok, row, []}

  defp remove(old, expected) do
    with :ok <- Revision.check(old, expected),
         {:ok, row} <- old |> change(deleted_at: DateTime.utc_now(:second), revision: old.revision + 1) |> Repo.update() do
      {:ok, row, [RecordJournal.change(old.id, "tracker_entry", old, nil, "tracker_entry")]}
    end
  end

  defp create(ctx, client, attrs) do
    with {:ok, tracker} <- Trackers.active_tracker(ctx, value(attrs, :tracker_id)),
         {:ok, attrs} <- normalize(tracker, attrs),
         :ok <- event_links(ctx, client.id, attrs),
         {:ok, attachments} <- attachments(ctx, client.id, tracker.kind, value(attrs, :attachment_ids) || []),
         timezone = LocalCalendar.applied_timezone(client.timezone, client.business.timezone),
         {:ok, row} <- Entry.insert_changeset(ctx.business_id, client.id, RecordJournal.actor(ctx), tracker.id, timezone, attrs) |> validate_value(tracker) |> Repo.insert(),
         {:ok, changes} <- replace_attachments(ctx, row, attachments) do
      {:ok, present(ctx, row), [RecordJournal.change(row.id, "tracker_entry", nil, row, "tracker_entry") | changes]}
    end
  end

  defp correct(ctx, client, old, attrs) do
    with true <- is_nil(old.deleted_at) || {:error, :conflict},
         :ok <- Revision.check(old, value(attrs, :expected_revision)),
         {:ok, tracker} <- Trackers.get_tracker(ctx, old.tracker_id),
         {:ok, attrs} <- normalize_patch(tracker, old, attrs),
         :ok <- event_links(ctx, client.id, event_attrs(old, attrs)),
         {:ok, attachments} <- attachments(ctx, client.id, tracker.kind, attachment_ids(old, attrs)),
         {:ok, row} <- old |> Entry.update_changeset(attrs) |> put_change(:revision, old.revision + 1) |> validate_value(tracker) |> Repo.update(),
         {:ok, changes} <- replace_attachments(ctx, row, attachments) do
      {:ok, present(ctx, row), [RecordJournal.change(row.id, "tracker_entry", old, row, "tracker_entry") | changes]}
    end
  end

  defp normalize(%{kind: :number} = tracker, attrs) do
    cs = Entry.update_changeset(%Entry{}, attrs)

    with {:ok, row} <- apply_action(cs, :insert),
         true <- not is_nil(row.number_value) || {:error, :invalid_tracker_value},
         {:ok, number} <- Units.tracker_value(tracker, row.number_value, row.entered_unit || tracker.base_unit) do
      {:ok, attrs |> string_keys() |> Map.put("number_value", number) |> Map.put("entered_unit", row.entered_unit || tracker.base_unit)}
    end
  end

  defp normalize(_, attrs), do: {:ok, attrs}

  defp normalize_patch(%{kind: :number} = tracker, old, attrs) do
    cond do
      supplied?(attrs, :number_value) ->
        unit = value(attrs, :entered_unit) || old.entered_unit || tracker.base_unit
        normalize(tracker, attrs |> string_keys() |> Map.put("entered_unit", unit))

      supplied?(attrs, :entered_unit) ->
        with {:ok, _} <- Units.tracker_value(tracker, 0, value(attrs, :entered_unit)), do: {:ok, attrs}

      true ->
        {:ok, attrs}
    end
  end

  defp normalize_patch(_, _, attrs), do: {:ok, attrs}

  defp event_attrs(old, attrs) do
    old |> Map.take([:about_session_id, :about_meal_id]) |> string_keys() |> Map.merge(string_keys(attrs))
  end

  defp attachment_ids(old, attrs) do
    if supplied?(attrs, :attachment_ids) do
      value(attrs, :attachment_ids)
    else
      Repo.all(from(a in EntryAttachment, where: a.entry_id == ^old.id and a.business_id == ^old.business_id, order_by: a.position, select: a.attachment_id))
    end
  end

  defp validate_value(cs, tracker) do
    fields = [:number_value, :entered_unit, :rating_value, :yes_no_value, :text_value]

    allowed =
      case tracker.kind do
        :number -> [:number_value, :entered_unit]
        :rating -> [:rating_value]
        :yes_no -> [:yes_no_value]
        :text -> [:text_value]
        _ -> []
      end

    cs = Enum.reduce(fields -- allowed, cs, fn key, acc -> if is_nil(get_field(acc, key)), do: acc, else: add_error(acc, key, "does not apply to this tracker") end)
    cs = validate_required(cs, allowed)
    if tracker.kind == :rating, do: validate_number(cs, :rating_value, greater_than_or_equal_to: 1, less_than_or_equal_to: tracker.scale_max), else: cs
  end

  @spec event_links(Ctx.t(), String.t(), map()) :: :ok | {:error, term()}
  def event_links(ctx, client_id, attrs) do
    session_id = value(attrs, :about_session_id)
    meal_id = value(attrs, :about_meal_id)

    cond do
      session_id && meal_id -> {:error, :invalid_tracker_value}
      session_id -> exists_event(TrainingSession, ctx, client_id, session_id, :completed)
      meal_id -> exists_event(DiaryMeal, ctx, client_id, meal_id, :shared)
      true -> :ok
    end
  end

  defp exists_event(schema, ctx, client_id, id, state) do
    query = from(e in schema, where: e.business_id == ^ctx.business_id and e.client_id == ^client_id and e.id == ^id)
    query = completed_event(query, state)
    if Repo.exists?(query), do: :ok, else: {:error, :not_found}
  end

  defp completed_event(query, :completed), do: where(query, [e], e.state == :completed)
  defp completed_event(query, :shared), do: where(query, [e], not is_nil(e.shared_at))

  defp attachments(ctx, client_id, kind, ids) when is_list(ids) do
    valid_count = length(ids) <= 50 and length(Enum.uniq(ids)) == length(ids)

    cond do
      not valid_count -> {:error, :invalid_attachments}
      kind not in [:photo, :document] -> if ids == [], do: {:ok, []}, else: {:error, :invalid_attachments}
      ids == [] -> {:error, :invalid_attachments}
      true -> load_attachments(ctx, client_id, kind, ids)
    end
  end

  defp attachments(_, _, _, _), do: {:error, :invalid_attachments}

  defp load_attachments(ctx, client_id, kind, ids) do
    allowed = Attachment.image_content_types() ++ if(kind == :document, do: ["application/pdf"], else: [])

    rows =
      Repo.all(from(a in Attachment, where: a.business_id == ^ctx.business_id and a.client_id == ^client_id and a.id in ^ids and a.content_type in ^allowed))
      |> Map.new(&{&1.id, &1})

    if map_size(rows) == length(ids), do: {:ok, Enum.map(ids, &Map.fetch!(rows, &1))}, else: {:error, :invalid_attachments}
  end

  defp replace_attachments(ctx, row, attachments) do
    old = Repo.all(from(a in EntryAttachment, where: a.business_id == ^ctx.business_id and a.entry_id == ^row.id))

    desired =
      Enum.with_index(attachments)
      |> Enum.map(fn {attachment, position} ->
        previous = Enum.find(old, &(&1.attachment_id == attachment.id))

        %{
          (previous || %EntryAttachment{id: Ecto.UUID.generate(), business_id: ctx.business_id, client_id: row.client_id, entry_id: row.id, attachment_id: attachment.id})
          | position: position
        }
      end)

    Repo.delete_all(from(a in EntryAttachment, where: a.business_id == ^ctx.business_id and a.entry_id == ^row.id))

    with {:ok, _} <- Result.traverse(desired, &Repo.insert/1) do
      {:ok, attachment_changes(row.id, old, desired)}
    end
  end

  defp attachment_changes(entry_id, old, desired) do
    ids = Enum.uniq(Enum.map(old ++ desired, & &1.id))

    Enum.flat_map(ids, fn id ->
      before = Enum.find(old, &(&1.id == id))
      after_row = Enum.find(desired, &(&1.id == id))
      if before == after_row, do: [], else: [RecordJournal.change(entry_id, "attachment", before, after_row, "tracker_entry")]
    end)
  end

  defp write(ctx, client_id, operation) do
    with {:ok, _} <- Trackers.client(ctx, client_id) do
      if ctx.coach_id, do: RecordJournal.write_for_client(ctx, client_id, operation), else: RecordJournal.write(ctx, operation)
    end
  end

  defp get(ctx, client_id, id) do
    case Repo.one(from(e in Entry, where: e.business_id == ^ctx.business_id and e.client_id == ^client_id and e.id == ^id)) do
      nil -> {:error, :not_found}
      row -> {:ok, row}
    end
  end

  defp retry_result(ctx, row, attrs, mode) do
    with {:ok, tracker} <- Trackers.get_tracker(ctx, row.tracker_id),
         true <- is_nil(value(attrs, :tracker_id)) or value(attrs, :tracker_id) == row.tracker_id,
         snapshot when not is_nil(snapshot) <- mutation_snapshot(ctx, row, value(attrs, :request_id)),
         {:ok, normalized} <- normalize_retry(tracker, snapshot, attrs, mode),
         true <- retry_matches?(snapshot, normalized, mode) do
      {:ok, present(ctx, row), []}
    else
      _ -> {:error, :conflict}
    end
  end

  defp normalize_retry(tracker, _snapshot, attrs, :create), do: normalize(tracker, attrs)

  defp normalize_retry(tracker, snapshot, attrs, :update) do
    normalize_patch(tracker, %{entered_unit: snapshot["entered_unit"]}, attrs)
  end

  defp mutation_snapshot(ctx, row, request_id) do
    mutation =
      Repo.one(
        from(c in "record_changes",
          where:
            c.business_id == type(^ctx.business_id, :binary_id) and c.record_id == type(^row.id, :binary_id) and c.row_type == "tracker_entry" and
              fragment("?->>'request_id' = ?", c.new_value, ^request_id),
          select: %{value: c.new_value, seq: c.seq},
          limit: 1
        )
      )

    if mutation do
      links =
        Repo.all(
          from(c in "record_changes",
            where: c.business_id == type(^ctx.business_id, :binary_id) and c.record_id == type(^row.id, :binary_id) and c.row_type == "attachment" and c.seq <= ^mutation.seq,
            order_by: [desc: c.seq],
            select: %{id: type(c.row_id, :binary_id), value: c.new_value}
          )
        )

      ids = links |> Enum.uniq_by(& &1.id) |> Enum.map(& &1.value) |> Enum.reject(&is_nil/1) |> Enum.sort_by(& &1["position"]) |> Enum.map(& &1["attachment_id"])
      Map.put(mutation.value, "attachment_ids", ids)
    end
  end

  defp retry_matches?(snapshot, attrs, mode) do
    fields = [:local_date, :number_value, :entered_unit, :rating_value, :yes_no_value, :text_value]
    fields = fields ++ [:about_session_id, :about_meal_id]
    fields = if mode == :update, do: Enum.filter(fields, &supplied?(attrs, &1)), else: fields
    same_values = Enum.all?(fields, fn key -> equal_value?(key, snapshot[to_string(key)], value(attrs, key)) end)
    check_attachments? = mode == :create or supplied?(attrs, :attachment_ids)
    same_values and (not check_attachments? or snapshot["attachment_ids"] == (value(attrs, :attachment_ids) || []))
  end

  defp equal_value?(:number_value, a, b) when not is_nil(a) and not is_nil(b), do: Decimal.equal?(Decimal.new(to_string(a)), Decimal.new(to_string(b)))
  defp equal_value?(:local_date, a, %Date{} = b), do: a == Date.to_iso8601(b)
  defp equal_value?(_, a, b), do: a == b

  defp retry(_ctx, _client_id, nil), do: nil

  defp retry(ctx, client_id, request_id) do
    case Ecto.UUID.cast(request_id) do
      {:ok, id} ->
        Repo.one(from(e in Entry, where: e.business_id == ^ctx.business_id and e.client_id == ^client_id and e.request_id == ^id)) || historical_retry(ctx, client_id, id)

      _ ->
        nil
    end
  end

  defp historical_retry(ctx, client_id, request_id) do
    id =
      Repo.one(
        from(c in "record_changes",
          where: c.business_id == type(^ctx.business_id, :binary_id) and c.client_id == type(^client_id, :binary_id),
          where:
            c.record_type == "tracker_entry" and
              c.row_type == "tracker_entry" and fragment("?->>'request_id' = ?", c.new_value, ^request_id),
          select: type(c.record_id, :binary_id),
          limit: 1
        )
      )

    if id, do: Repo.get(Entry, id)
  end

  @spec present(Ctx.t(), Entry.t()) :: map()
  def present(ctx, row) do
    row = Repo.preload(row, [:tracker, attachments: :attachment], force: true)

    row
    |> Map.take([
      :id,
      :local_date,
      :timezone,
      :recorded_by_type,
      :recorded_by_id,
      :revision,
      :request_id,
      :entered_unit,
      :rating_value,
      :yes_no_value,
      :text_value,
      :about_session_id,
      :about_meal_id,
      :inserted_at,
      :updated_at
    ])
    |> Map.put(:number_value, if(row.number_value, do: Decimal.to_float(row.number_value)))
    |> Map.put(:tracker, Trackers.present(ctx, row.tracker))
    |> Map.put(
      :attachments,
      row.attachments
      |> Enum.sort_by(& &1.position)
      |> Enum.map(fn a -> Map.take(a.attachment, [:id, :content_type, :byte_size, :captured_on]) |> Map.put(:position, a.position) end)
    )
  end

  defp supplied?(attrs, key), do: Map.has_key?(attrs, key) or Map.has_key?(attrs, to_string(key))
  defp value(attrs, key), do: Map.get(attrs, key, Map.get(attrs, to_string(key)))
  defp string_keys(attrs), do: Map.new(attrs, fn {k, v} -> {to_string(k), v} end)
end
