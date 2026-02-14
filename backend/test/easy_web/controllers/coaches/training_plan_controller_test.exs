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
  end

  describe "GET /v1/coach/training_plans" do
    test "lists plans by business", %{conn: conn, coach: coach, business: business} do
      insert(:training_plan, author: coach, business: business)
      other = insert(:coach)
      insert(:training_plan, author: other, business: other.business)

      conn = get(conn, "/v1/coach/training_plans")
      assert %{"data" => data, "count" => 1} = json_response(conn, 200)
      assert length(data) == 1
    end
  end

  describe "GET /v1/coach/training_plans/:id" do
    test "shows plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn = get(conn, "/v1/coach/training_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
    end
  end

  describe "PATCH /v1/coach/training_plans/:id" do
    test "updates plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn = patch(conn, "/v1/coach/training_plans/#{plan.id}", %{"name" => "Updated TP"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated TP"
    end
  end

  describe "POST /v1/coach/training_plans/:id/assign" do
    test "assigns template to client", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business, is_template: true)
      client = insert(:client, creator: coach, business: business)

      conn =
        post(conn, "/v1/coach/training_plans/#{plan.id}/assign", %{
          "client_id" => client.id,
          "start_date" => "2026-01-01",
          "end_date" => "2026-01-31"
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["client_id"] == client.id
      assert data["is_template"] == false
      assert data["original_template_id"] == plan.id
    end
  end

  describe "POST /v1/coach/training_plans/:id/duplicate" do
    test "duplicates plan", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business, name: "Upper A")

      conn = post(conn, "/v1/coach/training_plans/#{plan.id}/duplicate")
      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == "Upper A (Copy)"
    end
  end
end
