defmodule EasyWeb.Coaches.MuscleControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn}
  end

  describe "GET /v1/coach/muscles" do
    test "lists muscles alphabetically", %{conn: conn} do
      insert(:muscle, name: "ZZZ Traps Test")
      insert(:muscle, name: "AAA Biceps Test")

      conn = get(conn, "/v1/coach/muscles")
      assert %{"data" => data} = json_response(conn, 200)

      names = Enum.map(data, & &1["name"])
      assert "AAA Biceps Test" in names
      assert "ZZZ Traps Test" in names

      # Verify alphabetical ordering
      assert names == Enum.sort(names)
    end

    test "filters muscles by search", %{conn: conn} do
      insert(:muscle, name: "Xylophone Muscle")
      insert(:muscle, name: "Zeppelin Muscle")

      conn = get(conn, "/v1/coach/muscles", %{"search" => "xyloph"})
      assert %{"data" => data} = json_response(conn, 200)

      names = Enum.map(data, & &1["name"])
      assert "Xylophone Muscle" in names
      refute "Zeppelin Muscle" in names
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> get("/v1/coach/muscles")
      assert json_response(conn, 403)
    end
  end
end
