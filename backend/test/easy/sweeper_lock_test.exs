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
end
