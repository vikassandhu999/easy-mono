defmodule Easy.SweeperTest do
  use ExUnit.Case, async: false

  import ExUnit.CaptureLog

  alias Easy.Repo
  alias Easy.Sweeper
  alias Easy.SweeperLock

  setup do
    handler = {__MODULE__, make_ref()}
    :ok = :telemetry.attach(handler, [:easy, :sweeper, :stop], &__MODULE__.capture_event/4, self())
    on_exit(fn -> :telemetry.detach(handler) end)
    pool = start_supervised!({Repo, name: __MODULE__.Pool, pool: DBConnection.ConnectionPool, pool_size: 2})
    {:ok, pool: pool}
  end

  test "database connection failures retry without restarting the scheduler", %{pool: pool} do
    capture_log(fn ->
      pid = start_sweeper(pool, interval: 60_000, retry_interval: 5)
      assert_receive {:attempt, worker}, 1_000
      send(worker, :database_down)

      assert_receive {:sweep_finished, %{duration: retry_duration}, %{job: __MODULE__, outcome: :retry}}, 1_000
      assert retry_duration > 0

      assert_receive {:attempt, retry_worker}, 1_000
      send(retry_worker, :complete)
      assert_receive {:sweep_finished, %{duration: duration}, %{job: __MODULE__, outcome: :ok}}, 1_000
      assert duration > 0
      refute_receive {:attempt, _}, 100
      assert Process.alive?(pid)
    end)
  end

  def capture_event(_event, measurements, metadata, parent) do
    send(parent, {:sweep_finished, measurements, metadata})
  end

  test "the interval starts after work completes, so slow work never overlaps", %{pool: pool} do
    pid = start_sweeper(pool, interval: 100)
    assert_receive {:attempt, worker}, 1_000
    refute_receive {:attempt, _}, 150
    send(worker, :complete)
    refute_receive {:attempt, _}, 50
    assert_receive {:attempt, next_worker}, 1_000
    send(next_worker, :complete)
    GenServer.stop(pid)
  end

  test "the work deadline kills the lock holder before retrying", %{pool: pool} do
    capture_log(fn ->
      pid = start_sweeper(pool, interval: 60_000, retry_interval: 100, timeout: 250)
      assert_receive {:attempt, worker}, 1_000
      monitor = Process.monitor(worker)

      assert_receive {:DOWN, ^monitor, :process, ^worker, :killed}, 1_000
      assert_receive {:sweep_finished, _, %{outcome: :timeout}}, 1_000
      assert_receive {:attempt, next_worker}, 1_000
      send(next_worker, :complete)
      assert_receive {:sweep_finished, _, %{outcome: :ok}}, 1_000
      assert Process.alive?(pid)
    end)
  end

  test "programming errors remain visible to supervision", %{pool: pool} do
    capture_log(fn ->
      pid = start_sweeper(pool, interval: 60_000)
      monitor = Process.monitor(pid)
      assert_receive {:attempt, worker}, 1_000
      send(worker, :bug)

      assert_receive {:DOWN, ^monitor, :process, ^pid, {%ArgumentError{message: "broken sweep"}, _}}, 1_000
    end)
  end

  test "a scheduler exit cannot leave its work running", %{pool: pool} do
    pid = start_sweeper(pool, interval: 60_000)
    assert_receive {:attempt, worker}, 1_000
    monitor = Process.monitor(worker)

    Process.exit(pid, :shutdown)
    assert_receive {:DOWN, ^monitor, :process, ^worker, :shutdown}, 1_000
  end

  defp start_sweeper(pool, opts) do
    parent = self()

    sweep = fn ->
      send(parent, {:attempt, self()})

      receive do
        :complete -> :done
        :database_down -> raise DBConnection.ConnectionError, "database offline"
        :bug -> raise ArgumentError, "broken sweep"
      end
    end

    lock_name = "test-periodic-sweeper-#{System.unique_integer([:positive])}"

    operation = fn ->
      Repo.put_dynamic_repo(pool)
      SweeperLock.run(lock_name, sweep)
    end

    opts = Keyword.merge([name: __MODULE__, sweep: operation], opts)
    start_supervised!(Supervisor.child_spec({Sweeper, opts}, restart: :temporary))
  end
end
