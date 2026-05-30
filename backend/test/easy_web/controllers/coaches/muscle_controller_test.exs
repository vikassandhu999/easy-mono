defmodule EasyWeb.Coaches.MuscleControllerTest do
  use Easy.ConnCase

  setup do
    unique = Ecto.UUID.generate()

    business_owner =
      insert(:user, email: "muscle-endpoint-owner-#{unique}@test.com")

    business =
      insert(:business,
        name: "Muscle Endpoint Business #{unique}",
        handle: "muscle-endpoint-#{unique}",
        owner: business_owner
      )

    coach_user =
      insert(:user, email: "muscle-endpoint-coach-#{unique}@test.com")

    coach = insert(:coach, user: coach_user, business: business)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn}
  end

  describe "GET /v1/coach/muscles" do
    test "lists matching muscles alphabetically with the public response shape", %{conn: conn} do
      search = "muscle-list-#{Ecto.UUID.generate()}"

      insert(:muscle, name: "Zzz Traps #{search}", description: "Upper back")
      insert(:muscle, name: "Aaa Biceps #{search}", description: "Upper arm")
      insert(:muscle, name: "Mmm Delts #{search}", description: nil)
      insert(:muscle, name: "Outside Muscle #{Ecto.UUID.generate()}", description: "Not returned")

      conn = get(conn, "/v1/coach/muscles", %{"search" => search})
      assert %{"data" => data} = json_response(conn, 200)

      assert Enum.map(data, & &1["name"]) == [
               "Aaa Biceps #{search}",
               "Mmm Delts #{search}",
               "Zzz Traps #{search}"
             ]

      assert %{"id" => id, "name" => name, "description" => description} = hd(data)
      assert is_binary(id)
      assert name == "Aaa Biceps #{search}"
      assert description == "Upper arm"

      for muscle <- data do
        assert Map.keys(muscle) |> Enum.sort() == ["description", "id", "name"]
      end
    end

    test "trims search and matches muscles case-insensitively", %{conn: conn} do
      search = "muscle-search-#{Ecto.UUID.generate()}"

      insert(:muscle, name: "Anterior Deltoid #{search}", description: "Returned")
      insert(:muscle, name: "Posterior Chain #{Ecto.UUID.generate()}", description: "Ignored")

      conn = get(conn, "/v1/coach/muscles", %{"search" => "  #{String.upcase(search)}  "})
      assert %{"data" => data} = json_response(conn, 200)

      assert [%{"name" => name, "description" => description}] = data
      assert name == "Anterior Deltoid #{search}"
      assert description == "Returned"
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> get("/v1/coach/muscles")
      assert json_response(conn, 403)
    end
  end
end
