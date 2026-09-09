defmodule Easy.CheckInReminders do
  alias Easy.Clients.Client
  alias Easy.Forms.FormAssignment
  alias Easy.Repo

  # Sends run concurrently (bounded) so one slow SMTP round-trip doesn't block
  # the sweep serially — 2k reminders at 300ms each is 10 minutes single-file.
  # Each reminder is stamped only after its own send, so a crash re-sends at
  # most the in-flight batch on the next sweep.
  @spec send_batch([FormAssignment.t()], :due | :overdue) :: {non_neg_integer(), non_neg_integer()}
  def send_batch(assignments, reminder_type) do
    Easy.TaskSupervisor
    |> Task.Supervisor.async_stream_nolink(
      assignments,
      &deliver_check_in_reminder(&1, reminder_type),
      max_concurrency: 10,
      ordered: false,
      timeout: 60_000,
      on_timeout: :kill_task
    )
    |> Enum.reduce({0, 0}, fn
      {:ok, :sent}, {sent, skipped} -> {sent + 1, skipped}
      _skipped_or_crashed, {sent, skipped} -> {sent, skipped + 1}
    end)
  end

  defp deliver_check_in_reminder(%FormAssignment{client: %Client{email: email}} = assignment, type)
       when is_binary(email) do
    name = Client.full_name(assignment.client)
    email_message = reminder_email(type, email, name, assignment.id)

    with {:ok, _response} <-
           Easy.MailerDelivery.deliver_sync(email_message, metadata: %{assignment_id: assignment.id}),
         {:ok, _assignment} <- stamp_reminder(assignment, type) do
      :sent
    else
      _error -> :skipped
    end
  end

  defp deliver_check_in_reminder(_assignment, _type), do: :skipped

  defp reminder_email(:due, email, name, assignment_id),
    do: Easy.Emails.check_in_due_email(email, name, assignment_id)

  defp reminder_email(:overdue, email, name, assignment_id),
    do: Easy.Emails.check_in_overdue_email(email, name, assignment_id)

  defp stamp_reminder(assignment, type) do
    assignment
    |> FormAssignment.reminder_sent_changeset(type, DateTime.utc_now(:second))
    |> Repo.update()
  end
end
