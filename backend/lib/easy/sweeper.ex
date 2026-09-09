defmodule Easy.Sweeper do
  use GenServer

  require Logger

  @type state() :: %{
          name: atom(),
          sweep: (-> {:ok, term()} | :busy),
          interval: pos_integer(),
          retry_interval: pos_integer(),
          timeout: pos_integer()
        }

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts), do: GenServer.start_link(__MODULE__, opts, name: Keyword.fetch!(opts, :name))

  @impl true
  @spec init(keyword()) :: {:ok, state()}
  def init(opts) do
    state = %{
      name: Keyword.fetch!(opts, :name),
      sweep: Keyword.fetch!(opts, :sweep),
      interval: Keyword.fetch!(opts, :interval),
      retry_interval: Keyword.get(opts, :retry_interval, 60_000),
      timeout: Keyword.get(opts, :timeout, 300_000)
    }

    send(self(), :sweep)
    {:ok, state}
  end

  @impl true
  @spec handle_info(:sweep, state()) :: {:noreply, state()}
  def handle_info(:sweep, state) do
    outcome =
      :telemetry.span([:easy, :sweeper], %{job: state.name}, fn ->
        outcome = run_with_deadline(state)
        {outcome, %{job: state.name, outcome: outcome}}
      end)

    delay = if outcome in [:retry, :timeout], do: state.retry_interval, else: state.interval
    Process.send_after(self(), :sweep, delay)
    {:noreply, state}
  end

  defp run_with_deadline(state) do
    task = Task.async(fn -> run(state) end)

    case Task.yield(task, state.timeout) || Task.shutdown(task, :brutal_kill) do
      {:ok, outcome} ->
        outcome

      nil ->
        Logger.warning("#{inspect(state.name)} exceeded its #{state.timeout}ms deadline and will retry")
        :timeout
    end
  end

  defp run(state) do
    case state.sweep.() do
      {:ok, _result} -> :ok
      :busy -> :busy
    end
  rescue
    error in DBConnection.ConnectionError ->
      Logger.warning("#{inspect(state.name)} will retry after a database connection failure: #{Exception.message(error)}")
      :retry
  end
end
