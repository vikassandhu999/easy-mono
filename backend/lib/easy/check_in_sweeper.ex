defmodule Easy.CheckInSweeper do
  use GenServer

  alias Easy.Forms
  alias Easy.SweeperLock

  @day_ms 24 * 60 * 60 * 1000
  @lock_name "easy-check-in-sweeper"

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: __MODULE__)

  @impl true
  @spec init(keyword()) :: {:ok, map()}
  def init(_opts) do
    send(self(), :sweep)
    {:ok, %{}}
  end

  @impl true
  @spec handle_info(:sweep, map()) :: {:noreply, map()}
  def handle_info(:sweep, state) do
    SweeperLock.run(@lock_name, &sweep/0)
    Process.send_after(self(), :sweep, @day_ms)
    {:noreply, state}
  end

  @spec sweep(Date.t()) :: map()
  def sweep(today \\ Date.utc_today()) do
    {generated, inactive_advanced} = Forms.generate_due_check_ins(today)
    {due_reminders, due_skipped} = Forms.send_due_check_in_reminders(today)
    {overdue_reminders, overdue_skipped} = Forms.send_overdue_check_in_reminders(today)

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
