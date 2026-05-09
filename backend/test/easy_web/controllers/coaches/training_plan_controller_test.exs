defmodule EasyWeb.Coaches.TrainingPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/training_plans" do
    test "creates training plan", %{conn: conn} do
      attrs = build(:training_plan_attrs)

      conn = post(conn, "/v1/coach/training_plans", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == attrs["name"]
    end

    test "rejects direct client assignment", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)
      attrs = build(:training_plan_attrs) |> Map.put("client_id", client.id)

      conn = post(conn, "/v1/coach/training_plans", attrs)
      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/training_plans" do
    test "lists only templates for this business", %{conn: conn, coach: coach, business: business} do
      insert(:training_plan, author: coach, business: business)

      # Personal plan — should NOT appear
      client = insert(:client, creator: coach, business: business)

      insert(:training_plan,
        author: coach,
        business: business,
        client_id: client.id,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-01-31]
      )

      # Other business template — should NOT appear
      other = insert(:coach)
      insert(:training_plan, author: other, business: other.business)

      conn = get(conn, "/v1/coach/training_plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
      assert hd(data)["client_id"] == nil
    end
  end

  describe "GET /v1/coach/training_plans/:id" do
    test "shows template with client as nil", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn = get(conn, "/v1/coach/training_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
      assert data["client"] == nil
      assert data["rest_days"] == []
      assert is_list(data["workouts"])
      assert is_list(data["plan_items"])
    end

    test "returns rest_days as strings", %{conn: conn, coach: coach, business: business} do
      plan =
        insert(:training_plan,
          author: coach,
          business: business,
          rest_days: ["saturday", "sunday"]
        )

      conn = get(conn, "/v1/coach/training_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["rest_days"] == ["saturday", "sunday"]
    end

    test "shows personal plan with client preloaded", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business)

      plan =
        insert(:training_plan,
          author: coach,
          business: business,
          client_id: client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-01-31]
        )

      conn = get(conn, "/v1/coach/training_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
      assert data["client"]["id"] == client.id
      assert data["client"]["first_name"] == client.first_name
      assert data["client"]["last_name"] == client.last_name
    end
  end

  describe "PATCH /v1/coach/training_plans/:id" do
    test "updates plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn = patch(conn, "/v1/coach/training_plans/#{plan.id}", %{"name" => "Updated TP"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated TP"
    end

    test "returns full preloaded plan after metadata update", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:workout, training_plan: plan, business: business)

      insert(:training_plan_item,
        training_plan: plan,
        workout: workout,
        business: business,
        creator: coach
      )

      conn = patch(conn, "/v1/coach/training_plans/#{plan.id}", %{"name" => "Updated TP"})
      assert %{"data" => data} = json_response(conn, 200)
      assert [%{"id" => workout_id}] = data["workouts"]
      assert workout_id == workout.id
      assert [%{"workout_id" => item_workout_id}] = data["plan_items"]
      assert item_workout_id == workout.id
    end

    test "rejects direct client reassignment", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)
      client = insert(:client, creator: coach, business: business)

      conn = patch(conn, "/v1/coach/training_plans/#{plan.id}", %{"client_id" => client.id})
      assert json_response(conn, 422)
    end

    test "sets rest_days", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn =
        patch(conn, "/v1/coach/training_plans/#{plan.id}", %{
          "rest_days" => ["saturday", "sunday"]
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["rest_days"] == ["saturday", "sunday"]
    end

    test "rejects invalid rest_days values", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn =
        patch(conn, "/v1/coach/training_plans/#{plan.id}", %{"rest_days" => ["invalid", "bad"]})

      assert json_response(conn, 422)
    end

    test "rejects duplicate rest_days", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn =
        patch(conn, "/v1/coach/training_plans/#{plan.id}", %{
          "rest_days" => ["monday", "monday"]
        })

      assert json_response(conn, 422)
    end

    test "rejects rest_days that overlap scheduled workouts", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, author: coach, business: business)
      workout = insert(:workout, training_plan: plan, business: business)

      insert(:training_plan_item,
        training_plan: plan,
        workout: workout,
        business: business,
        creator: coach,
        day: "monday"
      )

      conn = patch(conn, "/v1/coach/training_plans/#{plan.id}", %{"rest_days" => ["monday"]})
      assert json_response(conn, 422)
    end
  end

  describe "POST /v1/coach/training_plans/:id/assign" do
    test "assigns template to client", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)
      client = insert(:client, creator: coach, business: business)

      conn =
        post(conn, "/v1/coach/training_plans/#{plan.id}/assign", %{
          "client_id" => client.id,
          "start_date" => "2026-01-01",
          "end_date" => "2026-01-31"
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["client_id"] == client.id
      assert data["original_template_id"] == plan.id
    end

    test "copies rest_days on assign", %{conn: conn, coach: coach, business: business} do
      plan =
        insert(:training_plan,
          author: coach,
          business: business,
          rest_days: ["saturday", "sunday"]
        )

      client = insert(:client, creator: coach, business: business)

      conn =
        post(conn, "/v1/coach/training_plans/#{plan.id}/assign", %{
          "client_id" => client.id,
          "start_date" => "2026-01-01",
          "end_date" => "2026-01-31"
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["rest_days"] == ["saturday", "sunday"]
    end

    test "rejects assigning to a client from another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, author: coach, business: business)
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)

      conn =
        post(conn, "/v1/coach/training_plans/#{plan.id}/assign", %{
          "client_id" => other_client.id,
          "start_date" => "2026-01-01",
          "end_date" => "2026-01-31"
        })

      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/training_plans/:id/duplicate" do
    test "duplicates plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business, name: "Upper A")

      conn = post(conn, "/v1/coach/training_plans/#{plan.id}/duplicate")
      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == "Upper A (Copy)"
    end

    test "copies rest_days on duplicate", %{conn: conn, coach: coach, business: business} do
      plan =
        insert(:training_plan,
          author: coach,
          business: business,
          name: "PPL",
          rest_days: ["sunday"]
        )

      conn = post(conn, "/v1/coach/training_plans/#{plan.id}/duplicate")
      assert %{"data" => data} = json_response(conn, 201)
      assert data["rest_days"] == ["sunday"]
    end

    test "preserves shared-workout invariant: one Workout referenced by N PlanItems stays one Workout in the copy",
         %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business, name: "PPL")

      # One workout, referenced by two plan items (Mon + Thu) — the whole
      # point of the redesign. When duplicating, the copy must also have
      # one workout referenced by both days, not two separate workouts.
      shared_workout = insert(:workout, training_plan: plan, business: business, name: "Push")

      insert(:training_plan_item,
        training_plan: plan,
        workout: shared_workout,
        business: business,
        creator: coach,
        day: "monday",
        workout_type: "primary"
      )

      insert(:training_plan_item,
        training_plan: plan,
        workout: shared_workout,
        business: business,
        creator: coach,
        day: "thursday",
        workout_type: "primary"
      )

      conn = post(conn, "/v1/coach/training_plans/#{plan.id}/duplicate")
      assert %{"data" => data} = json_response(conn, 201)

      # The copy should have exactly one Workout (named "Push"), not two.
      assert [copied_workout] = data["workouts"]
      assert copied_workout["name"] == "Push"
      assert copied_workout["id"] != shared_workout.id

      # Both plan items should point at that single copied Workout.
      assert length(data["plan_items"]) == 2
      plan_item_workout_ids = data["plan_items"] |> Enum.map(& &1["workout_id"]) |> Enum.uniq()
      assert plan_item_workout_ids == [copied_workout["id"]]

      days = data["plan_items"] |> Enum.map(& &1["day"]) |> Enum.sort()
      assert days == ["monday", "thursday"]
    end
  end
end
