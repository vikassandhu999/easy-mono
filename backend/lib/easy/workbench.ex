defmodule Easy.Workbench do
  import Ecto.Query

  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.FormAssignment
  alias Easy.Repo
  alias Easy.Training.TrainingPlan
  alias Easy.Training.TrainingSession
  alias Easy.Training.TrainingWorkout
  alias Easy.Workbench.QueueSnooze
  alias Easy.WorkbenchCheckInQueue
  alias Easy.WorkbenchOnboardingQueue
  alias Easy.WorkbenchRepliesQueue

  @weekday_numbers %{
    "monday" => 1,
    "tuesday" => 2,
    "wednesday" => 3,
    "thursday" => 4,
    "friday" => 5,
    "saturday" => 6,
    "sunday" => 7
  }

  @spec counts(Ctx.t()) ::
          {:ok,
           %{
             check_ins: non_neg_integer(),
             replies: non_neg_integer(),
             onboarding: non_neg_integer(),
             programming: non_neg_integer(),
             expiring: non_neg_integer(),
             new_clients: non_neg_integer(),
             quiet: non_neg_integer()
           }}
  def counts(%Ctx{} = ctx) do
    with {:ok, queues} <- Clients.count_workbench_queues(ctx) do
      check_ins = WorkbenchCheckInQueue.count(ctx)
      replies = WorkbenchRepliesQueue.count(ctx)
      onboarding = WorkbenchOnboardingQueue.count(ctx)

      {:ok,
       queues
       |> Map.put(:check_ins, check_ins)
       |> Map.put(:replies, replies)
       |> Map.put(:onboarding, onboarding)
       |> Map.put(:quiet, length(quiet_client_ids(ctx)))}
    end
  end

  @spec list_onboarding_queue(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [map()]}}
  def list_onboarding_queue(%Ctx{} = ctx, opts \\ []) do
    {:ok, WorkbenchOnboardingQueue.list(ctx, opts)}
  end

  @spec list_check_in_queue(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [map()]}}
  def list_check_in_queue(%Ctx{} = ctx, opts \\ []) do
    {:ok, WorkbenchCheckInQueue.list(ctx, opts)}
  end

  @spec list_replies_queue(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [map()]}}
  def list_replies_queue(%Ctx{} = ctx, opts \\ []) do
    {:ok, WorkbenchRepliesQueue.list(ctx, opts)}
  end

  @spec list_quiet_clients(Ctx.t(), keyword()) ::
          {:ok, %{clients: [Client.t()], count: non_neg_integer(), summary: map()}}
  def list_quiet_clients(%Ctx{} = ctx, opts \\ []) do
    Clients.list_clients_in_order(ctx, quiet_client_ids(ctx), opts)
  end

  @spec snooze_queue_for_client(Ctx.t(), String.t(), map()) ::
          {:ok, QueueSnooze.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def snooze_queue_for_client(%Ctx{} = ctx, client_id, attrs) do
    with {:ok, client} <- Clients.authorize_client(ctx, client_id) do
      ctx.business_id
      |> QueueSnooze.insert_changeset(client.id, attrs)
      |> Repo.insert(
        on_conflict: {:replace, [:snoozed_until, :updated_at]},
        conflict_target: [:business_id, :client_id, :queue]
      )
    end
  end

  # Quiet membership (quiet-queue sub-spec, 2026-08-06): schedule-aware, never
  # calendar-aware. The weekday → recent-dates step is plain date arithmetic,
  # so membership is computed here rather than contorted into the facts SQL;
  # the lookback is bounded (two weekday occurrences always fit in 14 days).
  defp quiet_client_ids(%Ctx{} = ctx) do
    today = Date.utc_today()
    visible = visible_active_client_ids(ctx)
    last_completed = last_completed_session_dates(ctx.business_id, visible)
    snoozed = snoozed_client_ids(ctx.business_id, :quiet, today)

    training_waiting =
      ctx.business_id
      |> plan_schedules(visible, today)
      |> Enum.group_by(& &1.client_id)
      |> Enum.flat_map(fn {client_id, rows} ->
        training_arm(client_id, rows, last_completed[client_id], today)
      end)
      |> Map.new()

    ctx.business_id
    |> missed_latest_checkins(visible, today)
    |> Enum.reduce(training_waiting, fn {client_id, due}, acc ->
      Map.update(acc, client_id, due, &min_date(&1, due))
    end)
    |> Enum.reject(fn {client_id, _since} -> MapSet.member?(snoozed, client_id) end)
    |> Enum.sort_by(fn {_client_id, since} -> since end, {:asc, Date})
    |> Enum.map(fn {client_id, _since} -> client_id end)
  end

  # Quiet when the two most recent scheduled dates both passed untrained: no
  # completed session on or after s2. Any session since s2 counts as presence —
  # a client who trained off-schedule is not quiet.
  defp training_arm(client_id, rows, last_completed, today) do
    case second_recent_scheduled_date(rows, today) do
      nil -> []
      s2 -> if last_completed == nil or Date.compare(last_completed, s2) == :lt, do: [{client_id, s2}], else: []
    end
  end

  defp second_recent_scheduled_date(rows, today) do
    for %{start_date: start, weekdays: weekdays} <- rows,
        weekday <- weekdays,
        number = Map.get(@weekday_numbers, weekday),
        number != nil,
        date <- last_two_occurrences(number, today),
        Date.compare(date, start) != :lt do
      date
    end
    |> Enum.uniq()
    |> Enum.sort({:desc, Date})
    |> Enum.at(1)
  end

  # The most recent occurrence of a weekday strictly before today, and the one
  # before it. Today is never "missed" — the day isn't over.
  defp last_two_occurrences(weekday_number, today) do
    diff = rem(Date.day_of_week(today) - weekday_number + 7, 7)
    diff = if diff == 0, do: 7, else: diff
    latest = Date.add(today, -diff)
    [latest, Date.add(latest, -7)]
  end

  defp min_date(a, b), do: if(Date.compare(a, b) == :lt, do: a, else: b)

  defp visible_active_client_ids(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.visible_to(ctx)
    |> Client.for_status(:active)
    |> select([c], c.id)
  end

  defp plan_schedules(business_id, visible, today) do
    from(tp in TrainingPlan,
      join: w in TrainingWorkout,
      on: w.training_plan_id == tp.id and w.business_id == tp.business_id,
      where:
        tp.business_id == ^business_id and tp.status == :active and
          tp.start_date <= ^today and tp.end_date >= ^today,
      where: tp.client_id in subquery(visible),
      where: fragment("cardinality(?) > 0", w.weekdays),
      select: %{client_id: tp.client_id, start_date: tp.start_date, weekdays: w.weekdays}
    )
    |> Repo.all()
  end

  defp last_completed_session_dates(business_id, visible) do
    from(s in TrainingSession,
      where: s.business_id == ^business_id and s.state == :completed,
      where: s.client_id in subquery(visible),
      group_by: s.client_id,
      select: {s.client_id, max(s.date)}
    )
    |> Repo.all()
    |> Map.new()
  end

  defp missed_latest_checkins(business_id, visible, today) do
    from(fa in FormAssignment,
      where: fa.business_id == ^business_id and fa.purpose == :check_in,
      where: fa.client_id in subquery(visible),
      distinct: fa.client_id,
      order_by: [asc: fa.client_id, desc_nulls_last: fa.due_date, desc: fa.inserted_at],
      select: %{client_id: fa.client_id, status: fa.status, due_date: fa.due_date}
    )
    |> Repo.all()
    |> Enum.filter(&(&1.status == :missed))
    |> Map.new(&{&1.client_id, &1.due_date || today})
  end

  defp snoozed_client_ids(business_id, queue, today) do
    QueueSnooze
    |> QueueSnooze.for_business(business_id)
    |> QueueSnooze.for_queue(queue)
    |> QueueSnooze.active(today)
    |> select([s], s.client_id)
    |> Repo.all()
    |> MapSet.new()
  end
end
