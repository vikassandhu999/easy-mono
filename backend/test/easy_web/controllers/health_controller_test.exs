defmodule EasyWeb.HealthControllerTest do
  use Easy.ConnCase

  test "GET /ready succeeds without authentication when the database is reachable", %{conn: conn} do
    assert conn |> get("/ready") |> response(204) == ""
  end

  test "readiness failures return 503 without database details", %{conn: conn} do
    result = Easy.Health.check_readiness(fn -> {:error, "private database address"} end)
    conn = EasyWeb.FallbackController.call(conn, result)

    assert %{
             "error_code" => "service_unavailable",
             "error_message" => "Service is not ready",
             "error_detail" => %{}
           } = json_response(conn, 503)
  end

  describe "GET /api/health" do
    test "returns service health metadata", %{conn: conn} do
      conn = get(conn, "/api/health")

      assert %{
               "service" => "easy-backend",
               "status" => "ok",
               "timestamp" => timestamp,
               "version" => "1.0.0"
             } = response = json_response(conn, 200)

      assert Map.keys(response) |> Enum.sort() == ["service", "status", "timestamp", "version"]
      assert {:ok, _datetime, 0} = DateTime.from_iso8601(timestamp)
    end
  end
end
