defmodule EasyWeb.Coaches.TrainingPlanItemControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/training_plans/:plan_id/training_plan_items" do
    test "creates plan item", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)

      conn =
        post(
          conn,
          "/v1/coach/training_plans/#{plan.id}/training_plan_items",
          %{"day_of_week" => "monday", "training_workout_id" => workout.id}
        )

      assert %{"data" => data} = json_response(conn, 201)
      assert data["day_of_week"] == "monday"
      assert data["training_workout_id"] == workout.id
      assert data["training_plan_id"] == plan.id
    end

    test "returns 404 when plan belongs to another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:training_plan, creator: other_coach, business: other_coach.business)

      other_workout =
        insert(:workout, plan: other_plan, creator: other_coach, business: other_coach.business)

      conn =
        post(
          conn,
          "/v1/coach/training_plans/#{other_plan.id}/training_plan_items",
          %{"day_of_week" => "monday", "training_workout_id" => other_workout.id}
        )

      assert json_response(conn, 404)
    end

    test "returns 422 with invalid day", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)

      conn =
        post(
          conn,
          "/v1/coach/training_plans/#{plan.id}/training_plan_items",
          %{"day_of_week" => "invalid", "training_workout_id" => workout.id}
        )

      assert json_response(conn, 422)
    end

    test "returns 404 when workout not in plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      other_plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: other_plan, creator: coach, business: business)

      conn =
        post(
          conn,
          "/v1/coach/training_plans/#{plan.id}/training_plan_items",
          %{"day_of_week" => "monday", "training_workout_id" => workout.id}
        )

      assert json_response(conn, 404)
    end

    test "rejects a second workout on the same day", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout_a = insert(:workout, plan: plan, creator: coach, business: business)
      workout_b = insert(:workout, plan: plan, creator: coach, business: business)

      insert(:training_plan_item,
        plan: plan,
        workout: workout_a,
        business: business,
        creator: coach,
        day_of_week: "monday"
      )

      conn =
        post(
          conn,
          "/v1/coach/training_plans/#{plan.id}/training_plan_items",
          %{"day_of_week" => "monday", "training_workout_id" => workout_b.id}
        )

      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/training_plans/:plan_id/training_plan_items" do
    test "lists plan items", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)

      insert(:training_plan_item,
        plan: plan,
        workout: workout,
        business: business,
        creator: coach
      )

      conn = get(conn, "/v1/coach/training_plans/#{plan.id}/training_plan_items")
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data) == 1
    end
  end

  describe "PATCH /v1/coach/training_plan_items/:id" do
    test "updates plan item", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)

      item =
        insert(:training_plan_item,
          plan: plan,
          workout: workout,
          business: business,
          creator: coach,
          day_of_week: "monday"
        )

      conn =
        patch(conn, "/v1/coach/training_plan_items/#{item.id}", %{
          "day_of_week" => "tuesday",
          "training_workout_id" => workout.id
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["day_of_week"] == "tuesday"
    end

    test "updates linked workout", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout_a = insert(:workout, plan: plan, creator: coach, business: business)
      workout_b = insert(:workout, plan: plan, creator: coach, business: business)

      item =
        insert(:training_plan_item,
          plan: plan,
          workout: workout_a,
          business: business,
          creator: coach,
          day_of_week: "monday"
        )

      conn =
        patch(conn, "/v1/coach/training_plan_items/#{item.id}", %{
          "day_of_week" => "monday",
          "training_workout_id" => workout_b.id
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["training_workout_id"] == workout_b.id
    end

    test "rejects linked workout from another plan", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      other_plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)
      other_workout = insert(:workout, plan: other_plan, creator: coach, business: business)

      item =
        insert(:training_plan_item,
          plan: plan,
          workout: workout,
          business: business,
          creator: coach,
          day_of_week: "monday"
        )

      conn =
        patch(conn, "/v1/coach/training_plan_items/#{item.id}", %{
          "day_of_week" => "monday",
          "training_workout_id" => other_workout.id
        })

      assert json_response(conn, 422)
    end
  end

  describe "DELETE /v1/coach/training_plan_items/:id" do
    test "deletes plan item", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business)

      item =
        insert(:training_plan_item,
          plan: plan,
          workout: workout,
          business: business,
          creator: coach
        )

      conn = delete(conn, "/v1/coach/training_plan_items/#{item.id}")
      assert response(conn, 204)
    end

    test "returns 404 for item from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_plan = insert(:training_plan, creator: other_coach, business: other_coach.business)

      other_workout =
        insert(:workout, plan: other_plan, creator: other_coach, business: other_coach.business)

      item =
        insert(:training_plan_item,
          plan: other_plan,
          workout: other_workout,
          business: other_coach.business,
          creator: other_coach
        )

      conn = delete(conn, "/v1/coach/training_plan_items/#{item.id}")
      assert json_response(conn, 404)
    end
  end
end
