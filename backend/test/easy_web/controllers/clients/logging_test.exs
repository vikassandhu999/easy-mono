defmodule EasyWeb.Clients.LoggingTest do
  use Easy.ConnCase, async: true

  alias Easy.{DataCase, Repo, Workouts}
  alias Easy.Workouts.{ExerciseLog, ExerciseMetric, ExerciseSet, RoundTargets, WorkoutLog}

  setup %{conn: conn} do
    coach = insert(:coach, preferred_name: "Sam")
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC", preferred_name: "Alex")
    exercise = insert(:exercise, business: coach.business, name: "Squat")
    replacement = insert(:exercise, business: coach.business, name: "Goblet squat")
    ctx = DataCase.trainer_ctx(coach)

    groups = [
      %{
        rounds: 3,
        exercises: [
          %{
            exercise_id: exercise.id,
            targets: [%{reps: %{mode: "exact", value: 8}, rest: %{mode: "exact", value_s: 60}}]
          }
        ]
      }
    ]

    {:ok, %{data: workout}} = Workouts.create_workout_for_client(ctx, client.id, %{name: "Lower A", groups: groups})

    %{
      conn: authenticate_client(conn, client),
      coach: coach,
      client: client,
      ctx: ctx,
      exercise: exercise,
      replacement: replacement,
      workout: workout,
      entry: hd(hd(workout.groups).exercises),
      today: Date.utc_today()
    }
  end

  test "start returns the client recorder and an identical retry returns 200", f do
    body = %{id: Ecto.UUID.generate(), workout_id: f.workout.id}
    created = post(f.conn, "/v1/client/workout-logs", body) |> json_response(201)
    log = created["data"]

    assert {log["id"], log["client_id"], log["recorded_by"], log["coach_id"], log["recorder_name"]} ==
             {body.id, f.client.id, "client", nil, "Alex"}

    assert {log["date"], log["time"], log["state"], log["exercise_logs"]} == {Date.to_iso8601(f.today), nil, "active", []}
    assert {log["effort"], log["pain"], log["text"]} == {nil, nil, nil}
    assert is_binary(log["inserted_at"]) and is_binary(log["updated_at"])
    refute Map.has_key?(log, "business_id")
    refute Map.has_key?(log, "sets")
    refute Map.has_key?(log, "swaps")
    assert post(f.conn, "/v1/client/workout-logs", body) |> json_response(200) == created
    assert post(f.conn, "/v1/client/workout-logs", %{id: Ecto.UUID.generate()}) |> json_response(409)
    assert post(f.conn, "/v1/client/workout-logs", %{body | workout_id: nil}) |> json_response(409)
  end

  test "activity and set retries keep ids and reject different content", f do
    log = start(f)
    body = activity_body(f)
    path = "/v1/client/workout-logs/#{log["id"]}/exercise-logs"
    created = post(f.conn, path, body) |> json_response(201)
    [activity] = created["data"]["exercise_logs"]
    assert {activity["id"], activity["exercise_id"], activity["workout_exercise_id"]} == {body.id, f.exercise.id, f.entry.id}
    assert {activity["position"], activity["state"], activity["side_mode"], activity["rounds"]} == {0, "active", "combined", 3}
    assert activity["targets"] == [%{"reps" => %{"mode" => "exact", "value" => 8}, "rest" => %{"mode" => "exact", "value_s" => 60.0}}]
    assert post(f.conn, path, body) |> json_response(200) == created
    assert post(f.conn, path, %{body | exercise_id: f.replacement.id}) |> json_response(409)
    set_body = %{id: Ecto.UUID.generate(), state: "completed", round: 1, reps: 8, weight_kg: 60.5, entered_units: %{weight: "kg"}}
    set_path = "#{path}/#{activity["id"]}/sets"
    saved = post(f.conn, set_path, set_body) |> json_response(201)
    assert post(f.conn, set_path, set_body) |> json_response(200) == saved
    assert post(f.conn, set_path, %{set_body | reps: 9}) |> json_response(409)
    [set] = hd(saved["data"]["exercise_logs"])["sets"]

    assert {set["id"], set["state"], set["reps"], set["weight_kg"], set["entered_units"]} ==
             {set_body.id, "completed", 8, 60.5, %{"weight" => "kg"}}
  end

  test "completed skipped and absent slots stay distinct through finish and reopen for both viewers", f do
    log = start(f)
    activity = start_activity(f, log)
    path = "/v1/client/workout-logs/#{log["id"]}"
    set_path = "#{path}/exercise-logs/#{activity["id"]}/sets"
    post(f.conn, set_path, %{id: Ecto.UUID.generate(), state: "skipped", round: 2}) |> json_response(201)
    post(f.conn, set_path, %{id: Ecto.UUID.generate(), state: "completed", round: 1, reps: 8}) |> json_response(201)
    finished = post(f.conn, "#{path}/finish", %{}) |> json_response(200)
    assert finished["data"]["state"] == "completed"
    assert {finished["data"]["effort"], finished["data"]["pain"]} == {nil, nil}
    [recorded] = finished["data"]["exercise_logs"]
    assert recorded["state"] == "active"
    assert Enum.map(recorded["sets"], &{&1["round"], &1["state"], &1["reps"]}) == [{1, "completed", 8}, {2, "skipped", nil}]
    assert post(f.conn, "#{path}/finish", %{}) |> json_response(200) == finished
    assert post(f.conn, set_path, %{id: Ecto.UUID.generate(), state: "completed", round: 3}) |> json_response(422)
    reopened = post(f.conn, "#{path}/reopen") |> json_response(200)
    assert reopened["data"]["state"] == "active"
    assert reopened["data"]["exercise_logs"] == finished["data"]["exercise_logs"]
    answered = post(f.conn, "#{path}/finish", %{effort: 4, pain: false, text: "  A hard session.  "}) |> json_response(200)
    assert {answered["data"]["effort"], answered["data"]["pain"], answered["data"]["text"]} == {4, false, "A hard session."}
    assert get(f.conn, path) |> json_response(200) == answered
    coach_conn = build_conn() |> authenticate_coach(f.coach)
    assert get(coach_conn, "/v1/coach/clients/#{f.client.id}/workout-logs/#{log["id"]}") |> json_response(200) == answered
  end

  test "a side-specific replacement preserves original work and shared slot identity", f do
    body = %{
      groups: [
        %{
          id: hd(f.workout.groups).id,
          rounds: 3,
          exercises: [
            %{
              id: f.entry.id,
              exercise_id: f.exercise.id,
              side_mode: "per_side",
              targets: [%{}]
            }
          ]
        }
      ]
    }

    {:ok, _} = Workouts.update_workout_for_client(f.ctx, f.client.id, f.workout.id, body)
    log = start(f)
    activity = start_activity(f, log)
    path = "/v1/client/workout-logs/#{log["id"]}/exercise-logs/#{activity["id"]}"
    post(f.conn, "#{path}/sets", %{id: Ecto.UUID.generate(), state: "completed", round: 1, side: "left", reps: 8}) |> json_response(201)
    replacement_id = Ecto.UUID.generate()
    swapped = post(f.conn, "#{path}/replace", %{id: replacement_id, exercise_id: f.replacement.id}) |> json_response(200)
    [original, replacement] = swapped["data"]["exercise_logs"]
    assert {original["id"], original["exercise"]["name"], hd(original["sets"])["side"]} == {activity["id"], "Squat", "left"}
    assert {replacement["id"], replacement["exercise"]["name"], replacement["position"]} == {replacement_id, "Goblet squat", 1}
    new_path = "/v1/client/workout-logs/#{log["id"]}/exercise-logs/#{replacement_id}/sets"
    body = %{id: Ecto.UUID.generate(), state: "completed", round: 1, side: "right", reps: 6}
    recorded = post(f.conn, new_path, body) |> json_response(201)
    assert Enum.map(recorded["data"]["exercise_logs"], &hd(&1["sets"])["side"]) == ["left", "right"]
    assert post(f.conn, new_path, %{body | id: Ecto.UUID.generate(), side: "left"}) |> json_response(422)
  end

  test "reported overall results stay separate from partial interval detail", f do
    metrics = [%ExerciseMetric{key: :distance}, %ExerciseMetric{key: :duration}]
    run = insert(:exercise, business: f.coach.business, kind: :activity, metrics: metrics)
    log = post(f.conn, "/v1/client/workout-logs", %{id: Ecto.UUID.generate()}) |> json_response(201) |> Map.fetch!("data")
    body = %{id: Ecto.UUID.generate(), exercise_id: run.id}
    started = post(f.conn, "/v1/client/workout-logs/#{log["id"]}/exercise-logs", body) |> json_response(201)
    [activity] = started["data"]["exercise_logs"]
    path = "/v1/client/workout-logs/#{log["id"]}/exercise-logs/#{activity["id"]}"
    updated = patch(f.conn, path, %{distance_m: 5000, duration_s: 1800.5}) |> json_response(200)
    assert hd(updated["data"]["exercise_logs"])["distance_m"] == 5000.0
    interval = %{id: Ecto.UUID.generate(), state: "completed", round: 1, distance_m: 1000, duration_s: 300.25}
    recorded = post(f.conn, "#{path}/sets", interval) |> json_response(201)
    [saved] = recorded["data"]["exercise_logs"]
    assert {saved["distance_m"], saved["duration_s"], hd(saved["sets"])["distance_m"]} == {5000.0, 1800.5, 1000.0}
    refute Map.has_key?(saved, "total_distance_m")
  end

  test "activity transitions correction removal and discard return the whole session", f do
    log = start(f)
    activity = start_activity(f, log)
    path = "/v1/client/workout-logs/#{log["id"]}/exercise-logs/#{activity["id"]}"
    saved = post(f.conn, "#{path}/sets", %{id: Ecto.UUID.generate(), state: "completed", round: 1, reps: 8}) |> json_response(201)
    set_id = hd(hd(saved["data"]["exercise_logs"])["sets"])["id"]
    corrected = patch(f.conn, "#{path}/sets/#{set_id}", %{reps: nil, weight_kg: 40}) |> json_response(200)
    [set] = hd(corrected["data"]["exercise_logs"])["sets"]
    assert {set["reps"], set["weight_kg"]} == {nil, 40.0}
    assert patch(f.conn, "#{path}/sets/#{set_id}", %{round: 2}) |> json_response(422)
    assert post(f.conn, "#{path}/skip") |> json_response(422)
    removed = delete(f.conn, "#{path}/sets/#{set_id}") |> json_response(200)
    assert hd(removed["data"]["exercise_logs"])["sets"] == []
    completed = post(f.conn, "#{path}/complete", %{}) |> json_response(200)
    assert hd(completed["data"]["exercise_logs"])["state"] == "completed"
    assert post(f.conn, "#{path}/complete", %{}) |> json_response(200) == completed
    post(f.conn, "#{path}/reopen") |> json_response(200)
    skipped = post(f.conn, "#{path}/skip") |> json_response(200)
    assert hd(skipped["data"]["exercise_logs"])["state"] == "skipped"
    post(f.conn, "#{path}/reopen") |> json_response(200)
    targets = [%{rest: %{mode: "none"}}, %{rest: %{mode: "exact", value_s: 30}}]
    adjusted = patch(f.conn, path, %{rounds: 2, targets_mode: "per_round", targets: targets}) |> json_response(200)
    assert hd(adjusted["data"]["exercise_logs"])["rounds"] == 2
    cleared = patch(f.conn, path, %{targets: [%{rest: nil}, %{}]}) |> json_response(200)
    [first, _second] = hd(cleared["data"]["exercise_logs"])["targets"]
    assert first["rest"] == %{"mode" => "client_chooses"}
    discarded = post(f.conn, "/v1/client/workout-logs/#{log["id"]}/discard") |> json_response(200)
    assert discarded["data"]["state"] == "discarded"
    assert length(discarded["data"]["exercise_logs"]) == 1
  end

  test "list orders dates and ids and day exposes the same active recording", f do
    {:ok, _} = Workouts.update_exercise(f.ctx, f.exercise.id, %{media: [%{url: "https://example.com/demo"}]})
    older = start(f, %{date: Date.add(f.today, -1)})
    post(f.conn, "/v1/client/workout-logs/#{older["id"]}/finish", %{}) |> json_response(200)
    current = start(f)
    start_activity(f, current)
    page = get(f.conn, "/v1/client/workout-logs?limit=1") |> json_response(200)
    assert {page["count"], Enum.map(page["workout_logs"], & &1["id"])} == {2, [current["id"]]}
    remaining = get(f.conn, "/v1/client/workout-logs?offset=1&limit=1") |> json_response(200)
    assert Enum.map(remaining["workout_logs"], & &1["id"]) == [older["id"]]
    filtered = get(f.conn, "/v1/client/workout-logs?date=#{Date.to_iso8601(f.today)}") |> json_response(200)
    assert filtered["count"] == 1
    day = get(f.conn, "/v1/client/days/#{f.today}") |> json_response(200)
    assert {day["data"]["active_workout"]["id"], day["data"]["active_workout"]["recorder_name"]} == {current["id"], "Alex"}
    [activity] = day["data"]["active_workout"]["exercise_logs"]
    assert hd(activity["exercise"]["media"])["url"] == "https://example.com/demo"
    assert Enum.map(day["data"]["workout_logs"], & &1["id"]) == [current["id"]]
    assert hd(hd(hd(day["data"]["workouts"])["groups"])["exercises"])["exercise"]["name"] == "Squat"
  end

  test "typed requests reject trusted fields invalid ids and future dates", f do
    assert post(f.conn, "/v1/client/workout-logs", %{id: Ecto.UUID.generate(), client_id: f.client.id}) |> json_response(422)
    assert post(f.conn, "/v1/client/workout-logs", %{date: Date.add(f.today, 1)}) |> json_response(422)
    assert get(f.conn, "/v1/client/workout-logs/not-a-uuid") |> json_response(422)
    assert get(f.conn, "/v1/client/workout-logs?date=invalid") |> json_response(422)
    log = start(f)
    assert patch(f.conn, "/v1/client/workout-logs/#{log["id"]}", %{recorded_by: "coach"}) |> json_response(422)
    assert patch(f.conn, "/v1/client/workout-logs/#{log["id"]}", %{effort: 6}) |> json_response(422)
    assert post(f.conn, "/v1/client/workout-logs/#{log["id"]}/exercise-logs", %{id: Ecto.UUID.generate()}) |> json_response(422)
  end

  test "client lists filter state and scheduled date independently of actual date", f do
    {:ok, %{data: schedule}} = Workouts.add_schedule_for_client(f.ctx, f.client.id, %{workout_id: f.workout.id, weekdays_mask: 127})
    path = "/v1/client/workout-logs"
    body = %{id: Ecto.UUID.generate(), schedule_id: schedule.id, scheduled_date: f.today, date: Date.add(f.today, -1)}
    log = post(f.conn, path, body) |> json_response(201) |> Map.fetch!("data")
    feedback = %{effort: 4, pain: false, text: "  Felt good  "}
    finished = post(f.conn, "#{path}/#{log["id"]}/finish", feedback) |> json_response(200)
    assert post(f.conn, "#{path}/#{log["id"]}/finish", feedback) |> json_response(200) == finished
    assert post(f.conn, "#{path}/#{log["id"]}/finish", %{pain: true}) |> json_response(422)
    active = start(f)
    page = get(f.conn, "#{path}?state=active&limit=1") |> json_response(200)
    assert {page["count"], Enum.map(page["workout_logs"], & &1["id"])} == {1, [active["id"]]}
    page = get(f.conn, "#{path}?state=completed&scheduled_date=#{f.today}") |> json_response(200)
    assert {page["count"], Enum.map(page["workout_logs"], & &1["id"])} == {1, [log["id"]]}
    assert hd(page["workout_logs"])["date"] == Date.to_iso8601(Date.add(f.today, -1))
    assert get(f.conn, "#{path}?state=unknown") |> json_response(422)
    assert get(f.conn, "#{path}?scheduled_date=invalid") |> json_response(422)

    for client <- [insert(:client, business: f.coach.business, coach: f.coach), insert(:client)] do
      conn = build_conn() |> authenticate_client(client)
      page = get(conn, "#{path}?state=active") |> json_response(200)
      assert {page["count"], page["workout_logs"]} == {0, []}
    end
  end

  test "every recording route denies another tenant or another client", f do
    other = insert(:client, business: f.coach.business, coach: f.coach)
    foreign = insert(:client)

    for client <- [other, foreign] do
      exercise = insert(:exercise, business: client.business)
      ctx = DataCase.trainer_ctx(client.coach)
      {:ok, %{data: workout}} = Workouts.create_workout_for_client(ctx, client.id, %{name: "Foreign", type: "open"})
      log = Repo.insert!(%WorkoutLog{business_id: client.business_id, client_id: client.id, workout_id: workout.id, date: f.today, recorded_by: :client})
      activity = Repo.insert!(%ExerciseLog{business_id: client.business_id, workout_log_id: log.id, exercise_id: exercise.id, position: 0, targets: [%RoundTargets{}]})
      set = Repo.insert!(%ExerciseSet{business_id: client.business_id, exercise_log_id: activity.id, state: :completed, round: 1})
      path = "/v1/client/workout-logs/#{log.id}"
      activity_path = "#{path}/exercise-logs/#{activity.id}"

      operations = [
        fn -> post(f.conn, "/v1/client/workout-logs", %{id: Ecto.UUID.generate(), workout_id: workout.id}) end,
        fn -> get(f.conn, path) end,
        fn -> patch(f.conn, path, %{text: "No"}) end,
        fn -> post(f.conn, "#{path}/finish", %{}) end,
        fn -> post(f.conn, "#{path}/discard") end,
        fn -> post(f.conn, "#{path}/reopen") end,
        fn -> post(f.conn, "#{path}/exercise-logs", %{id: Ecto.UUID.generate(), exercise_id: exercise.id}) end,
        fn -> patch(f.conn, activity_path, %{rounds: 2}) end,
        fn -> post(f.conn, "#{activity_path}/complete", %{}) end,
        fn -> post(f.conn, "#{activity_path}/skip") end,
        fn -> post(f.conn, "#{activity_path}/reopen") end,
        fn -> post(f.conn, "#{activity_path}/replace", %{id: Ecto.UUID.generate(), exercise_id: exercise.id}) end,
        fn -> post(f.conn, "#{activity_path}/sets", %{id: Ecto.UUID.generate(), state: "completed", round: 1}) end,
        fn -> patch(f.conn, "#{activity_path}/sets/#{set.id}", %{reps: 1}) end,
        fn -> delete(f.conn, "#{activity_path}/sets/#{set.id}") end
      ]

      for operation <- operations, do: assert(json_response(operation.(), 404)["error_code"] == "not_found")
    end

    assert get(f.conn, "/v1/client/workout-logs") |> json_response(200) == %{"count" => 0, "workout_logs" => []}
  end

  test "the retired workout delete and restore routes do not exist" do
    id = Ecto.UUID.generate()
    assert Phoenix.Router.route_info(EasyWeb.Router, "DELETE", "/v1/client/workout-logs/#{id}", "localhost") == :error
    assert Phoenix.Router.route_info(EasyWeb.Router, "POST", "/v1/client/workout-logs/restore", "localhost") == :error
  end

  defp start(f, overrides \\ %{}) do
    body = Map.merge(%{id: Ecto.UUID.generate(), workout_id: f.workout.id}, overrides)
    post(f.conn, "/v1/client/workout-logs", body) |> json_response(201) |> Map.fetch!("data")
  end

  defp activity_body(f), do: %{id: Ecto.UUID.generate(), exercise_id: f.exercise.id, workout_exercise_id: f.entry.id}

  defp start_activity(f, log) do
    post(f.conn, "/v1/client/workout-logs/#{log["id"]}/exercise-logs", activity_body(f))
    |> json_response(201)
    |> get_in(["data", "exercise_logs"])
    |> hd()
  end
end
