defmodule EasyWeb.NutritionWeekTest do
  use Easy.ConnCase, async: true
  alias Easy.DataCase
  alias Easy.Nutrition

  setup %{conn: conn} do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")

    {:ok, food} =
      Nutrition.create_food(DataCase.trainer_ctx(coach), %{
        name: "Oats",
        kind: :food,
        basis: :"100g",
        nutrients: %{energy_kcal: 100, protein_g: 10}
      })

    %{
      conn: authenticate_coach(conn, coach),
      coach: coach,
      client: client,
      food: food,
      base: "/v1/coach/clients/#{client.id}"
    }
  end

  @tag criticality: 9
  test "atomic meal addition, shared edit, removal and Undo use the new resource contract", f do
    # WHY: One dialog Save creates the complete meal and schedule or restores them together.
    body = %{
      preset: %{type: "meal", name: "Breakfast", options: [%{items: [%{food_id: f.food.id, amount: 50, unit: "g"}]}]},
      weekdays_mask: 127,
      time: "08:00"
    }

    added = f.conn |> post(f.base <> "/nutrition-schedules", body) |> json_response(201)
    assert added["data"]["weekdays_mask"] == 127
    assert added["data"]["time"] == "08:00"
    week = f.conn |> get(f.base <> "/nutrition-week") |> json_response(200)
    assert [preset] = week["data"]["presets"]
    assert preset["name"] == "Breakfast"
    assert [option] = preset["options"]

    assert option["totals"]["energy_kcal"] == %{
             "value" => 50.0,
             "known_entries" => 1,
             "total_entries" => 1,
             "incomplete" => false
           }

    assert option["totals"]["fat_g"]["value"] == nil
    assert hd(option["items"])["food"]["name"] == "Oats"
    changed = f.conn |> patch(f.base <> "/nutrition-presets/" <> preset["id"], %{name: "Brunch"}) |> json_response(200)
    assert changed["data"]["name"] == "Brunch"
    undone = f.conn |> post(f.base <> "/nutrition-undo", %{token: changed["undo_token"]}) |> json_response(200)
    assert hd(undone["data"]["presets"])["name"] == "Breakfast"

    removed =
      f.conn |> delete(f.base <> "/nutrition-schedules/" <> added["data"]["id"] <> "?weekday=1") |> json_response(200)

    assert hd(removed["data"]["schedules"])["weekdays_mask"] == 126
    restored = f.conn |> post(f.base <> "/nutrition-undo", %{token: removed["undo_token"]}) |> json_response(200)
    assert hd(restored["data"]["schedules"])["weekdays_mask"] == 127
  end

  @tag criticality: 9
  test "target dialog atomically saves edited sets and a new set for one day", f do
    # WHY: Each day must resolve to one complete set after a single Save.
    first =
      f.conn
      |> post(f.base <> "/nutrition-targets", %{
        name: "Training",
        targets: %{energy_kcal: %{min: 2000}},
        weekdays_mask: 127
      })
      |> json_response(201)

    assigned =
      f.conn
      |> put(f.base <> "/nutrition-target-days/1", %{
        nutrition_targets_id: nil,
        target_updates: [%{id: first["data"]["id"], name: "Training day", targets: %{protein_g: %{min: 160}}}],
        new_targets: %{name: "Rest", targets: %{energy_kcal: %{min: 1800, max: 1800}}}
      })
      |> json_response(200)

    assert length(assigned["data"]["nutrition_targets"]) == 2
    assert Enum.any?(assigned["data"]["target_schedules"], &(&1["weekdays_mask"] == 1))
    assert Enum.any?(assigned["data"]["target_schedules"], &(&1["weekdays_mask"] == 126))
    undone = f.conn |> post(f.base <> "/nutrition-undo", %{token: assigned["undo_token"]}) |> json_response(200)
    assert [target] = undone["data"]["nutrition_targets"]
    assert target["name"] == "Training"
    assert target["targets"] == %{"energy_kcal" => %{"min" => 2000}}
  end

  @tag criticality: 10
  test "invalid shapes and tenant-owned IDs fail without partial saves", f do
    # WHY: Invalid nested data must never create an empty meal or cross a tenant boundary.
    f.conn
    |> post(f.base <> "/nutrition-schedules", %{preset: %{type: "meal", name: "Bad", options: []}, weekdays_mask: 127})
    |> json_response(422)

    f.conn
    |> post(f.base <> "/nutrition-schedules", %{
      preset: %{type: "food", food_id: f.food.id, amount: 100, unit: "g"},
      weekdays_mask: 128
    })
    |> json_response(422)

    f.conn
    |> post(f.base <> "/nutrition-presets", %{type: "supplement", food_id: f.food.id, amount: 1, unit: "g"})
    |> json_response(422)

    f.conn
    |> post(f.base <> "/nutrition-presets", %{type: "food", food_id: f.food.id, amount: 1, unit: "invalid"})
    |> json_response(422)

    f.conn |> put(f.base <> "/nutrition-target-days/8", %{nutrition_targets_id: nil}) |> json_response(422)
    other = insert(:client)
    f.conn |> get("/v1/coach/clients/#{other.id}/nutrition-week") |> json_response(404)

    f.conn
    |> post("/v1/coach/clients/#{other.id}/nutrition-presets", %{
      type: "food",
      food_id: f.food.id,
      amount: 100,
      unit: "g"
    })
    |> json_response(404)

    f.conn
    |> post(f.base <> "/nutrition-presets", %{type: "food", food_id: insert(:food).id, amount: 100, unit: "g"})
    |> json_response(404)

    assert %{"data" => %{"presets" => [], "schedules" => []}} =
             f.conn |> get(f.base <> "/nutrition-week") |> json_response(200)
  end

  @tag criticality: 9
  test "food search, nutrient catalogue and editing preserve absent values", f do
    # WHY: The catalogue API must expose registered units and literal cursor-filtered results.
    created =
      f.conn
      |> post("/v1/coach/foods", %{
        name: "Vitamin D",
        kind: "supplement",
        basis: "1unit",
        unit_label: "capsule",
        nutrients: %{},
        servings: []
      })
      |> json_response(201)

    assert created["data"]["nutrients"] == %{}
    assert created["data"]["basis"] == "1unit"
    page = f.conn |> get("/v1/coach/foods?kind=supplement&search=Vitamin&cursor=start&limit=1") |> json_response(200)
    assert page["count"] == 1
    assert page["next_cursor"] == nil
    assert hd(page["data"])["name"] == "Vitamin D"

    updated =
      f.conn
      |> patch("/v1/coach/foods/" <> created["data"]["id"], %{nutrients: %{vitamin_d_ug: 50, energy_kcal: 0}})
      |> json_response(200)

    assert updated["data"]["nutrients"] == %{"vitamin_d_ug" => 50, "energy_kcal" => 0}
    f.conn |> patch("/v1/coach/foods/" <> created["data"]["id"], %{nutrients: %{unknown: 1}}) |> json_response(422)
    catalogue = f.conn |> get("/v1/coach/nutrients") |> json_response(200)
    assert Enum.any?(catalogue["data"], &(&1 == %{"code" => "vitamin_d_ug", "name" => "Vitamin D", "unit" => "µg"}))
    refute Map.has_key?(updated["data"], "business_id")
    f.conn |> get("/v1/coach/foods?cursor=invalid") |> json_response(422)
  end

  @tag criticality: 9
  test "known capsule mass can be prescribed in grams while its basis unit stays reserved", f do
    # WHY: A known conversion must preserve capsule nutrients without inventing an unknown gram mass.
    created =
      f.conn
      |> post("/v1/coach/foods", %{
        name: "Vitamin D capsule",
        kind: "supplement",
        basis: "1unit",
        unit_label: "capsule",
        nutrients: %{vitamin_d_ug: 50},
        servings: [%{label: "g", amount: 2}]
      })
      |> json_response(201)

    assert created["data"]["servings"] == [%{"label" => "g", "amount" => 2.0}]

    prescribed =
      f.conn
      |> post(f.base <> "/nutrition-presets", %{
        type: "supplement",
        food_id: created["data"]["id"],
        amount: 1,
        unit: "g"
      })
      |> json_response(201)

    assert prescribed["data"]["totals"]["vitamin_d_ug"] == %{
             "value" => 100.0,
             "known_entries" => 1,
             "total_entries" => 1,
             "incomplete" => false
           }

    assert prescribed["data"]["totals"]["energy_kcal"]["value"] == nil

    for label <- ["base", "unit", "capsule"] do
      f.conn
      |> post("/v1/coach/foods", %{
        name: "Ambiguous capsule",
        kind: "supplement",
        basis: "1unit",
        unit_label: "capsule",
        servings: [%{label: label, amount: 2}]
      })
      |> json_response(422)
    end
  end

  @tag criticality: 8
  test "a nullable meal name returns422 and retains the previous meal", f do
    # WHY: The meal editor must keep its saved content when a required name is cleared.
    created =
      f.conn
      |> post(f.base <> "/nutrition-presets", %{
        type: "meal",
        name: "Breakfast",
        options: [%{items: [%{food_id: f.food.id, amount: 100, unit: "g"}]}]
      })
      |> json_response(201)

    f.conn |> patch(f.base <> "/nutrition-presets/" <> created["data"]["id"], %{name: nil}) |> json_response(422)
    week = f.conn |> get(f.base <> "/nutrition-week") |> json_response(200)
    assert [meal] = week["data"]["presets"]
    assert meal["name"] == "Breakfast"
  end
end
