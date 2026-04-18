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
    end

    test "returns rest_days", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business, rest_days: [6, 7])

      conn = get(conn, "/v1/coach/training_plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["rest_days"] == [6, 7]
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

    test "sets rest_days", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn = patch(conn, "/v1/coach/training_plans/#{plan.id}", %{"rest_days" => [6, 7]})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["rest_days"] == [6, 7]
    end

    test "rejects invalid rest_days values", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn = patch(conn, "/v1/coach/training_plans/#{plan.id}", %{"rest_days" => [0, 8]})
      assert json_response(conn, 422)
    end

    test "rejects duplicate rest_days", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, author: coach, business: business)

      conn = patch(conn, "/v1/coach/training_plans/#{plan.id}", %{"rest_days" => [1, 1]})
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
      plan = insert(:training_plan, author: coach, business: business, rest_days: [6, 7])
      client = insert(:client, creator: coach, business: business)

      conn =
        post(conn, "/v1/coach/training_plans/#{plan.id}/assign", %{
          "client_id" => client.id,
          "start_date" => "2026-01-01",
          "end_date" => "2026-01-31"
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["rest_days"] == [6, 7]
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
          rest_days: [7]
        )

      conn = post(conn, "/v1/coach/training_plans/#{plan.id}/duplicate")
      assert %{"data" => data} = json_response(conn, 201)
      assert data["rest_days"] == [7]
    end
  end
end
