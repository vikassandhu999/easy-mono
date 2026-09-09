defmodule Easy.CheckInSweeper do
  alias Easy.CheckIns
  alias Easy.Sweeper
  alias Easy.SweeperLock

  @day_ms 24 * 60 * 60 * 1000
  @lock_name "easy-check-in-sweeper"

  @type counts :: %{
          generated: non_neg_integer(),
          inactive_advanced: non_neg_integer(),
          due_reminders: non_neg_integer(),
          due_skipped: non_neg_integer(),
          overdue_reminders: non_neg_integer(),
          overdue_skipped: non_neg_integer()
        }

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(_opts) do
    Sweeper.start_link(
      name: __MODULE__,
      sweep: fn -> SweeperLock.run(@lock_name, &sweep/0) end,
      interval: @day_ms
    )
  end

  @spec child_spec(keyword()) :: Supervisor.child_spec()
  def child_spec(opts), do: %{id: __MODULE__, start: {__MODULE__, :start_link, [opts]}}

  @spec sweep(Date.t()) :: counts()
  def sweep(today \\ Date.utc_today()) do
    {generated, inactive_advanced} = CheckIns.generate_due_check_ins(today)
    {due_reminders, due_skipped} = CheckIns.send_due_check_in_reminders(today)
    {overdue_reminders, overdue_skipped} = CheckIns.send_overdue_check_in_reminders(today)

    %{
      generated: generated,
      inactive_advanced: inactive_advanced,
      due_reminders: due_reminders,
      due_skipped: due_skipped,
      overdue_reminders: overdue_reminders,
      overdue_skipped: overdue_skipped
    }
  end
end
