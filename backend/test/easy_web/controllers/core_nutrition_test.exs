defmodule EasyWeb.CoreNutritionTest do
  alias Easy.Nutrition.Content
  use Easy.ConnCase, async: true

  setup %{conn: conn} do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")

    %{
      coach: coach,
      client: client,
      coach_conn: authenticate_coach(conn, coach),
      client_conn: authenticate_client(conn, client)
    }
  end

  test "typed food maps preserve unknown and serving ids, whole template saves and assigns", f do
    food =
      json_response(
        post(f.coach_conn, "/v1/coach/nutrition-foods", %{
          name: "Oats",
          nutrients: %{energy_kcal: 100, sugar_g: 0},
          servings: [%{id: "bowl", label: "Bowl", grams: 50}]
        }),
        201
      )["data"]

    assert food["nutrients"] == %{"energy_kcal" => 100, "sugar_g" => 0}
    refute Map.has_key?(food, "calories_per_100g")
    content = Content.empty()

    template =
      json_response(post(f.coach_conn, "/v1/coach/nutrition-plans", %{name: "Menu", content: content}), 201)["data"]

    assert template["content"]["targets"] == %{}

    plan =
      json_response(
        post(f.coach_conn, "/v1/coach/clients/#{f.client.id}/nutrition-plans/#{template["id"]}/assign", %{
          start_date: Date.to_iso8601(Date.utc_today())
        }),
        201
      )["data"]

    assert plan["current_revision"]["number"] == 1

    assert json_response(get(f.client_conn, "/v1/client/nutrition-plans/#{plan["id"]}"), 200)["data"]["id"] ==
             plan["id"]
  end

  test "typed meal save returns unknown totals, shares note once and references the meal", f do
    date = Date.to_iso8601(Date.utc_today())

    meal = %{
      id: Ecto.UUID.generate(),
      request_id: Ecto.UUID.generate(),
      expected_revision: 0,
      plan_revision_id: nil,
      slot_id: nil,
      name: "Evening snack",
      chosen_meal_id: nil,
      share: true,
      note_to_coach: "Felt good",
      entries: [
        %{
          id: Ecto.UUID.generate(),
          request_id: Ecto.UUID.generate(),
          planned_item_id: nil,
          source: nil,
          portion: nil,
          name: "Quick add",
          nutrients: %{energy_kcal: 90}
        }
      ]
    }

    day = json_response(patch(f.client_conn, "/v1/client/nutrition-days/#{date}", %{meals: [meal]}), 200)["data"]
    assert day["totals"]["energy_kcal"]["value"] == 90
    assert day["totals"]["fiber_g"] == %{"value" => nil, "known_entries" => 0, "total_entries" => 1}
    assert hd(day["extra_meals"])["request_id"] == meal.request_id

    assert json_response(patch(f.client_conn, "/v1/client/nutrition-days/#{date}", %{meals: [meal]}), 200)["data"] ==
             day

    ctx = %Easy.Ctx{business_id: f.coach.business_id, client_id: f.client.id, user_id: f.client.user_id}

    assert {:ok, %{type: "meal", snapshot: %{"title" => "Evening snack"}}} =
             Easy.ChatRecordReferences.reference(ctx, f.client.id, %{type: "meal", id: meal.id, revision: 1})

    messages = Easy.Repo.all(Easy.Chat.Message)
    assert Enum.map(messages, & &1.body) == ["Felt good"]
    assert hd(messages).embed_snapshot["title"] == "Evening snack"

    assert [_] =
             json_response(get(f.coach_conn, "/v1/coach/clients/#{f.client.id}/nutrition-days", %{date: date}), 200)[
               "data"
             ]
  end

  test "gate denies ended-client writes and tenant boundaries reject foreign resources", f do
    food =
      json_response(
        post(f.coach_conn, "/v1/coach/nutrition-foods", %{name: "Owned", nutrients: %{energy_kcal: 0}}),
        201
      )["data"]

    other = authenticate_coach(build_conn(), insert(:coach))
    assert response(get(other, "/v1/coach/nutrition-foods/#{food["id"]}"), 404)
    assert response(get(other, "/v1/coach/clients/#{f.client.id}/nutrition-days"), 404)

    assert response(
             post(f.coach_conn, "/v1/coach/nutrition-foods", %{name: "Invalid", nutrients: %{fiber_g: nil}}),
             422
           )

    Easy.Repo.query!("UPDATE coaching_terms SET ends_on=$1 WHERE client_id=$2", [
      Date.add(Date.utc_today(), -1),
      Ecto.UUID.dump!(f.client.id)
    ])

    assert response(patch(f.client_conn, "/v1/client/nutrition-days/#{Date.utc_today()}", %{meals: []}), 403)
    assert response(get(f.client_conn, "/v1/client/nutrition-days"), 200)
  end
end
