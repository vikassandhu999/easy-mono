defmodule EasyWeb.Coaches.NutritionMenuControllerTest do
  use Easy.ConnCase

  alias Easy.Nutrition.Plan
  alias Easy.Repo

  describe "PUT /v1/coach/nutrition-plans/:id/menu" do
    test "rejects an incomplete nested portion variant", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)
      plan = create_template(conn)

      body =
        menu(plan, [
          %{
            "id" => Ecto.UUID.generate(),
            "name" => "Breakfast",
            "meal_items" => [
              %{
                "id" => Ecto.UUID.generate(),
                "kind" => "food",
                "food_id" => Ecto.UUID.generate(),
                "portion" => %{"kind" => "gram"}
              }
            ]
          }
        ])

      assert %{"error_code" => "invalid_input", "error_detail" => %{"fields" => fields}} =
               conn
               |> put(path(plan), %{"expected_revision" => 1, "menu" => body})
               |> json_response(422)

      assert fields["menu.meals.0.meal_items.0.portion"] == ["is invalid"]
    end

    test "saves the menu returned by a read unchanged", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)
      plan = create_template(conn)

      response =
        conn
        |> recycle()
        |> authenticate_coach(coach)
        |> put(path(plan), %{"expected_revision" => plan["revision"], "menu" => plan["menu"]})
        |> json_response(200)

      assert %{"data" => saved} = response
      assert saved["menu"] == plan["menu"]
      assert saved["revision"] == plan["revision"] + 1
    end

    test "keeps submitted node ids and array order while recalculating nutrients", %{conn: conn} do
      coach = insert(:coach)

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          calories_per_100g: 33.333,
          protein_g_per_100g: 20.0,
          carbs_g_per_100g: 10.0,
          fat_g_per_100g: 1.0,
          fiber_g_per_100g: 0.0
        )

      conn = authenticate_coach(conn, coach)
      plan = create_template(conn)
      breakfast_id = Ecto.UUID.generate()
      dinner_id = Ecto.UUID.generate()
      item_id = Ecto.UUID.generate()

      menu =
        menu(
          plan,
          [
            %{"id" => dinner_id, "name" => "Dinner", "meal_items" => []},
            %{
              "id" => breakfast_id,
              "name" => "Breakfast",
              "nutrients" => claimed_nutrients(),
              "meal_items" => [
                %{
                  "id" => item_id,
                  "kind" => "food",
                  "food_id" => food.id,
                  "portion" => %{"kind" => "gram", "grams" => 50},
                  "nutrients" => claimed_nutrients()
                }
              ]
            }
          ],
          [
            %{
              "meal_slot" => "breakfast",
              "meal_ids" => [breakfast_id]
            }
          ]
        )

      assert %{"data" => saved} =
               conn
               |> recycle()
               |> authenticate_coach(coach)
               |> put(path(plan), %{"expected_revision" => plan["revision"], "menu" => menu})
               |> json_response(200)

      assert [%{"id" => ^dinner_id}, %{"id" => ^breakfast_id, "meal_items" => [%{"id" => ^item_id}]}] =
               saved["menu"]["meals"]

      assert [%{"meal_slot" => "breakfast", "meal_ids" => [^breakfast_id]}] =
               saved["menu"]["day_patterns"] |> hd() |> Map.fetch!("slots")

      assert saved["menu"]["meals"] |> Enum.at(1) |> Map.fetch!("nutrients") |> Map.fetch!("calories") == 16.7
    end

    test "rejects stale saves and scopes node identity to each menu", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)
      first_plan = create_template(conn)
      second_plan = create_template(conn)
      meal_id = Ecto.UUID.generate()
      first_menu = menu(first_plan, [%{"id" => meal_id, "name" => "First", "meal_items" => []}])

      assert %{"data" => %{"revision" => 2}} =
               conn
               |> recycle()
               |> authenticate_coach(coach)
               |> put(path(first_plan), %{"expected_revision" => 1, "menu" => first_menu})
               |> json_response(200)

      stale =
        conn
        |> recycle()
        |> authenticate_coach(coach)
        |> put(path(first_plan), %{"expected_revision" => 1, "menu" => first_menu})
        |> json_response(409)

      assert %{"error_code" => "stale_revision"} = stale
      copied_menu = menu(second_plan, [%{"id" => meal_id, "name" => "Independent", "meal_items" => []}])

      assert %{"data" => %{"revision" => 2}} =
               conn
               |> recycle()
               |> authenticate_coach(coach)
               |> put(path(second_plan), %{"expected_revision" => 1, "menu" => copied_menu})
               |> json_response(200)

      assert Repo.get!(Plan, first_plan["id"]).revision == 2
      assert hd(Repo.get!(Plan, first_plan["id"]).menu.meals).name == "First"
      assert hd(Repo.get!(Plan, second_plan["id"]).menu.meals).name == "Independent"
    end

    test "rejects duplicate node ids and deletes nodes omitted from a replacement", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)
      plan = create_template(conn)
      duplicate_id = Ecto.UUID.generate()

      assert %{"error_code" => "invalid_input"} =
               conn
               |> put(
                 path(plan),
                 %{
                   "expected_revision" => 1,
                   "menu" =>
                     menu(plan, [
                       %{"id" => duplicate_id, "name" => "One", "meal_items" => []},
                       %{"id" => duplicate_id, "name" => "Two", "meal_items" => []}
                     ])
                 }
               )
               |> json_response(422)

      kept_id = Ecto.UUID.generate()
      dropped_id = Ecto.UUID.generate()

      assert %{"data" => created} =
               conn
               |> recycle()
               |> authenticate_coach(coach)
               |> put(
                 path(plan),
                 %{
                   "expected_revision" => 1,
                   "menu" =>
                     menu(plan, [
                       %{"id" => kept_id, "name" => "Kept", "meal_items" => []},
                       %{"id" => dropped_id, "name" => "Dropped", "meal_items" => []}
                     ])
                 }
               )
               |> json_response(200)

      assert %{"data" => %{"menu" => %{"meals" => [%{"id" => ^kept_id}]}}} =
               conn
               |> recycle()
               |> authenticate_coach(coach)
               |> put(path(created), %{"expected_revision" => 2, "menu" => menu(created, [hd(created["menu"]["meals"])])})
               |> json_response(200)

      refute Enum.any?(Repo.get!(Plan, plan["id"]).menu.meals, &(&1.id == dropped_id))
    end

    test "a node UUID from another tenant grants no access to its source", %{conn: conn} do
      coach = insert(:coach)
      other = insert(:coach)
      other_conn = authenticate_coach(conn, other)
      source = create_template(other_conn)
      foreign_meal_id = Ecto.UUID.generate()

      assert %{"data" => _saved} =
               other_conn
               |> recycle()
               |> authenticate_coach(other)
               |> put(
                 path(source),
                 %{
                   "expected_revision" => 1,
                   "menu" => menu(source, [%{"id" => foreign_meal_id, "name" => "Foreign", "meal_items" => []}])
                 }
               )
               |> json_response(200)

      conn = authenticate_coach(conn, coach)
      target = create_template(conn)

      assert %{"data" => %{"revision" => 2}} =
               conn
               |> recycle()
               |> authenticate_coach(coach)
               |> put(
                 path(target),
                 %{
                   "expected_revision" => 1,
                   "menu" => menu(target, [%{"id" => foreign_meal_id, "name" => "Foreign", "meal_items" => []}])
                 }
               )
               |> json_response(200)

      assert Repo.get!(Plan, target["id"]).revision == 2
      assert hd(Repo.get!(Plan, source["id"]).menu.meals).id == foreign_meal_id
      assert hd(Repo.get!(Plan, target["id"]).menu.meals).id == foreign_meal_id
      conn |> recycle() |> authenticate_coach(coach) |> get("/v1/coach/nutrition-plans/#{source["id"]}") |> json_response(404)
    end

    test "returns invalid input for malformed food and recipe ids", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)
      plan = create_template(conn)

      for {kind, source_key} <- [{"food", "food_id"}, {"recipe", "recipe_id"}] do
        item = %{
          "id" => Ecto.UUID.generate(),
          "kind" => kind,
          source_key => "not-a-uuid",
          "portion" => %{"kind" => "gram", "grams" => 50}
        }

        assert %{"error_code" => "invalid_input"} =
                 conn
                 |> recycle()
                 |> authenticate_coach(coach)
                 |> put(
                   path(plan),
                   %{
                     "expected_revision" => 1,
                     "menu" => menu(plan, [%{"id" => Ecto.UUID.generate(), "name" => "Meal", "meal_items" => [item]}])
                   }
                 )
                 |> json_response(422)
      end
    end

    test "conceals a menu owned by another business", %{conn: conn} do
      coach = insert(:coach)
      other = insert(:coach)
      hidden = insert(:plan, business: other.business, creator: other.user)

      pattern_id = Ecto.UUID.generate()

      menu = %{
        "meals" => [],
        "day_patterns" => [%{"id" => pattern_id, "name" => "Everyday", "slots" => []}],
        "schedule" => Map.new(~w(monday tuesday wednesday thursday friday saturday sunday), &{&1, pattern_id})
      }

      assert %{"error_code" => "not_found"} =
               conn
               |> authenticate_coach(coach)
               |> put(path(hidden), %{"expected_revision" => 1, "menu" => menu})
               |> json_response(404)
    end
  end

  defp menu(plan, meals, slots \\ []) do
    pattern = hd(plan["menu"]["day_patterns"])

    %{
      "meals" => meals,
      "day_patterns" => [%{"id" => pattern["id"], "name" => pattern["name"], "slots" => slots}],
      "schedule" => Map.new(~w(monday tuesday wednesday thursday friday saturday sunday), &{&1, pattern["id"]})
    }
  end

  defp create_template(conn) do
    conn
    |> post("/v1/coach/nutrition-plans", %{"name" => "Template"})
    |> json_response(201)
    |> Map.fetch!("data")
  end

  defp path(%{"id" => id}), do: "/v1/coach/nutrition-plans/#{id}/menu"
  defp path(plan), do: "/v1/coach/nutrition-plans/#{plan.id}/menu"

  defp claimed_nutrients do
    %{
      "calories" => 999_999,
      "protein" => 999_999,
      "carbohydrates" => 999_999,
      "fat" => 999_999,
      "fiber" => 999_999,
      "complete" => true
    }
  end
end
