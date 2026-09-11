defmodule Easy.CheckIns do
  require Logger

  alias Easy.CheckInReminders
  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.CursorPage
  alias Easy.Forms.CheckInSchedule
  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormTemplate
  alias Easy.Repo

  import Ecto.Query

  @sweep_batch_size 100
  @active_check_in_schedule_cap 3

  @spec list_check_in_schedules_for_client(Ctx.t(), String.t()) ::
          {:ok, [CheckInSchedule.t()]} | {:error, :not_found}
  def list_check_in_schedules_for_client(%Ctx{} = ctx, client_id) do
    with {:ok, page} <- list_check_in_schedule_page_for_client(ctx, client_id) do
      {:ok, page.data}
    end
  end

  @spec list_check_in_schedule_page_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, CursorPage.t(CheckInSchedule.t())} | {:error, atom()}
  def list_check_in_schedule_page_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      base =
        CheckInSchedule
        |> CheckInSchedule.for_client(ctx.business_id, client_id)
        |> CheckInSchedule.for_search(Keyword.get(opts, :search))
        |> CheckInSchedule.for_active(Keyword.get(opts, :active))

      schedule_page(base, ctx.business_id, opts)
    end
  end

  defp schedule_page(base, business_id, opts) do
    count = Repo.aggregate(base, :count, :id)
    limit = CursorPage.limit(opts)

    case Keyword.get(opts, :cursor) do
      nil ->
        data = base |> CheckInSchedule.by_next_due() |> CheckInSchedule.include_template(business_id) |> Repo.all()
        {:ok, %{data: data, count: count, next_cursor: nil}}

      cursor ->
        with {:ok, query} <- CursorPage.query(base, cursor, limit) do
          rows = query |> CheckInSchedule.include_template(business_id) |> Repo.all()
          {:ok, CursorPage.finish(rows, limit, count)}
        end
    end
  end

  @spec create_check_in_schedule_for_client(Ctx.t(), String.t(), map()) ::
          {:ok, CheckInSchedule.t()}
          | {:error,
             :not_found
             | :invalid_check_in_template
             | :check_in_schedule_cap_reached
             | Ecto.Changeset.t()}
  def create_check_in_schedule_for_client(%Ctx{} = ctx, client_id, attrs) do
    with {:ok, client} <- ClientAccess.authorize_client(ctx, client_id),
         {:ok, template_id} <- CheckInSchedule.template_reference(attrs),
         {:ok, template} <- fetch_form_template(ctx.business_id, template_id),
         :ok <- ensure_check_in_template(template) do
      Repo.transact(fn -> create_check_in_schedule_transaction(ctx, client, template, attrs) end)
    end
  end

  @spec update_check_in_schedule(Ctx.t(), String.t(), map()) ::
          {:ok, CheckInSchedule.t()}
          | {:error, :not_found | :check_in_schedule_cap_reached | Ecto.Changeset.t()}
  def update_check_in_schedule(%Ctx{} = ctx, schedule_id, attrs) do
    with {:ok, schedule} <- get_check_in_schedule(ctx.business_id, schedule_id),
         :ok <- ClientAccess.authorize_client_id(ctx, schedule.client_id),
         changeset = CheckInSchedule.update_changeset(schedule, attrs),
         :ok <- ensure_reactivation_within_cap(changeset),
         {:ok, updated} <- Repo.update(changeset) do
      {:ok, reload_check_in_schedule(updated)}
    end
  end

  @spec delete_check_in_schedule(Ctx.t(), String.t()) ::
          {:ok, CheckInSchedule.t()} | {:error, :not_found | :schedule_has_assignments | Ecto.Changeset.t()}
  def delete_check_in_schedule(%Ctx{} = ctx, schedule_id) do
    with {:ok, schedule} <- get_check_in_schedule(ctx.business_id, schedule_id),
         :ok <- ClientAccess.authorize_client_id(ctx, schedule.client_id),
         :ok <- ensure_schedule_unused(ctx.business_id, schedule.id) do
      Repo.delete(schedule)
    end
  end

  @spec generate_due_check_ins(Date.t()) :: {non_neg_integer(), non_neg_integer()}
  def generate_due_check_ins(today) do
    due_schedules(today)
    |> reduce_sweep_batches({0, 0}, fn schedules, counts ->
      Enum.reduce(schedules, counts, &generate_due_check_in(&1.id, today, &2))
    end)
  end

  @spec send_due_check_in_reminders(Date.t()) :: {non_neg_integer(), non_neg_integer()}
  def send_due_check_in_reminders(today) do
    FormAssignment
    |> FormAssignment.pending_check_in_reminder(:due, today)
    |> FormAssignment.include_client()
    |> send_reminder_batches(:due)
  end

  @spec send_overdue_check_in_reminders(Date.t()) :: {non_neg_integer(), non_neg_integer()}
  def send_overdue_check_in_reminders(today) do
    FormAssignment
    |> FormAssignment.pending_check_in_reminder(:overdue, today)
    |> FormAssignment.include_client()
    |> send_reminder_batches(:overdue)
  end

  defp create_check_in_schedule_transaction(ctx, client, template, attrs) do
    with :ok <- ensure_schedule_capacity(ctx.business_id, client.id) do
      insert_check_in_schedule(ctx, client, template, attrs)
    end
  end

  defp insert_check_in_schedule(ctx, client, template, attrs) do
    today = Date.utc_today()

    with {:ok, schedule} <-
           ctx.business_id |> CheckInSchedule.insert_changeset(client.id, template.id, attrs) |> Repo.insert(),
         {:ok, _result} <- process_new_schedule(schedule, client, template, today) do
      {:ok, reload_check_in_schedule(schedule)}
    end
  end

  defp process_new_schedule(schedule, client, template, today) do
    if CheckInSchedule.due_on_or_before?(schedule, today),
      do: process_due_schedule(schedule, client, template, today),
      else: {:ok, :noop}
  end

  defp generate_due_check_in(schedule_id, today, {generated, inactive} = counts) do
    case Repo.transact(fn -> generate_due_check_in_transaction(schedule_id, today) end) do
      {:ok, :generated} ->
        {generated + 1, inactive}

      {:ok, :inactive} ->
        {generated, inactive + 1}

      {:ok, :noop} ->
        counts

      {:error, reason} ->
        report_generation_error(schedule_id, reason)
        counts
    end
  end

  defp report_generation_error(schedule_id, %Ecto.Changeset{errors: errors}) do
    report_generation_error(schedule_id, {:validation, errors})
  end

  defp report_generation_error(schedule_id, reason) do
    Logger.error("Check-in generation failed schedule_id=#{schedule_id} reason=#{inspect(reason)}")

    :telemetry.execute(
      [:easy, :check_ins, :generation, :error],
      %{count: 1},
      %{schedule_id: schedule_id, reason: reason}
    )
  end

  defp send_reminder_batches(query, type) do
    reduce_sweep_batches(query, {0, 0}, fn assignments, {sent, skipped} ->
      {batch_sent, batch_skipped} = CheckInReminders.send_batch(assignments, type)
      {sent + batch_sent, skipped + batch_skipped}
    end)
  end

  # Keyset paging keeps failed records from blocking later pages and avoids
  # offset skips when successful records leave the due query during the sweep.
  defp reduce_sweep_batches(query, counts, reduce_batch, cursor \\ nil) do
    batch =
      query
      |> after_sweep_cursor(cursor)
      |> order_by([record], asc: record.id)
      |> limit(@sweep_batch_size)
      |> Repo.all()

    case batch do
      [] -> counts
      records -> reduce_sweep_batches(query, reduce_batch.(records, counts), reduce_batch, List.last(records).id)
    end
  end

  defp after_sweep_cursor(query, nil), do: query
  defp after_sweep_cursor(query, cursor), do: where(query, [record], record.id > ^cursor)

  defp generate_due_check_in_transaction(schedule_id, today) do
    schedule =
      CheckInSchedule
      |> where([schedule], schedule.id == ^schedule_id)
      |> lock("FOR UPDATE")
      |> Repo.one()

    process_locked_schedule(schedule, today)
  end

  defp process_locked_schedule(%CheckInSchedule{active: true} = schedule, today) do
    if CheckInSchedule.due_on_or_before?(schedule, today) do
      with {:ok, client} <- fetch_client(schedule.business_id, schedule.client_id),
           {:ok, template} <- fetch_form_template(schedule.business_id, schedule.form_template_id) do
        process_due_schedule(schedule, client, template, today)
      end
    else
      {:ok, :noop}
    end
  end

  defp process_locked_schedule(_schedule, _today), do: {:ok, :noop}

  defp process_due_schedule(schedule, %Client{status: :active} = client, template, today) do
    now = DateTime.utc_now(:second)

    schedule.business_id
    |> FormAssignment.for_schedule(schedule.id)
    |> FormAssignment.open()
    |> Repo.update_all(set: [status: :missed, completed_at: nil, updated_at: now])

    attrs = %{due_date: schedule.next_due_on}

    with {:ok, _assignment} <-
           FormAssignment.insert_scheduled_changeset(schedule.business_id, client.id, template.id, schedule.id, attrs)
           |> Repo.insert(),
         {:ok, _schedule} <- advance_schedule(schedule, today) do
      {:ok, :generated}
    end
  end

  defp process_due_schedule(schedule, _inactive_client, _template, today) do
    with {:ok, _schedule} <- advance_schedule(schedule, today), do: {:ok, :inactive}
  end

  defp advance_schedule(schedule, today) do
    {next_due_on, active} = CheckInSchedule.advance_past(schedule, today)
    schedule |> CheckInSchedule.update_changeset(%{next_due_on: next_due_on, active: active}) |> Repo.update()
  end

  defp due_schedules(today) do
    CheckInSchedule
    |> CheckInSchedule.active()
    |> CheckInSchedule.due_on_or_before(today)
    |> select([schedule], %{id: schedule.id})
  end

  defp ensure_check_in_template(%FormTemplate{purpose: :check_in}), do: :ok
  defp ensure_check_in_template(_template), do: {:error, :invalid_check_in_template}

  defp ensure_reactivation_within_cap(%Ecto.Changeset{data: schedule} = changeset) do
    if CheckInSchedule.reactivation?(changeset),
      do: ensure_schedule_capacity(schedule.business_id, schedule.client_id),
      else: :ok
  end

  # Creation and reactivation share this soft product limit.
  defp ensure_schedule_capacity(business_id, client_id) do
    if count_active_check_in_schedules(business_id, client_id) >= @active_check_in_schedule_cap do
      {:error, :check_in_schedule_cap_reached}
    else
      :ok
    end
  end

  defp count_active_check_in_schedules(business_id, client_id) do
    CheckInSchedule
    |> CheckInSchedule.for_client(business_id, client_id)
    |> CheckInSchedule.active()
    |> Repo.aggregate(:count)
  end

  defp get_check_in_schedule(business_id, schedule_id) do
    CheckInSchedule
    |> CheckInSchedule.for_business(business_id)
    |> Repo.get(schedule_id)
    |> ok_or_not_found()
  end

  defp reload_check_in_schedule(schedule) do
    CheckInSchedule
    |> CheckInSchedule.for_business(schedule.business_id)
    |> CheckInSchedule.include_template(schedule.business_id)
    |> Repo.get(schedule.id)
  end

  defp schedule_has_assignments?(business_id, schedule_id) do
    business_id
    |> FormAssignment.for_schedule(schedule_id)
    |> Repo.exists?()
  end

  defp ensure_schedule_unused(business_id, schedule_id) do
    if schedule_has_assignments?(business_id, schedule_id),
      do: {:error, :schedule_has_assignments},
      else: :ok
  end

  defp fetch_client(business_id, client_id) do
    Client
    |> Client.for_business(business_id)
    |> Repo.get(client_id)
    |> ok_or_not_found()
  end

  defp fetch_form_template(business_id, template_id) do
    FormTemplate
    |> FormTemplate.for_business(business_id)
    |> Repo.get(template_id)
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(value), do: {:ok, value}
end
