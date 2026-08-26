defmodule EasyWeb.HealthControllerTest do
  use Easy.ConnCase

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
