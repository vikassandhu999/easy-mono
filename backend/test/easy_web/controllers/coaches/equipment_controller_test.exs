defmodule EasyWeb.Coaches.EquipmentControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn}
  end

  describe "GET /v1/coach/equipment" do
    test "lists equipment alphabetically", %{conn: conn} do
      insert(:equipment, name: "ZZZ Barbell Test")
      insert(:equipment, name: "AAA Dumbbell Test")

      conn = get(conn, "/v1/coach/equipment")
      assert %{"data" => data} = json_response(conn, 200)

      names = Enum.map(data, & &1["name"])
      assert "AAA Dumbbell Test" in names
      assert "ZZZ Barbell Test" in names

      # Verify alphabetical ordering
      assert names == Enum.sort(names)
    end

    test "filters equipment by search", %{conn: conn} do
      insert(:equipment, name: "Xylophone Rack")
      insert(:equipment, name: "Zeppelin Bench")

      conn = get(conn, "/v1/coach/equipment", %{"search" => "xyloph"})
      assert %{"data" => data} = json_response(conn, 200)

      names = Enum.map(data, & &1["name"])
      assert "Xylophone Rack" in names
      refute "Zeppelin Bench" in names
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> get("/v1/coach/equipment")
      assert json_response(conn, 403)
    end
  end
end
