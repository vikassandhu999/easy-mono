defmodule EasyWeb.Coaches.TrainingPlanControllerTest do
  use Easy.ConnCase

  alias Easy.Repo
  alias Easy.Training.TrainingPlan

  setup do
    unique = Ecto.UUID.generate()

    business_owner =
      insert(:user, email: "coach-training-plan-owner-#{unique}@test.com")

    business =
      insert(:business,
        name: "Coach Training Plan Business #{unique}",
        handle: "coach-training-plan-#{unique}",
        owner: business_owner
      )

    coach_user =
      insert(:user, email: "coach-training-plan-coach-#{unique}@test.com")

    coach = insert(:coach, user: coach_user, business: business)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: business}
  end

  describe "POST /v1/coach/training-plans" do
    test "creates a template for the authenticated coach business", %{
      conn: conn,
      coach: coach
    } do
      name = "Strength Template #{Ecto.UUID.generate()}"

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-plans", %{
          "name" => name,
          "description" => "Four day strength block",
          "status" => "active"
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == name
      assert data["description"] == "Four day strength block"
      assert data["status"] == "active"
      assert data["client_id"] == nil
      assert data["client"] == nil
      refute Map.has_key?(data, "business_id")
      assert data["creator_id"] == coach.id
      assert data["source_template_id"] == nil
      assert data["workouts"] == []
      assert data["plan_items"] == []
    end

    test "rejects trusted identifiers in the request body", %{conn: conn} do
      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-plans", %{
          "name" => "Bad Template #{Ecto.UUID.generate()}",
          "business_id" => Ecto.UUID.generate()
        })

      assert %{"errors" => [_error]} = json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/training-plans" do
    test "lists matching templates for the current business newest first", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      search = "searchable-template-#{Ecto.UUID.generate()}"

      older_template =
        insert(:training_plan,
          creator: coach,
          business: business,
          name: "Alpha #{search}",
          status: :active,
          inserted_at: ~U[2026-01-01 00:00:00Z]
        )

      newer_template =
        insert(:training_plan,
          creator: coach,
          business: business,
          name: "Beta #{search}",
          status: :active,
          inserted_at: ~U[2026-01-02 00:00:00Z]
        )

      client_user =
        insert(:user, email: "assigned-plan-client-#{Ecto.UUID.generate()}@test.com")

      client =
        insert(:client,
          email: "assigned-plan-client-#{Ecto.UUID.generate()}@test.com",
          user: client_user,
          creator: coach,
          business: business
        )

      insert(:training_plan,
        creator: coach,
        business: business,
        client_id: client.id,
        name: "Assigned #{search}",
        status: :active,
        start_date: ~D[2026-01-01],
        end_date: ~D[2026-01-31]
      )

      insert(:training_plan,
        creator: coach,
        business: business,
        name: "Archived #{search}",
        status: :archived
      )

      other_unique = Ecto.UUID.generate()
      other_owner = insert(:user, email: "other-plan-owner-#{other_unique}@test.com")

      other_business =
        insert(:business,
          name: "Other Plan Business #{other_unique}",
          handle: "other-plan-#{other_unique}",
          owner: other_owner
        )

      other_user = insert(:user, email: "other-plan-coach-#{other_unique}@test.com")
      other_coach = insert(:coach, user: other_user, business: other_business)

      insert(:training_plan,
        creator: other_coach,
        business: other_business,
        name: "Other Business #{search}",
        status: :active
      )

      conn =
        get(conn, "/v1/coach/training-plans", %{
          "search" => search,
          "status" => "active"
        })

      assert %{"data" => data, "count" => 2} = json_response(conn, 200)
      assert Enum.map(data, & &1["id"]) == [newer_template.id, older_template.id]
      assert Enum.all?(data, &is_nil(&1["client_id"]))
      assert Enum.all?(data, &(not Map.has_key?(&1, "business_id")))
    end
  end

  describe "GET /v1/coach/training-plans/:id" do
    test "shows a template with workouts and plan items", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)

      workout = insert(:workout, plan: plan, creator: coach, business: business, name: "Push")

      insert(:training_plan_item,
        plan: plan,
        workout: workout,
        business: business,
        creator: coach,
        day_of_week: "monday"
      )

      conn = get(conn, "/v1/coach/training-plans/#{plan.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == plan.id
      assert data["client"] == nil
      assert [%{"id" => workout_id, "name" => "Push"}] = data["workouts"]
      assert workout_id == workout.id
      assert [%{"day_of_week" => "monday", "training_workout_id" => ^workout_id}] = data["plan_items"]
    end

    test "returns 404 for another business plan", %{conn: conn} do
      other_unique = Ecto.UUID.generate()
      other_owner = insert(:user, email: "show-other-plan-owner-#{other_unique}@test.com")

      other_business =
        insert(:business,
          name: "Show Other Plan Business #{other_unique}",
          handle: "show-other-plan-#{other_unique}",
          owner: other_owner
        )

      other_user = insert(:user, email: "show-other-plan-coach-#{other_unique}@test.com")
      other_coach = insert(:coach, user: other_user, business: other_business)
      plan = insert(:training_plan, creator: other_coach, business: other_business)

      conn = get(conn, "/v1/coach/training-plans/#{plan.id}")

      assert %{"error_code" => "not_found"} = json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/training-plans/:id" do
    test "updates metadata and returns the full preloaded plan", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)
      workout = insert(:workout, plan: plan, creator: coach, business: business, name: "Pull")

      insert(:training_plan_item,
        plan: plan,
        workout: workout,
        business: business,
        creator: coach,
        day_of_week: "tuesday"
      )

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/coach/training-plans/#{plan.id}", %{
          "name" => "Updated Training Plan",
          "description" => "Updated description"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated Training Plan"
      assert data["description"] == "Updated description"
      assert [%{"id" => workout_id}] = data["workouts"]
      assert workout_id == workout.id
      assert [%{"training_workout_id" => item_workout_id}] = data["plan_items"]
      assert item_workout_id == workout.id
    end

    test "rejects trusted identifiers in the request body", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/coach/training-plans/#{plan.id}", %{
          "business_id" => Ecto.UUID.generate()
        })

      assert %{"errors" => [_error]} = json_response(conn, 422)
    end

    test "returns 404 for another business plan", %{conn: conn} do
      other_unique = Ecto.UUID.generate()
      other_owner = insert(:user, email: "patch-other-plan-owner-#{other_unique}@test.com")

      other_business =
        insert(:business,
          name: "Patch Other Plan Business #{other_unique}",
          handle: "patch-other-plan-#{other_unique}",
          owner: other_owner
        )

      other_user = insert(:user, email: "patch-other-plan-coach-#{other_unique}@test.com")
      other_coach = insert(:coach, user: other_user, business: other_business)
      plan = insert(:training_plan, creator: other_coach, business: other_business)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/coach/training-plans/#{plan.id}", %{"name" => "Nope"})

      assert %{"error_code" => "not_found"} = json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/training-plans/:id" do
    test "deletes a template", %{conn: conn, coach: coach, business: business} do
      plan = insert(:training_plan, creator: coach, business: business)

      conn = delete(conn, "/v1/coach/training-plans/#{plan.id}")

      assert response(conn, 204) == ""
      assert Repo.get(TrainingPlan, plan.id) == nil
    end

    test "returns 404 for another business plan", %{conn: conn} do
      other_unique = Ecto.UUID.generate()
      other_owner = insert(:user, email: "delete-other-plan-owner-#{other_unique}@test.com")

      other_business =
        insert(:business,
          name: "Delete Other Plan Business #{other_unique}",
          handle: "delete-other-plan-#{other_unique}",
          owner: other_owner
        )

      other_user = insert(:user, email: "delete-other-plan-coach-#{other_unique}@test.com")
      other_coach = insert(:coach, user: other_user, business: other_business)
      plan = insert(:training_plan, creator: other_coach, business: other_business)

      conn = delete(conn, "/v1/coach/training-plans/#{plan.id}")

      assert %{"error_code" => "not_found"} = json_response(conn, 404)
      assert Repo.get(TrainingPlan, plan.id)
    end
  end

  describe "POST /v1/coach/training-plans/:id/assign" do
    test "assigns a template to a client with copied workouts and plan items", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)

      workout = insert(:workout, plan: plan, creator: coach, business: business, name: "Push")

      insert(:training_plan_item,
        plan: plan,
        workout: workout,
        business: business,
        creator: coach,
        day_of_week: "monday"
      )

      client_user = insert(:user, email: "assign-plan-client-#{Ecto.UUID.generate()}@test.com")

      client =
        insert(:client,
          email: "assign-plan-client-#{Ecto.UUID.generate()}@test.com",
          user: client_user,
          creator: coach,
          business: business
        )

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-plans/#{plan.id}/assign", %{
          "client_id" => client.id,
          "start_date" => "2026-01-01",
          "end_date" => "2026-01-31"
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["client_id"] == client.id
      assert data["client"]["id"] == client.id
      assert data["source_template_id"] == plan.id
      assert data["start_date"] == "2026-01-01"
      assert data["end_date"] == "2026-01-31"
      assert [%{"name" => "Push"} = copied_workout] = data["workouts"]
      assert copied_workout["id"] != workout.id
      assert [%{"day_of_week" => "monday", "training_workout_id" => copied_workout_id}] = data["plan_items"]
      assert copied_workout_id == copied_workout["id"]
    end

    test "returns 404 for a client from another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan = insert(:training_plan, creator: coach, business: business)

      other_unique = Ecto.UUID.generate()
      other_owner = insert(:user, email: "assign-other-owner-#{other_unique}@test.com")

      other_business =
        insert(:business,
          name: "Assign Other Business #{other_unique}",
          handle: "assign-other-#{other_unique}",
          owner: other_owner
        )

      other_user = insert(:user, email: "assign-other-coach-#{other_unique}@test.com")
      other_coach = insert(:coach, user: other_user, business: other_business)

      other_client_user =
        insert(:user, email: "assign-other-client-user-#{other_unique}@test.com")

      other_client =
        insert(:client,
          email: "assign-other-client-#{other_unique}@test.com",
          user: other_client_user,
          creator: other_coach,
          business: other_business
        )

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-plans/#{plan.id}/assign", %{
          "client_id" => other_client.id,
          "start_date" => "2026-01-01",
          "end_date" => "2026-01-31"
        })

      assert %{"error_code" => "not_found"} = json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/training-plans/:id/duplicate" do
    test "duplicates a template and preserves shared workout references", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      plan =
        insert(:training_plan,
          creator: coach,
          business: business,
          name: "PPL #{Ecto.UUID.generate()}"
        )

      shared_workout = insert(:workout, plan: plan, creator: coach, business: business, name: "Push")

      insert(:training_plan_item,
        plan: plan,
        workout: shared_workout,
        business: business,
        creator: coach,
        day_of_week: "monday"
      )

      insert(:training_plan_item,
        plan: plan,
        workout: shared_workout,
        business: business,
        creator: coach,
        day_of_week: "thursday"
      )

      conn = post(conn, "/v1/coach/training-plans/#{plan.id}/duplicate")
      assert %{"data" => data} = json_response(conn, 201)

      assert data["name"] == "#{plan.name} (Copy)"
      assert data["client_id"] == nil
      assert data["source_template_id"] == plan.id
      assert [copied_workout] = data["workouts"]
      assert copied_workout["name"] == "Push"
      assert copied_workout["id"] != shared_workout.id

      assert length(data["plan_items"]) == 2
      assert data["plan_items"] |> Enum.map(& &1["training_workout_id"]) |> Enum.uniq() == [copied_workout["id"]]
      assert data["plan_items"] |> Enum.map(& &1["day_of_week"]) |> Enum.sort() == ["monday", "thursday"]
    end

    test "returns 404 for another business template", %{conn: conn} do
      other_unique = Ecto.UUID.generate()
      other_owner = insert(:user, email: "duplicate-other-owner-#{other_unique}@test.com")

      other_business =
        insert(:business,
          name: "Duplicate Other Business #{other_unique}",
          handle: "duplicate-other-#{other_unique}",
          owner: other_owner
        )

      other_user = insert(:user, email: "duplicate-other-coach-#{other_unique}@test.com")
      other_coach = insert(:coach, user: other_user, business: other_business)
      plan = insert(:training_plan, creator: other_coach, business: other_business)

      conn = post(conn, "/v1/coach/training-plans/#{plan.id}/duplicate")

      assert %{"error_code" => "not_found"} = json_response(conn, 404)
    end
  end
end
