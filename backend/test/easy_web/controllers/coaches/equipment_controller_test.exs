defmodule EasyWeb.Coaches.EquipmentControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn}
  end

  describe "GET /v1/coach/equipment" do
    test "lists equipment alphabetically", %{conn: conn} do
      insert(:equipment, name: "Z Barbell")
      insert(:equipment, name: "A Dumbbell")

      conn = get(conn, "/v1/coach/equipment")
      assert %{"data" => data} = json_response(conn, 200)

      assert Enum.map(data, & &1["name"]) == ["A Dumbbell", "Z Barbell"]
    end

    test "filters equipment by search", %{conn: conn} do
      insert(:equipment, name: "Barbell")
      insert(:equipment, name: "Kettlebell")

      conn = get(conn, "/v1/coach/equipment", %{"search" => "kettle"})
      assert %{"data" => [item]} = json_response(conn, 200)

      assert item["name"] == "Kettlebell"
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> get("/v1/coach/equipment")
      assert json_response(conn, 403)
    end
  end
end
