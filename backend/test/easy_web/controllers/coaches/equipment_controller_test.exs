defmodule EasyWeb.Coaches.EquipmentControllerTest do
  use Easy.ConnCase

  setup do
    unique = Ecto.UUID.generate()

    business_owner =
      insert(:user, email: "equipment-endpoint-owner-#{unique}@test.com")

    business =
      insert(:business,
        name: "Equipment Endpoint Business #{unique}",
        handle: "equipment-endpoint-#{unique}",
        owner: business_owner
      )

    coach_user =
      insert(:user, email: "equipment-endpoint-coach-#{unique}@test.com")

    coach = insert(:coach, user: coach_user, business: business)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn}
  end

  describe "GET /v1/coach/equipment" do
    test "lists matching equipment alphabetically with the public response shape", %{conn: conn} do
      search = "equipment-list-#{Ecto.UUID.generate()}"

      insert(:equipment, name: "Zzz Barbell #{search}", description: "Straight bar")
      insert(:equipment, name: "Aaa Dumbbell #{search}", description: "Single hand weight")
      insert(:equipment, name: "Mmm Cable #{search}", description: nil)
      insert(:equipment, name: "Outside Equipment #{Ecto.UUID.generate()}", description: "Not returned")

      conn = get(conn, "/v1/coach/equipment", %{"search" => search})
      assert %{"data" => data} = json_response(conn, 200)

      assert Enum.map(data, & &1["name"]) == [
               "Aaa Dumbbell #{search}",
               "Mmm Cable #{search}",
               "Zzz Barbell #{search}"
             ]

      assert %{"id" => id, "name" => name, "description" => description} = hd(data)
      assert is_binary(id)
      assert name == "Aaa Dumbbell #{search}"
      assert description == "Single hand weight"

      for item <- data do
        assert Map.keys(item) |> Enum.sort() == ["description", "id", "name"]
      end
    end

    test "trims search and matches equipment case-insensitively", %{conn: conn} do
      search = "equipment-search-#{Ecto.UUID.generate()}"

      insert(:equipment, name: "Cable Tower #{search}", description: "Returned")
      insert(:equipment, name: "Incline Bench #{Ecto.UUID.generate()}", description: "Ignored")

      conn = get(conn, "/v1/coach/equipment", %{"search" => "  #{String.upcase(search)}  "})
      assert %{"data" => data} = json_response(conn, 200)

      assert [%{"name" => name, "description" => description}] = data
      assert name == "Cable Tower #{search}"
      assert description == "Returned"
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> get("/v1/coach/equipment")
      assert json_response(conn, 403)
    end
  end
end
