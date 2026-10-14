defmodule EasyWeb.Clients.LoggingTest do
  use Easy.ConnCase, async: true
  alias Easy.{DataCase, Nutrition, Repo, Workouts}

  setup %{conn: conn} do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    ctx = DataCase.trainer_ctx(coach)
    food_attrs = %{name: "Oats", kind: :food, basis: :"100g", nutrients: %{energy_kcal: 100, protein_g: 10}}
    {:ok, food} = Nutrition.create_food(ctx, food_attrs)

    {:ok, %{data: meal}} =
      Nutrition.add_schedule_for_client(ctx, client.id, %{
        preset: %{type: :meal, name: "Breakfast", options: [%{name: "Oats", items: [%{food_id: food.id, amount: 50, unit: "g"}]}]},
        weekdays_mask: 127,
        time: "08:00"
      })

    {:ok, week} = Nutrition.read_week_for_client(ctx, client.id)
    [preset] = week.presets
    [option] = preset.options
    {:ok, %{data: _}} = Nutrition.create_targets_for_client(ctx, client.id, %{name: "Training", targets: %{energy_kcal: %{min: 2000}}, weekdays_mask: 127})
    exercise = insert(:exercise, business: coach.business, name: "Squat logging fixture")

    {:ok, %{data: workout}} =
      Workouts.create_workout_for_client(ctx, client.id, %{
        name: "Lower A",
        groups: [%{rounds: 2, exercises: [%{exercise_id: exercise.id, targets: [%{reps: %{mode: "exact", value: 5}, weight: %{mode: "exact", value: 80}}]}]}]
      })

    {:ok, %{data: schedule}} = Workouts.add_schedule_for_client(ctx, client.id, %{workout_id: workout.id, weekdays_mask: 127, time: "07:00"})

    %{
      conn: authenticate_client(conn, client),
      coach: coach,
      client: client,
      ctx: ctx,
      food: food,
      meal: meal,
      preset: preset,
      option: option,
      exercise: exercise,
      workout: workout,
      schedule: schedule,
      today: Date.utc_today()
    }
  end

  @tag criticality: 9
  test "day returns resolved complete prescriptions and week markers without claiming a record", f do
    # WHY: A plan without consumption must remain Not recorded, with independent targets.
    day = f.conn |> get("/v1/client/days/#{f.today}") |> json_response(200)
    assert day["data"]["date"] == Date.to_iso8601(f.today)
    assert day["data"]["today"] == Date.to_iso8601(f.today)
    assert day["data"]["target_set"]["name"] == "Training"
    assert [%{"name" => "Breakfast", "options" => [%{"items" => [%{"food" => %{"name" => "Oats"}}]}]}] = day["data"]["presets"]
    assert [workout] = day["data"]["workouts"]
    assert workout["name"] == "Lower A"
    assert [exercise] = hd(workout["groups"])["exercises"]
    assert exercise["exercise"]["name"] == "Squat logging fixture"
    assert exercise["targets"] == [%{"reps" => %{"mode" => "exact", "value" => 5}, "weight" => %{"mode" => "exact", "value" => 80}}]
    assert day["data"]["nutrition_logs"] == []
    assert day["data"]["workout_logs"] == []
    refute Map.has_key?(day["data"], "business_id")
    markers = f.conn |> get("/v1/client/week-markers?from=#{f.today}") |> json_response(200)
    assert length(markers["data"]) == 7
    assert Enum.all?(markers["data"], &(&1["has_records"] == false))
    f.conn |> get("/v1/client/days/not-a-date") |> json_response(422)
    f.conn |> get("/v1/client/week-markers?from=invalid") |> json_response(422)
    f.conn |> get("/v1/client/workout-logs/not-an-id") |> json_response(422)
    f.conn |> get("/v1/client/nutrition-logs/not-an-id") |> json_response(422)
  end

  @tag criticality: 10
  test "nutrition create correct delete and inverse restore preserve the food copy and claimed occurrence", f do
    # WHY: A later catalogue edit must not change nutrients for an already recorded meal.
    body = meal_body(f)
    saved = f.conn |> post("/v1/client/nutrition-logs", body) |> json_response(201)
    row = saved["data"]
    assert row["type"] == "meal"
    assert row["recorded_by"] == f.client.user_id
    assert [%{"amount" => 50.0, "name" => "Oats", "nutrients" => %{"energy_kcal" => 100}, "meal_item_id" => item_id}] = row["food_logs"]
    assert item_id == hd(f.option.items).id
    f.conn |> post("/v1/client/nutrition-logs", body) |> json_response(409)
    {:ok, _} = Nutrition.update_food(f.ctx, f.food.id, %{name: "New oats", nutrients: %{energy_kcal: 999}})

    changed =
      f.conn
      |> patch("/v1/client/nutrition-logs/#{row["id"]}", %{food_logs: [%{id: hd(row["food_logs"])["id"], food_id: f.food.id, meal_item_id: item_id, amount: 75, unit: "g"}]})
      |> json_response(200)

    assert hd(changed["data"]["food_logs"])["name"] == "Oats"
    assert hd(changed["data"]["food_logs"])["nutrients"]["energy_kcal"] == 100
    restored = f.conn |> post("/v1/client/nutrition-logs/restore", %{undo_token: changed["undo_token"]}) |> json_response(200)
    assert hd(restored["data"]["food_logs"])["amount"] == 50.0
    removed = f.conn |> delete("/v1/client/nutrition-logs/#{row["id"]}") |> json_response(200)
    f.conn |> get("/v1/client/nutrition-logs/#{row["id"]}") |> json_response(404)
    returned = f.conn |> post("/v1/client/nutrition-logs/restore", removed) |> json_response(200)
    assert returned["data"]["id"] == row["id"]
    assert hd(returned["data"]["food_logs"])["name"] == "Oats"
    f.conn |> post("/v1/client/nutrition-logs/restore", removed) |> json_response(409)
  end

  @tag criticality: 10
  test "nutrition denies invalid links trusted fields foreign clients and future writes", f do
    # WHY: The client must not assign a record to another client or forged prescription.
    f.conn |> post("/v1/client/nutrition-logs", Map.put(meal_body(f), :type, "food")) |> json_response(422)
    f.conn |> post("/v1/client/nutrition-logs", %{logged_on: f.today, food_logs: []}) |> json_response(422)
    future_body = %{logged_on: Date.add(f.today, 1), food_logs: [%{food_id: f.food.id, amount: 1, unit: "g"}]}
    f.conn |> post("/v1/client/nutrition-logs", future_body) |> json_response(422)
    foreign_food = insert(:food)
    foreign_body = %{logged_on: f.today, food_logs: [%{food_id: foreign_food.id, amount: 1, unit: "g"}]}
    f.conn |> post("/v1/client/nutrition-logs", foreign_body) |> json_response(404)
    saved = f.conn |> post("/v1/client/nutrition-logs", meal_body(f)) |> json_response(201)
    other = insert(:client, business: f.coach.business, coach: f.coach)
    conn = build_conn() |> authenticate_client(other)
    conn |> get("/v1/client/nutrition-logs/#{saved["data"]["id"]}") |> json_response(404)
    conn |> patch("/v1/client/nutrition-logs/#{saved["data"]["id"]}", %{logged_at: "12:00"}) |> json_response(404)
    conn |> delete("/v1/client/nutrition-logs/#{saved["data"]["id"]}") |> json_response(404)
    conn |> post("/v1/client/nutrition-logs", meal_body(f)) |> json_response(404)
    f.conn |> post("/v1/client/nutrition-logs/restore", %{undo_token: "invalid"}) |> json_response(409)
  end

  @tag criticality: 10
  test "workout lifecycle records typed sets and explicit feedback with inverse recovery", f do
    # WHY: Ticked sets are facts; finishing, editing and deleting must be complete operations.
    started = f.conn |> post("/v1/client/workout-logs", workout_body(f)) |> json_response(201)
    id = started["data"]["id"]
    assert started["data"]["state"] == "active"
    assert started["data"]["sets"] == []
    f.conn |> post("/v1/client/workout-logs", workout_body(f)) |> json_response(409)
    prescribed = hd(hd(f.workout.groups).exercises)
    set = %{workout_exercise_id: prescribed.id, exercise_id: f.exercise.id, round: 1, side: nil, reps: 5, weight_kg: 80}
    changed = f.conn |> patch("/v1/client/workout-logs/#{id}", %{sets: [set]}) |> json_response(200)
    assert [%{"reps" => 5, "weight_kg" => 80.0, "round" => 1, "exercise" => %{"name" => "Squat logging fixture"}}] = changed["data"]["sets"]
    f.conn |> post("/v1/client/workout-logs/#{id}/finish", %{difficulty: "just_right", pain: false, pain_note: "Not applicable"}) |> json_response(422)
    finished = f.conn |> post("/v1/client/workout-logs/#{id}/finish", %{difficulty: "too_hard", pain: true, pain_note: "Knee"}) |> json_response(200)
    assert finished["data"]["state"] == "completed"
    assert finished["data"]["pain_note"] == "Knee"
    reopened = f.conn |> post("/v1/client/workout-logs/#{id}/reopen") |> json_response(200)
    assert reopened["data"]["state"] == "active"
    discarded = f.conn |> post("/v1/client/workout-logs/#{id}/discard") |> json_response(200)
    assert discarded["data"]["state"] == "discarded"
    restored = f.conn |> post("/v1/client/workout-logs/restore", %{undo_token: discarded["undo_token"]}) |> json_response(200)
    assert restored["data"]["state"] == "active"
    f.conn |> post("/v1/client/workout-logs/#{id}/finish", %{difficulty: "just_right", pain: false, pain_note: nil}) |> json_response(200)
    removed = f.conn |> delete("/v1/client/workout-logs/#{id}") |> json_response(200)
    f.conn |> get("/v1/client/workout-logs/#{id}") |> json_response(404)
    returned = f.conn |> post("/v1/client/workout-logs/restore", removed) |> json_response(200)
    assert returned["data"]["state"] == "completed"
    assert length(returned["data"]["sets"]) == 1
  end

  @tag criticality: 10
  test "workout set corrections clear removed metrics in the response and later reads", f do
    # WHY: A correction accepted by HTTP must change the saved workout values.
    started = f.conn |> post("/v1/client/workout-logs", workout_body(f)) |> json_response(201)
    id = started["data"]["id"]
    prescribed = hd(hd(f.workout.groups).exercises)
    set = %{workout_exercise_id: prescribed.id, exercise_id: f.exercise.id, round: 1, reps: 8, weight_kg: 60}
    saved = f.conn |> patch("/v1/client/workout-logs/#{id}", %{sets: [set]}) |> json_response(200)
    cleared = set |> Map.put(:id, hd(saved["data"]["sets"])["id"]) |> Map.put(:reps, nil) |> Map.delete(:weight_kg)
    corrected = f.conn |> patch("/v1/client/workout-logs/#{id}", %{sets: [cleared]}) |> json_response(200)
    assert [%{"reps" => nil, "weight_kg" => nil}] = corrected["data"]["sets"]
    reread = f.conn |> get("/v1/client/workout-logs/#{id}") |> json_response(200)
    assert [%{"reps" => nil, "weight_kg" => nil}] = reread["data"]["sets"]
  end

  @tag criticality: 10
  test "workouts deny foreign clients coach-led starts and device-only fields", f do
    # WHY: Neither HTTP identities nor device input may enter another client's log.
    f.conn |> post("/v1/client/workout-logs", Map.put(workout_body(f), :client_id, Ecto.UUID.generate())) |> json_response(422)
    f.conn |> post("/v1/client/workout-logs", %{date: Date.add(f.today, 1), schedule_id: f.schedule.id, scheduled_date: f.today}) |> json_response(422)
    f.conn |> post("/v1/client/workout-logs", %{date: f.today, schedule_id: f.schedule.id}) |> json_response(422)
    saved = f.conn |> post("/v1/client/workout-logs", workout_body(f)) |> json_response(201)
    id = saved["data"]["id"]
    f.conn |> patch("/v1/client/workout-logs/#{id}", %{inputs: %{}}) |> json_response(422)
    set = %{id: Ecto.UUID.generate(), exercise_id: f.exercise.id, round: 1, reps: 5}
    f.conn |> patch("/v1/client/workout-logs/#{id}", %{sets: [set]}) |> json_response(422)
    other = insert(:client, business: f.coach.business, coach: f.coach)
    conn = build_conn() |> authenticate_client(other)
    conn |> get("/v1/client/workout-logs/#{id}") |> json_response(404)
    conn |> patch("/v1/client/workout-logs/#{id}", %{sets: []}) |> json_response(404)

    for action <- ~w(finish discard reopen) do
      body = if action == "finish", do: %{difficulty: "just_right", pain: false}, else: %{}
      conn |> post("/v1/client/workout-logs/#{id}/#{action}", body) |> json_response(404)
    end

    conn |> delete("/v1/client/workout-logs/#{id}") |> json_response(404)
    conn |> post("/v1/client/workout-logs", workout_body(f)) |> json_response(404)
    f.schedule |> Ecto.Changeset.change(coach_id: f.coach.id) |> Repo.update!()
    f.conn |> post("/v1/client/workout-logs/#{id}/discard") |> json_response(200)
    f.conn |> post("/v1/client/workout-logs", workout_body(f)) |> json_response(403)
  end

  @tag criticality: 10
  test "day and catalogues stay in the authenticated tenant and client", f do
    # WHY: Read endpoints must not expose another client's plan, record or private catalogue.
    other = insert(:client, business: f.coach.business, coach: f.coach)
    conn = build_conn() |> authenticate_client(other)
    assert get(conn, "/v1/client/days/#{f.today}") |> json_response(200) |> get_in(["data", "presets"]) == []
    assert get(conn, "/v1/client/days/#{f.today}") |> json_response(200) |> get_in(["data", "workouts"]) == []
    foreign = insert(:food, name: "Foreign unique food")
    foods = f.conn |> get("/v1/client/foods?search=Foreign%20unique") |> json_response(200)
    assert foods["data"] == []
    foods = f.conn |> get("/v1/client/foods?search=Oats&cursor=start&limit=1") |> json_response(200)
    assert [%{"id" => food_id, "name" => "Oats"}] = foods["data"]
    assert food_id == f.food.id and food_id != foreign.id
    insert(:exercise, name: "Foreign exercise unique")
    assert get(f.conn, "/v1/client/exercises?search=Foreign%20exercise%20unique") |> json_response(200) |> Map.fetch!("data") == []
    assert [%{"name" => "Squat logging fixture"}] = get(f.conn, "/v1/client/exercises?search=Squat%20logging%20fixture") |> json_response(200) |> Map.fetch!("data")
    f.conn |> get("/v1/client/foods?cursor=bad") |> json_response(422)
    f.conn |> get("/v1/client/exercises?cursor=bad") |> json_response(422)
  end

  defp meal_body(f),
    do: %{
      logged_on: f.today,
      logged_at: "09:00",
      nutrition_schedule_id: f.meal.id,
      scheduled_date: f.today,
      meal_option_id: f.option.id,
      food_logs: [%{food_id: f.food.id, meal_item_id: hd(f.option.items).id, amount: 50, unit: "g"}]
    }

  defp workout_body(f), do: %{date: f.today, schedule_id: f.schedule.id, scheduled_date: f.today}
end
