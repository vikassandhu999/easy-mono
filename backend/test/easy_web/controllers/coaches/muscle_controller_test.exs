defmodule EasyWeb.Coaches.MuscleControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn}
  end

  describe "GET /v1/coach/muscles" do
    test "lists muscles alphabetically", %{conn: conn} do
      insert(:muscle, name: "Z Traps")
      insert(:muscle, name: "A Biceps")

      conn = get(conn, "/v1/coach/muscles")
      assert %{"data" => data} = json_response(conn, 200)

      assert Enum.map(data, & &1["name"]) == ["A Biceps", "Z Traps"]
    end

    test "filters muscles by search", %{conn: conn} do
      insert(:muscle, name: "Hamstrings")
      insert(:muscle, name: "Quadriceps")

      conn = get(conn, "/v1/coach/muscles", %{"search" => "ham"})
      assert %{"data" => [muscle]} = json_response(conn, 200)

      assert muscle["name"] == "Hamstrings"
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> get("/v1/coach/muscles")
      assert json_response(conn, 403)
    end
  end
end
