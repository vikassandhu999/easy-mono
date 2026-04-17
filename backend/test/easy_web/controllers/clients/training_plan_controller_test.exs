defmodule EasyWeb.Clients.TrainingPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/client/training_plans" do
    test "lists only plans assigned to the client", ctx do
      # Assigned to this client
      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      # Template — should not appear
      insert(:training_plan, author: ctx.coach, business: ctx.business)

      # Assigned to another client — should not appear
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: other_client.id,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      conn = get(ctx.conn, "/v1/client/training_plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["id"] != nil
    end

    test "returns empty list when no plans assigned", ctx do
      conn = get(ctx.conn, "/v1/client/training_plans")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "filters by status", ctx do
      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :active,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        status: :archived,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-03-31]
      )

      conn = get(ctx.conn, "/v1/client/training_plans", %{"status" => "active"})
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert hd(data)["status"] == "active"
    end

    test "rejects unauthenticated request", _ctx do
      conn = build_conn() |> get("/v1/client/training_plans")
      assert json_response(conn, 403)
    end

    test "rejects coach-authenticated request", ctx do
      conn =
        build_conn()
        |> authenticate_coach(ctx.coach)
        |> get("/v1/client/training_plans")

      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/training_plans/:id" do
    test "shows plan with workouts, elements, exercises, and sets", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-31]
        )

      workout = insert(:planned_workout, training_plan: plan, business: ctx.business)
      exercise = insert(:exercise, business: ctx.business)

      _element =
        insert(:workout_element,
          planned_workout: workout,
          exercise: exercise,
          business: ctx.business,
          planned_sets: [
            %{
              set_type: :working,
              target_reps: "8-10",
              load_value: 80,
              load_unit: :kg,
              rest_seconds: 120
            }
          ]
        )

      conn = get(ctx.conn, "/v1/client/training_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
      assert data["name"] == plan.name
      assert data["rest_days"] == []

      [workout_data] = data["planned_workouts"]
      assert workout_data["name"] == workout.name
      assert workout_data["day_number"] == workout.day_number

      [element_data] = workout_data["workout_elements"]
      assert element_data["exercise"]["name"] == exercise.name
      assert element_data["exercise"]["images"] != nil

      [set_data] = element_data["planned_sets"]
      assert set_data["target_reps"] == "8-10"
      assert set_data["load_value"] == "80"
      assert set_data["rest_seconds"] == 120
    end

    test "returns 404 for plan assigned to another client", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: other_client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-31]
        )

      conn = get(ctx.conn, "/v1/client/training_plans/#{plan.id}")
      assert json_response(conn, 404)
    end

    test "returns 404 for template plans", ctx do
      plan = insert(:training_plan, author: ctx.coach, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/training_plans/#{plan.id}")
      assert json_response(conn, 404)
    end

    test "does not expose coach-specific fields", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-31]
        )

      conn = get(ctx.conn, "/v1/client/training_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      refute Map.has_key?(data, "author_id")
      refute Map.has_key?(data, "business_id")
      refute Map.has_key?(data, "client_id")
      refute Map.has_key?(data, "original_template_id")
    end

    test "exposes coach_note to the client", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          coach_note: "Push hard on bench this week.",
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-31]
        )

      conn = get(ctx.conn, "/v1/client/training_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["coach_note"] == "Push hard on bench this week."
    end
  end

  describe "GET /v1/client/training_plans/today" do
    test "returns no_plan shape when client has no active plan", ctx do
      conn = get(ctx.conn, "/v1/client/training_plans/today", %{"date" => "2026-04-13"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["greeting"]["first_name"] == ctx.client.first_name
      assert data["greeting"]["day_name"] == "Monday"
      assert data["greeting"]["date"] == "2026-04-13"
      assert data["today"]["kind"] == "no_plan"
      assert data["today"]["planned_workout"] == nil
      assert data["today"]["last_session_recap"] == nil
      assert data["today"]["coach_note"] == nil
      assert data["plan"] == nil
      assert length(data["this_week"]) == 7
      assert data["coaching_context"]["coach_first_name"] == ctx.coach.first_name
      assert data["coaching_context"]["week_number"] == nil

      # Coach card
      assert data["coach"]["first_name"] == ctx.coach.first_name
      assert data["coach"]["last_name"] == ctx.coach.last_name
      assert Map.has_key?(data["coach"], "phone")
      assert Map.has_key?(data["coach"], "photo_url")
      assert Map.has_key?(data["coach"], "business_name")
    end

    test "returns workout kind for a planned day with last-session recap and coach note", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          coach_note: "Push hard on bench this week.",
          start_date: ~D[2026-03-09],
          end_date: ~D[2026-06-01]
        )

      workout =
        insert(:planned_workout,
          training_plan: plan,
          business: ctx.business,
          day_number: 1,
          name: "Push Day"
        )

      exercise = insert(:exercise, business: ctx.business, name: "Bench Press")

      insert(:workout_element,
        planned_workout: workout,
        exercise: exercise,
        business: ctx.business,
        planned_sets: [
          %{target_reps: "8-10", load_value: 80, load_unit: :kg, set_type: :working}
        ]
      )

      # Last time completed: a week ago
      last_session =
        insert(:workout_session,
          client: ctx.client,
          business: ctx.business,
          planned_workout: workout,
          started_at: ~U[2026-04-06 08:00:00.000000Z],
          ended_at: ~U[2026-04-06 09:00:00.000000Z],
          state: :completed
        )

      {:ok, _} =
        Easy.Training.PerformedSet.create(last_session.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "actual_reps" => "9",
          "load_value" => "80.0",
          "load_unit" => "kg"
        })

      # Monday 2026-04-13 (plan week 6: diff 35 days // 7 + 1 = 6)
      conn = get(ctx.conn, "/v1/client/training_plans/today", %{"date" => "2026-04-13"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["today"]["kind"] == "workout"
      assert data["today"]["coach_note"] == "Push hard on bench this week."
      assert data["today"]["planned_workout"]["id"] == workout.id
      assert data["today"]["planned_workout"]["name"] == "Push Day"
      assert data["today"]["planned_workout"]["exercise_count"] == 1

      assert data["today"]["last_session_recap"]["session_id"] == last_session.id
      assert data["today"]["last_session_recap"]["headline"] =~ "Bench Press"
      assert data["today"]["last_session_recap"]["headline"] =~ "80"
      assert data["today"]["last_session_recap"]["headline"] =~ "9"

      assert data["coaching_context"]["week_number"] == 6
      assert data["plan"]["id"] == plan.id
    end

    test "returns rest kind when today is in rest_days and has no workout", ctx do
      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        rest_days: [1],
        start_date: ~D[2026-03-09],
        end_date: ~D[2026-06-01]
      )

      conn = get(ctx.conn, "/v1/client/training_plans/today", %{"date" => "2026-04-13"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["today"]["kind"] == "rest"
      assert data["today"]["planned_workout"] == nil
      assert data["today"]["last_session_recap"] == nil
    end

    test "returns empty kind when today has no workout and is not a rest day", ctx do
      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        start_date: ~D[2026-03-09],
        end_date: ~D[2026-06-01]
      )

      conn = get(ctx.conn, "/v1/client/training_plans/today", %{"date" => "2026-04-13"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["today"]["kind"] == "empty"
      assert data["today"]["planned_workout"] == nil
    end

    test "this_week strip marks done/upcoming/rest/empty with is_today flag", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          rest_days: [7],
          start_date: ~D[2026-03-09],
          end_date: ~D[2026-06-01]
        )

      # Push day on Monday
      push = insert(:planned_workout, training_plan: plan, business: ctx.business, day_number: 1)
      # Pull day on Wednesday
      insert(:planned_workout, training_plan: plan, business: ctx.business, day_number: 3)

      # Completed a session on Monday 2026-04-13
      insert(:workout_session,
        client: ctx.client,
        business: ctx.business,
        planned_workout: push,
        started_at: ~U[2026-04-13 08:00:00.000000Z],
        ended_at: ~U[2026-04-13 09:00:00.000000Z],
        state: :completed
      )

      # View from Wednesday 2026-04-15
      conn = get(ctx.conn, "/v1/client/training_plans/today", %{"date" => "2026-04-15"})
      assert %{"data" => data} = json_response(conn, 200)

      strip = data["this_week"]
      assert length(strip) == 7
      assert Enum.map(strip, & &1["day_number"]) == [1, 2, 3, 4, 5, 6, 7]

      by_day = Enum.into(strip, %{}, &{&1["day_number"], &1})
      assert by_day[1]["kind"] == "done"
      assert by_day[1]["session_id"] != nil
      assert by_day[2]["kind"] == "empty"
      assert by_day[3]["kind"] == "upcoming"
      assert by_day[3]["is_today"] == true
      assert by_day[3]["planned_workout_name"] != nil
      assert by_day[7]["kind"] == "rest"
    end

    test "ignores discarded and active sessions for this_week done marker", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-03-09],
          end_date: ~D[2026-06-01]
        )

      workout =
        insert(:planned_workout, training_plan: plan, business: ctx.business, day_number: 1)

      insert(:workout_session,
        client: ctx.client,
        business: ctx.business,
        planned_workout: workout,
        started_at: ~U[2026-04-13 08:00:00.000000Z],
        state: :discarded
      )

      insert(:workout_session,
        client: ctx.client,
        business: ctx.business,
        planned_workout: workout,
        started_at: ~U[2026-04-13 10:00:00.000000Z],
        state: :active
      )

      conn = get(ctx.conn, "/v1/client/training_plans/today", %{"date" => "2026-04-13"})
      assert %{"data" => data} = json_response(conn, 200)

      by_day = Enum.into(data["this_week"], %{}, &{&1["day_number"], &1})
      refute by_day[1]["kind"] == "done"
      assert by_day[1]["session_id"] == nil
    end

    test "defaults date to today when not provided", ctx do
      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        start_date: ~D[2026-03-09],
        end_date: ~D[2026-06-01]
      )

      conn = get(ctx.conn, "/v1/client/training_plans/today")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["greeting"]["date"] == Date.to_iso8601(Date.utc_today())
    end

    test "rejects coach-authenticated request", ctx do
      conn =
        build_conn()
        |> authenticate_coach(ctx.coach)
        |> get("/v1/client/training_plans/today")

      assert json_response(conn, 403)
    end

    test "today card includes last_performed_by_element for each planned element", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          start_date: ~D[2026-03-09],
          end_date: ~D[2026-06-01]
        )

      workout =
        insert(:planned_workout,
          training_plan: plan,
          business: ctx.business,
          day_number: 1
        )

      exercise = insert(:exercise, business: ctx.business, name: "Bench Press")

      element =
        insert(:workout_element,
          planned_workout: workout,
          exercise: exercise,
          business: ctx.business,
          planned_sets: []
        )

      {:ok, old} =
        Easy.Training.WorkoutSession.create(ctx.business.id, ctx.client.id, %{
          "planned_workout_id" => workout.id
        })

      {:ok, _} =
        Easy.Training.PerformedSet.create(old.id, ctx.business.id, %{
          "position" => 0,
          "exercise_id" => exercise.id,
          "workout_element_id" => element.id,
          "actual_reps" => "9",
          "load_value" => "80.0",
          "load_unit" => "kg"
        })

      {:ok, _} = Easy.Training.WorkoutSession.complete(old)

      conn = get(ctx.conn, "/v1/client/training_plans/today", %{"date" => "2026-04-13"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["today"]["kind"] == "workout"
      entry = data["today"]["last_performed_by_element"][element.id]
      assert entry["source"] == "element"
      assert [set] = entry["sets"]
      assert set["actual_reps"] == "9"
      assert set["load_value"] == "80.0"
    end

    test "today includes workout_streak", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          rest_days: [7],
          start_date: ~D[2026-03-09],
          end_date: ~D[2026-06-01]
        )

      workout =
        insert(:planned_workout, training_plan: plan, business: ctx.business, day_number: 1)

      # Completed sessions on Fri 2026-04-11, Sat 2026-04-12 (rest day — skipped)
      insert(:workout_session,
        client: ctx.client,
        business: ctx.business,
        planned_workout: workout,
        started_at: ~U[2026-04-11 08:00:00.000000Z],
        ended_at: ~U[2026-04-11 09:00:00.000000Z],
        state: :completed
      )

      # Sunday 2026-04-12 is day 7 = rest day, no session needed

      # Monday 2026-04-13 — viewing today, no session yet
      conn = get(ctx.conn, "/v1/client/training_plans/today", %{"date" => "2026-04-13"})
      assert %{"data" => data} = json_response(conn, 200)

      streak = data["workout_streak"]
      assert streak["current"] >= 1
      assert is_boolean(streak["includes_today"])
    end

    test "workout_streak counts consecutive days with sessions, skipping rest days", ctx do
      plan =
        insert(:training_plan,
          author: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          rest_days: [6],
          start_date: ~D[2026-03-09],
          end_date: ~D[2026-06-01]
        )

      workout =
        insert(:planned_workout, training_plan: plan, business: ctx.business, day_number: 1)

      # Wed 2026-04-09 — completed
      insert(:workout_session,
        client: ctx.client,
        business: ctx.business,
        planned_workout: workout,
        started_at: ~U[2026-04-09 08:00:00.000000Z],
        ended_at: ~U[2026-04-09 09:00:00.000000Z],
        state: :completed
      )

      # Thu 2026-04-10 — completed
      insert(:workout_session,
        client: ctx.client,
        business: ctx.business,
        planned_workout: workout,
        started_at: ~U[2026-04-10 08:00:00.000000Z],
        ended_at: ~U[2026-04-10 09:00:00.000000Z],
        state: :completed
      )

      # Fri 2026-04-11 — completed
      insert(:workout_session,
        client: ctx.client,
        business: ctx.business,
        planned_workout: workout,
        started_at: ~U[2026-04-11 08:00:00.000000Z],
        ended_at: ~U[2026-04-11 09:00:00.000000Z],
        state: :completed
      )

      # Sat 2026-04-12 is day_of_week 6 = rest day, no session needed

      # Sun 2026-04-13 (day_of_week 7, NOT a rest day) — no session → streak breaks?
      # Actually viewing from Mon 2026-04-14:
      # Walk back: Sun 13 = no session, not rest → break. Streak = Fri+Thu+Wed = 3 + skip Sat
      # Wait: from Mon 14 perspective: yesterday is Sun 13 (not rest, no session) → streak = 0

      # Let's view from Sat 2026-04-12 instead:
      # Yesterday = Fri 11 (completed). Before that = Thu 10 (completed). Wed 9 (completed).
      # Tue 8 = no session, not rest → break. Streak = 3. Sat is rest day, not counted.
      conn = get(ctx.conn, "/v1/client/training_plans/today", %{"date" => "2026-04-12"})
      assert %{"data" => data} = json_response(conn, 200)

      streak = data["workout_streak"]
      # Sat 12 itself: rest day, no session → includes_today false
      # Walk back from Fri 11: completed (+1=1), Thu 10: completed (+1=2), Wed 9: completed (+1=3),
      # Tue 8: no session, not rest → stop. Streak = 3.
      assert streak["current"] == 3
      assert streak["includes_today"] == false
    end

    test "workout_streak is 0 when no recent sessions exist", ctx do
      insert(:training_plan,
        author: ctx.coach,
        business: ctx.business,
        client_id: ctx.client.id,
        start_date: ~D[2026-03-09],
        end_date: ~D[2026-06-01]
      )

      conn = get(ctx.conn, "/v1/client/training_plans/today", %{"date" => "2026-04-13"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["workout_streak"]["current"] == 0
      assert data["workout_streak"]["includes_today"] == false
    end
  end
end
