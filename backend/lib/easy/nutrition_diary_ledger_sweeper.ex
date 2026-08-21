defmodule Easy.Nutrition.DiaryLedgerSweeper do
  use GenServer

  alias Easy.Nutrition.Diary
  alias Easy.SweeperLock

  @day_ms 24 * 60 * 60 * 1000
  @lock_name "easy-nutrition-diary-ledger-sweeper"

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  @spec init(keyword()) :: {:ok, map()}
  def init(_opts) do
    send(self(), :sweep)
    {:ok, %{}}
  end

  @impl true
  @spec handle_info(:sweep, map()) :: {:noreply, map()}
  def handle_info(:sweep, state) do
    SweeperLock.run(@lock_name, &Diary.purge_expired_command_ledger/0)
    Process.send_after(self(), :sweep, @day_ms)
    {:noreply, state}
  end
end
