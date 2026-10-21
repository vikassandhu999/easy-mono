defmodule EasyWeb.Coaches.ClientWorkoutLogsTest do
  use Easy.ConnCase, async: true

  alias Easy.DataCase
  alias Easy.Workouts

  setup %{conn: conn} do
    coach = insert(:coach, preferred_name: "Sam")
    client = insert(:client, business: coach.business, coach: coach, preferred_name: "Alex", timezone: "Etc/UTC")
    exercise = insert(:exercise, business: coach.business, name: "Squat")
    replacement = insert(:exercise, business: coach.business, name: "Goblet squat")
    ctx = DataCase.trainer_ctx(coach)
    groups = [%{rounds: 3, exercises: [%{exercise_id: exercise.id, targets: [%{}]}]}]
    {:ok, %{data: workout}} = Workouts.create_workout_for_client(ctx, client.id, %{name: "Lower A", groups: groups})

    %{
      conn: authenticate_coach(conn, coach),
      coach: coach,
      client: client,
      ctx: ctx,
      exercise: exercise,
      replacement: replacement,
      workout: workout,
      entry: hd(hd(workout.groups).exercises),
      path: "/v1/coach/clients/#{client.id}/workout-logs",
      today: Date.utc_today()
    }
  end

  test "a coach-led start records the actor and the client reads the same session", f do
    leader = insert(:coach, business: f.coach.business)

    {:ok, %{data: schedule}} =
      Workouts.add_schedule_for_client(f.ctx, f.client.id, %{
        workout_id: f.workout.id,
        weekdays_mask: 127,
        coach_id: leader.id
      })

    body = %{id: Ecto.UUID.generate(), schedule_id: schedule.id, scheduled_date: f.today}
    response = post(f.conn, f.path, body) |> json_response(201)
    log = response["data"]
    assert {log["recorded_by"], log["coach_id"], log["recorder_name"]} == {"coach", f.coach.id, "Sam"}
    assert {log["workout_id"], log["schedule_id"], log["scheduled_date"]} == {f.workout.id, schedule.id, Date.to_iso8601(f.today)}
    assert post(f.conn, f.path, body) |> json_response(200) == response
    client_conn = build_conn() |> authenticate_client(f.client)
    assert get(client_conn, "/v1/client/workout-logs/#{log["id"]}") |> json_response(200) == response
    day = get(client_conn, "/v1/client/days/#{f.today}") |> json_response(200)
    assert {day["data"]["active_workout"]["id"], day["data"]["active_workout"]["recorder_name"]} == {log["id"], "Sam"}
  end

  test "coach activity commands return current values and preserve recorder fields", f do
    log = start(f)
    activity_body = %{id: Ecto.UUID.generate(), exercise_id: f.exercise.id, workout_exercise_id: f.entry.id}
    activities_path = "#{f.path}/#{log["id"]}/exercise-logs"
    created = post(f.conn, activities_path, activity_body) |> json_response(201)
    assert post(f.conn, activities_path, activity_body) |> json_response(200) == created
    [activity] = created["data"]["exercise_logs"]
    path = "#{activities_path}/#{activity["id"]}"
    patch(f.conn, path, %{rounds: 2}) |> json_response(200)
    set_body = %{id: Ecto.UUID.generate(), state: "completed", round: 1, reps: 8}
    recorded = post(f.conn, "#{path}/sets", set_body) |> json_response(201)
    assert post(f.conn, "#{path}/sets", set_body) |> json_response(200) == recorded
    corrected = patch(f.conn, "#{path}/sets/#{set_body.id}", %{reps: 9}) |> json_response(200)
    assert hd(hd(corrected["data"]["exercise_logs"])["sets"])["reps"] == 9
    assert post(f.conn, "#{path}/skip") |> json_response(422)
    removed = delete(f.conn, "#{path}/sets/#{set_body.id}") |> json_response(200)
    assert hd(removed["data"]["exercise_logs"])["sets"] == []
    completed = post(f.conn, "#{path}/complete", %{}) |> json_response(200)
    assert hd(completed["data"]["exercise_logs"])["state"] == "completed"
    post(f.conn, "#{path}/reopen") |> json_response(200)
    skipped = post(f.conn, "#{path}/skip") |> json_response(200)
    assert hd(skipped["data"]["exercise_logs"])["state"] == "skipped"
    post(f.conn, "#{path}/reopen") |> json_response(200)
    replaced = post(f.conn, "#{path}/replace", %{id: Ecto.UUID.generate(), exercise_id: f.replacement.id}) |> json_response(200)
    assert hd(replaced["data"]["exercise_logs"])["exercise"]["name"] == "Goblet squat"
    finished = post(f.conn, "#{f.path}/#{log["id"]}/finish", %{effort: 3}) |> json_response(200)
    assert {finished["data"]["state"], finished["data"]["effort"]} == {"completed", 3}
    reopened = post(f.conn, "#{f.path}/#{log["id"]}/reopen") |> json_response(200)
    assert {reopened["data"]["recorded_by"], reopened["data"]["coach_id"], reopened["data"]["recorder_name"]} == {"coach", f.coach.id, "Sam"}
    updated = patch(f.conn, "#{f.path}/#{log["id"]}", %{date: Date.add(f.today, -1), time: "00:00", text: "  Corrected  "}) |> json_response(200)
    assert {updated["data"]["date"], updated["data"]["time"], updated["data"]["text"]} == {Date.to_iso8601(Date.add(f.today, -1)), "00:00", "Corrected"}
    discarded = post(f.conn, "#{f.path}/#{log["id"]}/discard") |> json_response(200)
    assert discarded["data"]["state"] == "discarded"
    assert get(f.conn, "#{f.path}/#{log["id"]}") |> json_response(200) == discarded
  end

  test "coach lists use date and descending id ordering with an exact count", f do
    ids =
      for _ <- 1..3 do
        log = start(f)
        post(f.conn, "#{f.path}/#{log["id"]}/finish", %{}) |> json_response(200)
        log["id"]
      end

    expected = Enum.sort(ids, :desc)
    page = get(f.conn, "#{f.path}?date=#{f.today}&limit=2") |> json_response(200)
    assert {page["count"], Enum.map(page["workout_logs"], & &1["id"])} == {3, Enum.take(expected, 2)}
    assert Enum.all?(page["workout_logs"], &(&1["recorder_name"] == "Sam" and &1["state"] == "completed"))
    rest = get(f.conn, "#{f.path}?offset=2&limit=2") |> json_response(200)
    assert {rest["count"], Enum.map(rest["workout_logs"], & &1["id"])} == {3, Enum.drop(expected, 2)}
  end

  test "coach writes reject unavailable states and malformed input", f do
    assert post(f.conn, f.path, %{date: Date.add(f.today, 1)}) |> json_response(422)
    assert post(f.conn, f.path, %{coach_id: f.coach.id}) |> json_response(422)
    assert get(f.conn, "/v1/coach/clients/not-a-uuid/workout-logs") |> json_response(422)
    log = start(f)
    assert post(f.conn, f.path, %{id: Ecto.UUID.generate()}) |> json_response(409)
    assert patch(f.conn, "#{f.path}/#{log["id"]}", %{effort: 0}) |> json_response(422)
    assert post(f.conn, "#{f.path}/#{log["id"]}/finish", %{difficulty: "too_hard"}) |> json_response(422)
    assert get(f.conn, "#{f.path}/not-a-uuid") |> json_response(422)
  end

  test "coach lists filter state and scheduled date independently of actual date", f do
    {:ok, %{data: schedule}} = Workouts.add_schedule_for_client(f.ctx, f.client.id, %{workout_id: f.workout.id, weekdays_mask: 127})
    body = %{id: Ecto.UUID.generate(), schedule_id: schedule.id, scheduled_date: f.today, date: Date.add(f.today, -1)}
    log = post(f.conn, f.path, body) |> json_response(201) |> Map.fetch!("data")
    feedback = %{effort: 4, pain: false, text: "  Felt good  "}
    finished = post(f.conn, "#{f.path}/#{log["id"]}/finish", feedback) |> json_response(200)
    assert post(f.conn, "#{f.path}/#{log["id"]}/finish", feedback) |> json_response(200) == finished
    assert post(f.conn, "#{f.path}/#{log["id"]}/finish", %{effort: 2}) |> json_response(422)
    active = start(f)

    page = get(f.conn, "#{f.path}?state=completed&scheduled_date=#{f.today}&limit=1") |> json_response(200)
    assert {page["count"], Enum.map(page["workout_logs"], & &1["id"])} == {1, [log["id"]]}
    assert hd(page["workout_logs"])["date"] == Date.to_iso8601(Date.add(f.today, -1))
    page = get(f.conn, "#{f.path}?state=active&limit=1") |> json_response(200)
    assert {page["count"], Enum.map(page["workout_logs"], & &1["id"])} == {1, [active["id"]]}
    assert get(f.conn, "#{f.path}?state=unknown") |> json_response(422)
    assert get(f.conn, "#{f.path}?scheduled_date=invalid") |> json_response(422)
    foreign = build_conn() |> authenticate_coach(insert(:coach))
    assert get(foreign, "#{f.path}?state=active&scheduled_date=#{f.today}") |> json_response(404)
  end

  test "every coach route denies another tenant and a coach without client access", f do
    log = start(f)
    body = %{id: Ecto.UUID.generate(), exercise_id: f.exercise.id, workout_exercise_id: f.entry.id}
    created = post(f.conn, "#{f.path}/#{log["id"]}/exercise-logs", body) |> json_response(201)
    [activity] = created["data"]["exercise_logs"]
    set_body = %{id: Ecto.UUID.generate(), state: "completed", round: 1, reps: 8}
    activity_path = "#{f.path}/#{log["id"]}/exercise-logs/#{activity["id"]}"
    post(f.conn, "#{activity_path}/sets", set_body) |> json_response(201)
    unavailable = insert(:coach, business: f.coach.business)
    foreign = insert(:coach)

    for coach <- [unavailable, foreign] do
      conn = build_conn() |> authenticate_coach(coach)
      path = "#{f.path}/#{log["id"]}"

      operations = [
        fn -> get(conn, f.path) end,
        fn -> post(conn, f.path, %{id: Ecto.UUID.generate(), workout_id: f.workout.id}) end,
        fn -> get(conn, path) end,
        fn -> patch(conn, path, %{text: "No"}) end,
        fn -> post(conn, "#{path}/finish", %{}) end,
        fn -> post(conn, "#{path}/discard") end,
        fn -> post(conn, "#{path}/reopen") end,
        fn -> post(conn, "#{path}/exercise-logs", %{body | id: Ecto.UUID.generate()}) end,
        fn -> patch(conn, activity_path, %{rounds: 2}) end,
        fn -> post(conn, "#{activity_path}/complete", %{}) end,
        fn -> post(conn, "#{activity_path}/skip") end,
        fn -> post(conn, "#{activity_path}/reopen") end,
        fn -> post(conn, "#{activity_path}/replace", %{id: Ecto.UUID.generate(), exercise_id: f.replacement.id}) end,
        fn -> post(conn, "#{activity_path}/sets", %{set_body | id: Ecto.UUID.generate()}) end,
        fn -> patch(conn, "#{activity_path}/sets/#{set_body.id}", %{reps: 9}) end,
        fn -> delete(conn, "#{activity_path}/sets/#{set_body.id}") end
      ]

      for operation <- operations, do: assert(json_response(operation.(), 404)["error_code"] == "not_found")
    end
  end

  defp start(f) do
    post(f.conn, f.path, %{id: Ecto.UUID.generate(), workout_id: f.workout.id})
    |> json_response(201)
    |> Map.fetch!("data")
  end
end
