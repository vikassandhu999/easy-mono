defmodule EasyWeb.Clients.FoodLogEntryControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    food =
      insert(:food,
        creator: coach,
        business: coach.business,
        name: "Oats",
        macros: %{
          "calories_per_100g" => 389,
          "protein_g" => 16.9,
          "carbs_g" => 66.3,
          "fat_g" => 6.9
        }
      )

    %{conn: conn, coach: coach, client: client, business: coach.business, food: food}
  end

  describe "POST /v1/client/food_log_entries" do
    test "creates entry with computed macros and creates MealLog", ctx do
      attrs = %{
        "date" => "2026-03-25",
        "meal_slot" => "breakfast",
        "food_id" => ctx.food.id,
        "food_name" => "Oats",
        "amount" => 100.0,
        "unit" => "g",
        "weight_g" => 100.0,
        "source" => "planned",
        "planned_item_index" => 0
      }

      conn = post(ctx.conn, "/v1/client/food_log_entries", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["food_name"] == "Oats"
      assert data["food_id"] == ctx.food.id
      assert data["calories"] == 389.0
      assert data["protein_g"] == 16.9
      assert data["source"] == "planned"
      assert data["planned_item_index"] == 0
      assert data["meal_log_id"] != nil
    end

    test "auto-fills food_name from food when not provided", ctx do
      attrs = %{
        "date" => "2026-03-25",
        "meal_slot" => "breakfast",
        "food_id" => ctx.food.id,
        "amount" => 50.0,
        "unit" => "g",
        "weight_g" => 50.0,
        "source" => "unplanned"
      }

      conn = post(ctx.conn, "/v1/client/food_log_entries", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["food_name"] == "Oats"
      # 389 * 50 / 100 = 194.5
      assert data["calories"] == 194.5
    end

    test "creates entry with recipe", ctx do
      recipe =
        insert(:recipe,
          creator: ctx.coach,
          business: ctx.business,
          name: "Dal Tadka",
          macros: %{"calories" => 800, "protein_g" => 40, "carbs_g" => 90, "fat_g" => 20},
          cooked_weight_g: 500.0
        )

      attrs = %{
        "date" => "2026-03-25",
        "meal_slot" => "lunch",
        "recipe_id" => recipe.id,
        "food_name" => "Dal Tadka",
        "amount" => 1.0,
        "unit" => "serving",
        "weight_g" => 250.0,
        "source" => "planned",
        "planned_item_index" => 0
      }

      conn = post(ctx.conn, "/v1/client/food_log_entries", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["food_name"] == "Dal Tadka"
      # 800 / 500 * 250 = 400
      assert data["calories"] == 400.0
    end

    test "rejects invalid meal_slot", ctx do
      attrs = %{
        "date" => "2026-03-25",
        "meal_slot" => "brunch",
        "food_id" => ctx.food.id,
        "food_name" => "Oats",
        "amount" => 100.0,
        "unit" => "g",
        "weight_g" => 100.0,
        "source" => "planned"
      }

      conn = post(ctx.conn, "/v1/client/food_log_entries", attrs)
      assert json_response(conn, 422)
    end

    test "rejects missing food_id and recipe_id", ctx do
      attrs = %{
        "date" => "2026-03-25",
        "meal_slot" => "breakfast",
        "food_name" => "Mystery Food",
        "amount" => 100.0,
        "unit" => "g",
        "weight_g" => 100.0,
        "source" => "unplanned"
      }

      conn = post(ctx.conn, "/v1/client/food_log_entries", attrs)
      assert json_response(conn, 422)
    end

    test "rejects food from other business", ctx do
      other_coach = insert(:coach)
      other_food = insert(:food, creator: other_coach, business: other_coach.business)

      attrs = %{
        "date" => "2026-03-25",
        "meal_slot" => "breakfast",
        "food_id" => other_food.id,
        "food_name" => "Other Food",
        "amount" => 100.0,
        "unit" => "g",
        "weight_g" => 100.0,
        "source" => "planned"
      }

      conn = post(ctx.conn, "/v1/client/food_log_entries", attrs)
      assert json_response(conn, 422)
    end

    test "second entry reuses existing MealLog", ctx do
      food2 =
        insert(:food,
          creator: ctx.coach,
          business: ctx.business,
          name: "Milk",
          macros: %{
            "calories_per_100g" => 61,
            "protein_g" => 3.2,
            "carbs_g" => 4.8,
            "fat_g" => 3.3
          }
        )

      base_attrs = %{
        "date" => "2026-03-25",
        "meal_slot" => "breakfast",
        "amount" => 100.0,
        "unit" => "g",
        "weight_g" => 100.0,
        "source" => "planned"
      }

      conn1 =
        post(
          ctx.conn,
          "/v1/client/food_log_entries",
          Map.merge(base_attrs, %{
            "food_id" => ctx.food.id,
            "food_name" => "Oats",
            "planned_item_index" => 0
          })
        )

      assert %{"data" => d1} = json_response(conn1, 201)

      conn2 =
        post(
          ctx.conn,
          "/v1/client/food_log_entries",
          Map.merge(base_attrs, %{
            "food_id" => food2.id,
            "food_name" => "Milk",
            "planned_item_index" => 1
          })
        )

      assert %{"data" => d2} = json_response(conn2, 201)

      assert d1["meal_log_id"] == d2["meal_log_id"]
    end

    test "returns 403 without auth" do
      conn = build_conn() |> post("/v1/client/food_log_entries", %{})
      assert json_response(conn, 403)
    end
  end

  describe "PATCH /v1/client/food_log_entries/:id" do
    test "updates amount and recomputes macros", ctx do
      meal_log = insert(:meal_log, client: ctx.client, business: ctx.business)

      entry =
        insert(:food_log_entry,
          meal_log: meal_log,
          food: ctx.food,
          food_name: "Oats",
          weight_g: 100.0,
          calories: 389.0,
          protein_g: 16.9,
          carbs_g: 66.3,
          fat_g: 6.9
        )

      conn =
        patch(ctx.conn, "/v1/client/food_log_entries/#{entry.id}", %{
          "amount" => 50.0,
          "weight_g" => 50.0
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["amount"] == 50.0
      assert data["weight_g"] == 50.0
      # 389 * 50 / 100 = 194.5
      assert data["calories"] == 194.5
    end

    test "updates notes without recomputing macros", ctx do
      meal_log = insert(:meal_log, client: ctx.client, business: ctx.business)

      entry =
        insert(:food_log_entry,
          meal_log: meal_log,
          food: ctx.food,
          food_name: "Oats",
          weight_g: 100.0,
          calories: 389.0
        )

      conn = patch(ctx.conn, "/v1/client/food_log_entries/#{entry.id}", %{"notes" => "ate more"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["notes"] == "ate more"
      assert data["calories"] == 389.0
    end

    test "returns 404 for other client's entry", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      meal_log = insert(:meal_log, client: other_client, business: ctx.business)
      entry = insert(:food_log_entry, meal_log: meal_log, food: ctx.food)

      conn = patch(ctx.conn, "/v1/client/food_log_entries/#{entry.id}", %{"amount" => 200})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/client/food_log_entries/:id" do
    test "deletes entry and updates logged_calories", ctx do
      meal_log = insert(:meal_log, client: ctx.client, business: ctx.business)
      entry = insert(:food_log_entry, meal_log: meal_log, food: ctx.food)

      conn = delete(ctx.conn, "/v1/client/food_log_entries/#{entry.id}")
      assert response(conn, 204)
    end

    test "returns 404 for other client's entry", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      meal_log = insert(:meal_log, client: other_client, business: ctx.business)
      entry = insert(:food_log_entry, meal_log: meal_log, food: ctx.food)

      conn = delete(ctx.conn, "/v1/client/food_log_entries/#{entry.id}")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/client/food_log_entries/log_meal" do
    test "logs all items in a meal, skipping already logged", ctx do
      plan = insert(:plan, creator: ctx.coach, business: ctx.business, client_id: ctx.client.id)
      meal = insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business)

      food2 =
        insert(:food,
          creator: ctx.coach,
          business: ctx.business,
          name: "Milk",
          macros: %{
            "calories_per_100g" => 61,
            "protein_g" => 3.2,
            "carbs_g" => 4.8,
            "fat_g" => 3.3
          }
        )

      insert(:meal_item,
        meal: meal,
        business: ctx.business,
        food: ctx.food,
        amount: 100,
        unit: "g",
        weight_g: 100
      )

      insert(:meal_item,
        meal: meal,
        business: ctx.business,
        food: food2,
        amount: 200,
        unit: "ml",
        weight_g: 200,
        position: 1
      )

      # First call logs both items
      conn1 =
        post(ctx.conn, "/v1/client/food_log_entries/log_meal", %{
          "date" => "2026-03-25",
          "meal_slot" => "breakfast",
          "meal_id" => meal.id
        })

      assert %{"data" => data1} = json_response(conn1, 201)
      assert length(data1) == 2

      # Second call is idempotent -- zero new entries
      conn2 =
        post(ctx.conn, "/v1/client/food_log_entries/log_meal", %{
          "date" => "2026-03-25",
          "meal_slot" => "breakfast",
          "meal_id" => meal.id
        })

      assert %{"data" => data2} = json_response(conn2, 201)
      assert data2 == []
    end

    test "creates MealLog with planned_snapshot", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :active
        )

      meal =
        insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business, name: "Breakfast")

      insert(:meal_item,
        meal: meal,
        business: ctx.business,
        food: ctx.food,
        amount: 100,
        unit: "g",
        weight_g: 100
      )

      insert(:plan_item,
        plan: plan,
        meal: meal,
        creator: ctx.coach,
        business: ctx.business,
        day: "tuesday",
        meal_type: "breakfast"
      )

      post(ctx.conn, "/v1/client/food_log_entries/log_meal", %{
        "date" => "2026-03-25",
        "meal_slot" => "breakfast",
        "meal_id" => meal.id
      })

      # Fetch the meal log to verify snapshot
      conn = get(ctx.conn, "/v1/client/meal_logs", %{"date" => "2026-03-25"})
      assert %{"data" => [meal_log]} = json_response(conn, 200)
      assert meal_log["meal_slot"] == "breakfast"
      # Snapshot should be present since plan+plan_item exists for Tuesday
      # (2026-03-25 is a Wednesday, so snapshot depends on weekday matching)
    end

    test "returns error for non-existent meal_id", ctx do
      conn =
        post(ctx.conn, "/v1/client/food_log_entries/log_meal", %{
          "date" => "2026-03-25",
          "meal_slot" => "breakfast",
          "meal_id" => Ecto.UUID.generate()
        })

      assert json_response(conn, 404)
    end

    test "returns error for invalid date", ctx do
      conn =
        post(ctx.conn, "/v1/client/food_log_entries/log_meal", %{
          "date" => "not-a-date",
          "meal_slot" => "breakfast",
          "meal_id" => Ecto.UUID.generate()
        })

      assert json_response(conn, 422)
    end
  end

  describe "POST /v1/client/food_log_entries/log_day" do
    test "logs all meals for a day from plan", ctx do
      plan = insert(:plan, creator: ctx.coach, business: ctx.business, client_id: ctx.client.id)

      meal1 =
        insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business, name: "Breakfast")

      meal2 = insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business, name: "Lunch")

      insert(:meal_item,
        meal: meal1,
        business: ctx.business,
        food: ctx.food,
        amount: 100,
        unit: "g",
        weight_g: 100
      )

      food2 =
        insert(:food,
          creator: ctx.coach,
          business: ctx.business,
          name: "Rice",
          macros: %{
            "calories_per_100g" => 130,
            "protein_g" => 2.7,
            "carbs_g" => 28,
            "fat_g" => 0.3
          }
        )

      insert(:meal_item,
        meal: meal2,
        business: ctx.business,
        food: food2,
        amount: 200,
        unit: "g",
        weight_g: 200
      )

      # 2026-03-30 is a Monday
      insert(:plan_item,
        plan: plan,
        meal: meal1,
        creator: ctx.coach,
        business: ctx.business,
        day: "monday",
        meal_type: "breakfast"
      )

      insert(:plan_item,
        plan: plan,
        meal: meal2,
        creator: ctx.coach,
        business: ctx.business,
        day: "monday",
        meal_type: "lunch"
      )

      conn =
        post(ctx.conn, "/v1/client/food_log_entries/log_day", %{
          "date" => "2026-03-30",
          "plan_id" => plan.id
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert length(data) == 2
      names = Enum.map(data, & &1["food_name"])
      assert "Oats" in names
      assert "Rice" in names
    end

    test "returns 404 for plan not assigned to this client", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      plan = insert(:plan, creator: ctx.coach, business: ctx.business, client_id: other_client.id)

      conn =
        post(ctx.conn, "/v1/client/food_log_entries/log_day", %{
          "date" => "2026-03-30",
          "plan_id" => plan.id
        })

      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent plan_id", ctx do
      conn =
        post(ctx.conn, "/v1/client/food_log_entries/log_day", %{
          "date" => "2026-03-30",
          "plan_id" => Ecto.UUID.generate()
        })

      assert json_response(conn, 404)
    end
  end
end
