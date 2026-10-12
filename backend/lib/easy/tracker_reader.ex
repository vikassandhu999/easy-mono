defmodule Easy.Trackers.Reader do
  alias Easy.Clients.Client
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.LocalCalendar
  alias Easy.Repo
  alias Easy.Trackers
  alias Easy.Trackers.Assignment
  alias Easy.Trackers.Assignments
  alias Easy.Trackers.Entry
  alias Easy.Trackers.Records
  alias Easy.Trackers.Request
  alias Easy.Training.TrainingSession
  import Ecto.Query

  @spec entries_for_client(Ctx.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def entries_for_client(ctx, client_id, opts \\ []) do
    with {:ok, _client} <- Trackers.client(ctx, client_id),
         {:ok, from_date} <- optional_date(Keyword.get(opts, :from)),
         {:ok, to_date} <- optional_date(Keyword.get(opts, :to)) do
      query = entries(ctx, client_id) |> filter_date(from_date, to_date)

      query =
        if Keyword.get(opts, :tracker_id),
          do: where(query, [e], e.tracker_id == ^Keyword.get(opts, :tracker_id)),
          else: query

      Trackers.page(query, opts, &Records.present(ctx, &1))
    end
  end

  @spec today_for_client(Ctx.t(), String.t()) :: {:ok, map()} | {:error, term()}
  def today_for_client(ctx, client_id) do
    with {:ok, client} <- Trackers.client(ctx, client_id) do
      today = Client.local_date(client, DateTime.utc_now())

      if term_on(client, today) do
        recorded =
          Repo.all(from(e in entries(ctx, client_id), where: e.local_date == ^today, select: e.tracker_id))
          |> MapSet.new()

        due =
          Assignments.current(ctx, client_id, today)
          |> Enum.filter(&(is_nil(&1.tracker.archived_at) and due?(&1, today) and not MapSet.member?(recorded, &1.tracker_id)))

        {:ok, %{date: today, due: Enum.map(due, &Assignments.present(ctx, &1)), requests: open_requests(ctx, client, today)}}
      else
        {:ok, %{date: today, due: [], requests: []}}
      end
    end
  end

  @spec requests_for_client(Ctx.t(), String.t()) :: {:ok, [map()]} | {:error, term()}
  def requests_for_client(ctx, client_id) do
    with {:ok, client} <- Trackers.client(ctx, client_id),
         do: {:ok, open_requests(ctx, client, Client.local_date(client, DateTime.utc_now()))}
  end

  @spec request_for_client(Ctx.t(), String.t(), map()) :: {:ok, map()} | {:error, term()}
  def request_for_client(ctx, client_id, attrs) do
    with :ok <- Ctx.ensure_coach(ctx),
         {:ok, client} <- Trackers.client(ctx, client_id),
         :ok <- current_coaching(client),
         {:ok, tracker} <- Trackers.active_tracker(ctx, Map.get(attrs, :tracker_id, Map.get(attrs, "tracker_id"))),
         {:ok, row} <-
           Repo.insert(%Request{
             business_id: ctx.business_id,
             client_id: client_id,
             tracker_id: tracker.id,
             requested_by: ctx.coach_id,
             requested_at: DateTime.utc_now(:microsecond)
           }) do
      {:ok, request_value(ctx, row)}
    end
  end

  @spec cancel_for_client(Ctx.t(), String.t(), String.t()) :: {:ok, term()} | {:error, term()}
  def cancel_for_client(ctx, client_id, id) do
    with :ok <- Ctx.ensure_coach(ctx), {:ok, _client} <- Trackers.client(ctx, client_id) do
      case Repo.one(from(r in Request, where: r.business_id == ^ctx.business_id and r.client_id == ^client_id and r.id == ^id)) do
        nil ->
          {:error, :not_found}

        row ->
          row
          |> Ecto.Changeset.change(cancelled_at: row.cancelled_at || DateTime.utc_now(:microsecond))
          |> Repo.update()
      end
    end
  end

  defp current_coaching(client) do
    today = Client.local_date(client, DateTime.utc_now())
    if term_on(client, today), do: :ok, else: {:error, :coaching_required}
  end

  @spec waiting_for_clients(Ctx.t(), [Client.t()]) :: %{optional(String.t()) => DateTime.t()}
  def waiting_for_clients(ctx, clients) do
    open_request_rows(ctx, clients)
    |> Enum.reduce(%{}, fn row, dates -> Map.put_new(dates, row.client_id, row.requested_at) end)
  end

  defp open_requests(ctx, client, _date), do: open_request_rows(ctx, [client]) |> Enum.map(&request_value(ctx, &1))

  defp open_request_rows(_ctx, []), do: []

  defp open_request_rows(ctx, clients) do
    by_id = Map.new(clients, &{&1.id, &1})
    ids = Map.keys(by_id)

    rows =
      Repo.all(
        from(r in Request,
          as: :request,
          join: tracker in assoc(r, :tracker),
          where:
            r.business_id == ^ctx.business_id and r.client_id in ^ids and is_nil(r.cancelled_at) and
              is_nil(tracker.archived_at),
          where:
            not exists(
              from(e in Entry,
                where:
                  e.business_id == parent_as(:request).business_id and e.client_id == parent_as(:request).client_id and
                    e.tracker_id == parent_as(:request).tracker_id and
                    is_nil(e.deleted_at) and e.inserted_at >= parent_as(:request).requested_at,
                select: 1
              )
            ),
          order_by: [asc: r.requested_at, asc: r.id],
          preload: [tracker: tracker]
        )
      )

    Enum.filter(rows, fn row ->
      client = Map.fetch!(by_id, row.client_id)
      term = term_on(client, Client.local_date(client, DateTime.utc_now()))
      term && CoachingTerm.covers?(term, LocalCalendar.to_local_date(row.requested_at, Client.applied_timezone(client)))
    end)
  end

  defp request_value(ctx, row) do
    row = Repo.preload(row, :tracker)

    row
    |> Map.take([:id, :requested_by, :requested_at, :cancelled_at])
    |> Map.put(:tracker, Trackers.present(ctx, row.tracker))
  end

  @spec prompts_for_client(Ctx.t(), String.t(), map()) :: {:ok, [map()]} | {:error, term()}
  def prompts_for_client(ctx, client_id, params) do
    with {:ok, client} <- Trackers.client(ctx, client_id),
         {:ok, {event, timing, field}} <- event(ctx, client_id, params) do
      date = event.local_date

      if term_on(client, date) do
        recorded =
          Repo.all(from(e in entries(ctx, client_id), where: field(e, ^field) == ^event.id, select: e.tracker_id))
          |> MapSet.new()

        rows =
          Assignments.current(ctx, client_id, date)
          |> Enum.filter(&(&1.timing == timing and is_nil(&1.tracker.archived_at) and not MapSet.member?(recorded, &1.tracker_id)))

        {:ok, Enum.map(rows, &Assignments.present(ctx, &1))}
      else
        {:ok, []}
      end
    end
  end

  defp event(ctx, client_id, params) do
    case Map.get(params, "about_session_id", Map.get(params, :about_session_id)) do
      nil -> {:error, :invalid_tracker_value}
      session -> find_event(ctx, client_id, TrainingSession, session, :after_workout, :about_session_id)
    end
  end

  defp find_event(ctx, client_id, schema, id, timing, field) do
    with :ok <- Records.event_links(ctx, client_id, %{field => id}) do
      {:ok, {Repo.one(from(e in schema, where: e.business_id == ^ctx.business_id and e.client_id == ^client_id and e.id == ^id)), timing, field}}
    end
  end

  @spec metrics_for_client(Ctx.t(), String.t(), String.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def metrics_for_client(ctx, client_id, tracker_id, opts \\ []) do
    with {:ok, client} <- Trackers.client(ctx, client_id),
         {:ok, tracker} <- Trackers.get_tracker(ctx, tracker_id),
         {:ok, {from_date, to_date}} <- range(client, opts),
         {:ok, previous_date} <- optional_date(Keyword.get(opts, :previous_date)) do
      all =
        Repo.all(
          from(e in entries(ctx, client_id),
            where: e.tracker_id == ^tracker_id,
            order_by: [asc: e.local_date, asc: e.inserted_at, asc: e.id]
          )
        )

      rows = Enum.filter(all, &(not Date.before?(&1.local_date, from_date) and not Date.after?(&1.local_date, to_date)))
      latest = List.last(rows)
      previous = previous(all, latest, previous_date, from_date, tracker.kind)

      numbers = rows |> Enum.map(&numeric/1) |> Enum.reject(&is_nil/1)

      result = %{
        tracker: Trackers.present(ctx, tracker),
        count: length(rows),
        latest: entry_value(ctx, latest),
        previous: entry_value(ctx, previous),
        first: entry_value(ctx, List.first(all)),
        change: delta(latest, previous),
        min: Enum.min(numbers, fn -> nil end),
        max: Enum.max(numbers, fn -> nil end),
        average: if(numbers != [], do: Enum.sum(numbers) / length(numbers)),
        series:
          Enum.flat_map(rows, fn row ->
            if numeric(row), do: [%{date: row.local_date, value: numeric(row), entry_id: row.id}], else: []
          end),
        workout_coverage: coverage(ctx, client_id, tracker_id, from_date, to_date, :after_workout)
      }

      {:ok, result}
    end
  end

  defp previous(all, latest, nil, _from_date, :photo) do
    if latest, do: all |> Enum.take_while(&(&1.id != latest.id)) |> List.last()
  end

  defp previous(all, _latest, date, from_date, _) do
    date = date || Date.add(from_date, -1)
    all |> Enum.filter(&(not Date.after?(&1.local_date, date))) |> List.last()
  end

  defp entry_value(_, nil), do: nil
  defp entry_value(ctx, row), do: Records.present(ctx, row)
  defp numeric(nil), do: nil
  defp numeric(%{number_value: %Decimal{} = n}), do: Decimal.to_float(n)
  defp numeric(%{rating_value: n}), do: n

  defp delta(latest, previous),
    do: if(is_number(numeric(latest)) and is_number(numeric(previous)), do: numeric(latest) - numeric(previous))

  defp coverage(ctx, client_id, tracker_id, from_date, to_date, timing) do
    {query, link} = completed_events(timing)
    ids = query |> assigned_events(ctx, client_id, tracker_id, timing) |> filter_date(from_date, to_date) |> Repo.all()

    recorded =
      Repo.one(
        from(e in entries(ctx, client_id),
          where: e.tracker_id == ^tracker_id and field(e, ^link) in ^ids,
          select: count(field(e, ^link), :distinct)
        )
      )

    %{recorded: recorded, total: length(ids)}
  end

  defp completed_events(:after_workout) do
    {from(e in TrainingSession, where: e.state == :completed), :about_session_id}
  end

  defp assigned_events(query, ctx, client_id, tracker_id, timing) do
    from(e in query,
      join: a in Assignment,
      on: a.business_id == e.business_id and a.client_id == e.client_id,
      where: a.tracker_id == ^tracker_id and a.timing == ^timing,
      where: a.starts_on <= e.local_date and (is_nil(a.ends_on) or a.ends_on >= e.local_date),
      where: e.business_id == ^ctx.business_id and e.client_id == ^client_id,
      distinct: true,
      select: e.id
    )
  end

  defp range(client, opts) do
    today = Client.local_date(client, DateTime.utc_now())

    with {:ok, from_date} <- optional_date(Keyword.get(opts, :from)),
         {:ok, to_date} <- optional_date(Keyword.get(opts, :to)) do
      from_date = from_date || Date.add(today, -29)
      to_date = to_date || today
      if Date.diff(to_date, from_date) in 0..365, do: {:ok, {from_date, to_date}}, else: {:error, :invalid_date_range}
    end
  end

  defp optional_date(nil), do: {:ok, nil}
  defp optional_date(%Date{} = date), do: {:ok, date}

  defp optional_date(value) do
    case Date.from_iso8601(value) do
      {:ok, date} -> {:ok, date}
      _ -> {:error, :invalid_date}
    end
  end

  defp filter_date(query, nil, nil), do: query

  defp filter_date(query, from_date, to_date) do
    query = if from_date, do: where(query, [e], e.local_date >= ^from_date), else: query
    if to_date, do: where(query, [e], e.local_date <= ^to_date), else: query
  end

  defp entries(ctx, client_id) do
    Entry |> where(business_id: ^ctx.business_id, client_id: ^client_id) |> where([e], is_nil(e.deleted_at))
  end

  defp term_on(client, date), do: Enum.find(client.terms, &CoachingTerm.covers?(&1, date))
  defp due?(%{timing: :daily}, _date), do: true
  defp due?(%{timing: :weekly, weekday: weekday}, date), do: Date.day_of_week(date) - 1 == weekday
  defp due?(_, _), do: false
end
