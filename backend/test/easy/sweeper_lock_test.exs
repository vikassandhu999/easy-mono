defmodule Easy.SweeperLockTest do
  use ExUnit.Case, async: false

  alias Easy.Repo
  alias Easy.SweeperLock
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)
    :ok
  end

  test "only one database connection can hold a named lock" do
    parent = self()

    holder =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)

        SweeperLock.run("test-sweeper", fn ->
          send(parent, :locked)

          receive do
            :release -> :done
          end
        end)
      end)

    assert_receive :locked
    assert :busy = SweeperLock.run("test-sweeper", fn -> flunk("lock ran twice") end)

    send(holder.pid, :release)
    assert {:ok, :done} = Task.await(holder)
    assert {:ok, :reacquired} = SweeperLock.run("test-sweeper", fn -> :reacquired end)
  end

  test "a slow callback retains its lock beyond the ordinary query timeout" do
    pool =
      start_supervised!({Repo, name: __MODULE__.SlowRepo, pool: DBConnection.ConnectionPool, pool_size: 2, timeout: 50})

    original_repo = Repo.put_dynamic_repo(pool)
    parent = self()
    lock_name = "slow-sweeper-#{System.unique_integer([:positive])}"

    holder =
      Task.Supervisor.async_nolink(Easy.TaskSupervisor, fn ->
        Repo.put_dynamic_repo(pool)

        SweeperLock.run(lock_name, fn ->
          send(parent, :locked)
          receive do: (:release -> :done)
        end)
      end)

    try do
      assert_receive :locked, 1_000
      Process.sleep(200)

      assert :busy = SweeperLock.run(lock_name, fn -> :overlapping_execution end)
      send(holder.pid, :release)
      assert {:ok, :done} = Task.await(holder)
      assert {:ok, :reacquired} = SweeperLock.run(lock_name, fn -> :reacquired end)
    after
      Task.shutdown(holder, :brutal_kill)
      Repo.put_dynamic_repo(original_repo)
    end
  end
end
