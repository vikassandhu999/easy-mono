defmodule Easy.HealthTest do
  use Easy.DataCase, async: true

  alias Easy.Health

  test "the configured database is ready" do
    assert {:ok, :ready} = Health.check_readiness()
  end

  test "database errors, connection exceptions, and pool exits report unavailable" do
    checks = [
      fn -> {:error, :disconnected} end,
      fn -> raise DBConnection.ConnectionError, message: "connection lost" end,
      fn -> exit({:noproc, {GenServer, :call, []}}) end
    ]

    for check <- checks do
      assert {:error, :database_unavailable} = Health.check_readiness(check)
    end
  end
end
