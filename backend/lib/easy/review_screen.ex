defmodule Easy.Reviews.Screen do
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Nutrition.DayReader
  alias Easy.Repo
  alias Easy.Reviews
  alias Easy.Reviews.Review
  alias Easy.Reviews.Snapshot
  alias Easy.Trackers.Assignment
  alias Easy.Trackers.Entry
  alias Easy.Trackers.Reader
  alias Easy.Training.Execution
  alias Easy.Training.History
  import Ecto.Query

  @spec read(Ctx.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def read(ctx, client_id, opts) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, client} <- Clients.get_client_with_preloads(ctx, client_id) do
      seen_at = DateTime.utc_now(:microsecond)
      latest = Review.for_client(ctx.business_id, client_id) |> Review.newest() |> limit(1) |> Repo.one()
      current = Review.current_review(client, latest)

      with {:ok, dates} <- dates(client, current, opts),
           {:ok, training} <- History.occurrences_for_client(ctx, client_id, dates.from, dates.to),
           {:ok, nutrition} <- DayReader.list(ctx, client, from: dates.from, to: dates.to),
           {:ok, requests} <- Reader.requests_for_client(ctx, client_id),
           {:ok, trackers} <- metrics(ctx, client, dates, requests) do
        {:ok,
         Map.merge(dates, %{
           client: client,
           snapshot_token: Snapshot.sign(ctx, client, seen_at),
           seen_at: seen_at,
           reviewed_through_seq: client.last_change_seq,
           last_review: if(latest, do: Reviews.present(ctx, latest)),
           changes: changes(ctx, client, current),
           training: training,
           training_counts: %{
             expected: length(training.data),
             completed: Enum.count(training.data, & &1.session_id),
             extra: length(training.extra_sessions)
           },
           nutrition_days: nutrition.nutrition_days,
           nutrition_summary: nutrition_summary(nutrition.nutrition_days),
           trackers: trackers,
           requests: requests,
           plans: plans(ctx, client_id)
         })}
      end
    end
  end

  defp dates(client, current, opts) do
    today = Client.local_date(client, DateTime.utc_now())

    start =
      cond do
        current -> Client.local_date(client, current.reviewed_at)
        client.current_term -> client.current_term.starts_on
        true -> Date.add(today, -29)
      end

    start = if Date.diff(today, start) > 365, do: Date.add(today, -365), else: start

    with {:ok, from} <- date(opts[:from] || start),
         {:ok, to} <- date(opts[:to] || today),
         true <- Date.diff(to, from) in 0..365 || {:error, :invalid_date_range},
         do: {:ok, %{from: from, to: to}}
  end

  defp date(%Date{} = date), do: {:ok, date}

  defp date(value) do
    case Date.from_iso8601(value) do
      {:ok, date} -> {:ok, date}
      _ -> {:error, :invalid_date}
    end
  end

  defp changes(ctx, client, current) do
    query =
      from(c in "record_changes",
        where: c.business_id == type(^ctx.business_id, :binary_id) and c.client_id == type(^client.id, :binary_id),
        order_by: [asc: c.seq, asc: c.changed_at, asc: c.id],
        select: %{
          seq: c.seq,
          record_type: c.record_type,
          record_id: type(c.record_id, :binary_id),
          row_type: c.row_type,
          row_id: type(c.row_id, :binary_id),
          action: c.action,
          old_value: c.old_value,
          new_value: c.new_value,
          changed_at: type(c.changed_at, :utc_datetime)
        }
      )

    query = cutoff(query, client, current)

    query
    |> Repo.all()
    |> Enum.group_by(&{&1.record_type, &1.record_id})
    |> Enum.map(fn {{type, id}, rows} ->
      Map.merge(
        %{record_type: type, record_id: id, changes: Enum.map(rows, &public_change/1)},
        record_link(ctx, client.id, type, id)
      )
    end)
    |> Enum.sort_by(fn group -> {hd(group.changes).seq, group.record_id} end)
  end

  defp record_link(ctx, client_id, type, id) do
    schema =
      case type do
        "workout" -> Easy.Training.TrainingSession
        "meal" -> Easy.Nutrition.DiaryMeal
        "tracker_entry" -> Entry
      end

    row =
      Repo.one(from(r in schema, where: r.business_id == ^ctx.business_id and r.client_id == ^client_id and r.id == ^id))

    %{local_date: row && row.local_date, tracker_id: row && Map.get(row, :tracker_id), title: record_title(row, type)}
  end

  defp record_title(nil, _), do: "Removed record"
  defp record_title(row, "meal"), do: row.name
  defp record_title(row, "tracker_entry"), do: Repo.preload(row, :tracker).tracker.name

  defp record_title(row, "workout") do
    session = Execution.load(row)
    if session.prescription, do: session.prescription["name"] || "Workout", else: "Freestyle workout"
  end

  defp public_change(row) do
    row
    |> Map.drop([:record_type, :record_id])
    |> Map.update!(:old_value, &public_value/1)
    |> Map.update!(:new_value, &public_value/1)
  end

  defp public_value(nil), do: nil
  defp public_value(value), do: Map.drop(value, ["business_id"])

  defp cutoff(query, _client, %{reviewed_through_seq: seq}), do: where(query, [c], c.seq > ^seq)
  defp cutoff(query, %{current_term: nil}, nil), do: where(query, false)

  defp cutoff(query, client, nil) do
    where(
      query,
      [c],
      fragment(
        "(? AT TIME ZONE 'UTC' AT TIME ZONE ?)::date >= ?",
        c.changed_at,
        ^Client.applied_timezone(client),
        type(^client.current_term.starts_on, :date)
      )
    )
  end

  defp metrics(ctx, client, dates, requests) do
    entry_ids =
      Repo.all(
        from(e in Entry,
          where:
            e.business_id == ^ctx.business_id and e.client_id == ^client.id and is_nil(e.deleted_at) and
              e.local_date >= ^dates.from and e.local_date <= ^dates.to,
          select: e.tracker_id,
          distinct: true
        )
      )

    assigned_ids =
      Repo.all(
        from(a in Assignment,
          where:
            a.business_id == ^ctx.business_id and a.client_id == ^client.id and a.starts_on <= ^dates.to and
              (is_nil(a.ends_on) or a.ends_on >= ^dates.from),
          select: a.tracker_id,
          distinct: true
        )
      )

    ids = Enum.uniq(entry_ids ++ assigned_ids ++ Enum.map(requests, & &1.tracker.id))
    Easy.Result.traverse(ids, &Reader.metrics_for_client(ctx, client.id, &1, from: dates.from, to: dates.to))
  end

  defp plans(ctx, client_id),
    do:
      Repo.all(
        from(p in Easy.Plans.Plan,
          where:
            p.business_id == ^ctx.business_id and p.client_id == ^client_id and p.domain in [:training, :nutrition] and
              is_nil(p.archived_at),
          order_by: [asc: p.domain, asc: p.name, asc: p.id],
          select: %{id: p.id, name: p.name, domain: p.domain}
        )
      )

  defp nutrition_summary(days) do
    logged = Enum.filter(days, fn d -> Enum.any?(d.totals, fn {_key, total} -> total.total_entries > 0 end) end)
    keys = logged |> Enum.flat_map(&Map.keys(&1.totals)) |> Enum.uniq()

    average =
      Map.new(keys, fn key ->
        totals = Enum.map(logged, &Map.get(&1.totals, key)) |> Enum.reject(&is_nil/1)
        known = Enum.filter(totals, &is_number(&1.value))

        {key,
         %{
           value:
             if(known != [] and length(known) == length(logged),
               do: Enum.sum(Enum.map(known, & &1.value)) / length(known)
             ),
           known_entries: length(known),
           total_entries: length(logged)
         }}
      end)

    %{days_logged: length(logged), days_count: length(days), average: average}
  end
end
