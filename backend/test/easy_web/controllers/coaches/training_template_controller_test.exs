defmodule EasyWeb.Coaches.TrainingTemplateControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  alias Easy.Repo
  alias Easy.Training.TrainingPlan

  describe "Training Template collection" do
    test "creates and lists discriminated templates", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)

      create_conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-plans", %{
          "name" => "Strength Foundation",
          "description" => "Reusable block"
        })

      assert %{"data" => created} = json_response(create_conn, 201)
      assert created["kind"] == "template"
      assert created["name"] == "Strength Foundation"
      assert created["revision"] == 1
      assert created["archived_at"] == nil
      assert created["client_id"] == nil
      refute Map.has_key?(created, "business_id")
      assert_schema(created, "TrainingPlan", EasyWeb.ApiSpec.spec())

      plan = Repo.get!(TrainingPlan, created["id"])
      workout = insert(:workout, business: coach.business, plan: plan, name: "Upper", position: 0)
      exercise = insert(:exercise, business: coach.business, name: "Bench Press")

      insert(:prescribed_exercise,
        business: coach.business,
        workout: workout,
        exercise: exercise,
        position: 0,
        prescribed_sets: [%{set_type: :working, reps: "8-10"}]
      )

      insert(:workout_schedule,
        business: coach.business,
        plan: plan,
        workout: workout,
        weekday: :monday
      )

      list_conn = get(conn, "/v1/coach/training-plans", %{"search" => "strength"})

      assert %{"data" => [listed], "count" => 1} = json_response(list_conn, 200)
      assert listed["id"] == created["id"]
      assert listed["kind"] == "template"
      assert [%{"workout_elements" => [element], "weekdays" => ["monday"]}] = listed["workouts"]
      assert element["exercise"]["name"] == "Bench Press"
      assert [%{"reps" => "8-10"}] = element["planned_sets"]
      assert listed["schedule"]["monday"] == workout.id
      assert listed["schedule"]["tuesday"] == nil
      assert_schema(listed, "TrainingPlan", EasyWeb.ApiSpec.spec())
    end

    test "rejects client-plan fields on the template collection", %{conn: conn} do
      coach = insert(:coach)

      response =
        conn
        |> authenticate_coach(coach)
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/training-plans", %{
          "name" => "Invalid Template",
          "client_id" => Ecto.UUID.generate(),
          "start_date" => "2026-08-15"
        })

      assert %{"errors" => [_ | _]} = json_response(response, 422)
    end
  end

  describe "Training Template lifecycle" do
    test "shows, updates, archives, restores, and deletes through revisioned commands", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      workout = insert(:workout, business: coach.business, plan: template, position: 0)
      exercise = insert(:exercise, business: coach.business)

      insert(:prescribed_exercise,
        business: coach.business,
        workout: workout,
        exercise: exercise,
        position: 0
      )

      show_conn = get(conn, "/v1/coach/training-plans/#{template.id}")
      assert %{"data" => shown} = json_response(show_conn, 200)
      assert shown["kind"] == "template"
      assert shown["revision"] == 1
      assert [%{"workout_elements" => [_]}] = shown["workouts"]
      assert_schema(shown, "TrainingPlan", EasyWeb.ApiSpec.spec())

      update_conn =
        patch(conn, "/v1/coach/training-plans/#{template.id}", %{
          "expected_revision" => 1,
          "name" => "Revised Template"
        })

      assert %{"data" => %{"name" => "Revised Template", "revision" => 2}} =
               json_response(update_conn, 200)

      stale_conn =
        patch(conn, "/v1/coach/training-plans/#{template.id}", %{
          "expected_revision" => 1,
          "name" => "Lost write"
        })

      stale_response = json_response(stale_conn, 409)

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 2}
             } = stale_response

      assert_schema(stale_response, "TrainingPlanStaleRevisionError", EasyWeb.ApiSpec.spec())
      assert Repo.get!(TrainingPlan, template.id).name == "Revised Template"

      stale_archive_conn =
        post(conn, "/v1/coach/training-plans/#{template.id}/archive", %{"expected_revision" => 1})

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 2}
             } = json_response(stale_archive_conn, 409)

      assert Repo.get!(TrainingPlan, template.id).archived_at == nil
      assert Repo.get!(TrainingPlan, template.id).name == "Revised Template"

      archive_conn =
        post(conn, "/v1/coach/training-plans/#{template.id}/archive", %{"expected_revision" => 2})

      assert %{"data" => %{"archived_at" => archived_at, "revision" => 3}} =
               json_response(archive_conn, 200)

      assert archived_at

      stale_restore_conn =
        post(conn, "/v1/coach/training-plans/#{template.id}/restore", %{"expected_revision" => 2})

      stale_restore_response = json_response(stale_restore_conn, 409)

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 3}
             } = stale_restore_response

      assert Repo.get!(TrainingPlan, template.id).archived_at

      restore_conn =
        post(conn, "/v1/coach/training-plans/#{template.id}/restore", %{"expected_revision" => 3})

      assert %{"data" => %{"archived_at" => nil, "revision" => 4}} =
               json_response(restore_conn, 200)

      delete_conn = delete(conn, "/v1/coach/training-plans/#{template.id}?expected_revision=4")

      assert response(delete_conn, 204) == ""
      assert Repo.get(TrainingPlan, template.id) == nil
    end

    test "conceals another business Template for every lifecycle operation", %{conn: conn} do
      coach = insert(:coach)
      other = insert(:coach)
      hidden = insert(:training_plan, business: other.business, creator: other.user)
      conn = authenticate_coach(conn, coach)

      assert json_response(get(conn, "/v1/coach/training-plans/#{hidden.id}"), 404)

      assert json_response(
               patch(conn, "/v1/coach/training-plans/#{hidden.id}", %{
                 "expected_revision" => 1,
                 "name" => "Nope"
               }),
               404
             )

      assert json_response(
               post(conn, "/v1/coach/training-plans/#{hidden.id}/archive", %{
                 "expected_revision" => 1
               }),
               404
             )

      assert json_response(
               post(conn, "/v1/coach/training-plans/#{hidden.id}/restore", %{
                 "expected_revision" => 1
               }),
               404
             )

      assert json_response(
               delete(conn, "/v1/coach/training-plans/#{hidden.id}?expected_revision=1"),
               404
             )
    end

    test "preserves the shared Client Plan detail, Coverage, and end-plan flow", %{conn: conn} do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      client_plan =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-09-01]
        )

      conn = authenticate_coach(conn, coach)

      assert %{"data" => %{"kind" => "client_plan", "revision" => 1}} =
               conn
               |> get("/v1/coach/training-plans/#{client_plan.id}")
               |> json_response(200)

      assert %{
               "data" => %{
                 "start_date" => "2026-09-08",
                 "end_date" => "2026-10-08",
                 "revision" => 2
               }
             } =
               conn
               |> patch("/v1/coach/training-plans/#{client_plan.id}", %{
                 "expected_revision" => 1,
                 "start_date" => "2026-09-08",
                 "end_date" => "2026-10-08"
               })
               |> json_response(200)

      assert %{"data" => %{"archived_at" => archived_at, "revision" => 3}} =
               conn
               |> post("/v1/coach/training-plans/#{client_plan.id}/archive", %{
                 "expected_revision" => 2
               })
               |> json_response(200)

      assert archived_at
    end

    test "returns validation instead of raising when Client Plan restore conflicts with Coverage", %{conn: conn} do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      archived_plan =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-09-01],
          end_date: ~D[2026-09-30],
          archived_at: ~U[2026-08-15 12:00:00Z]
        )

      insert(:training_plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: ~D[2026-09-15],
        end_date: ~D[2026-10-15]
      )

      response =
        conn
        |> authenticate_coach(coach)
        |> post("/v1/coach/training-plans/#{archived_plan.id}/restore", %{
          "expected_revision" => 1
        })
        |> json_response(422)

      assert %{
               "error_code" => "invalid_input",
               "error_detail" => %{"fields" => %{"start_date" => [_]}}
             } = response
    end
  end

  describe "Training Template duplication" do
    test "duplicates only an active Template with a complete independent Prescription", %{conn: conn} do
      coach = insert(:coach)
      conn = authenticate_coach(conn, coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user, name: "HTTP Strength")
      squat = insert(:exercise, business: coach.business, name: "Back Squat")
      press = insert(:exercise, business: coach.business, name: "Press")
      lower = insert(:workout, business: coach.business, plan: template, name: "Lower", position: 10)
      upper = insert(:workout, business: coach.business, plan: template, name: "Upper", position: 20)

      lower_item =
        insert(:prescribed_exercise,
          business: coach.business,
          workout: lower,
          exercise: squat,
          position: 0,
          prescribed_sets: [%{set_type: :working, reps: "5", load_value: Decimal.new("100"), load_unit: :kg}]
        )

      upper_item =
        insert(:prescribed_exercise,
          business: coach.business,
          workout: upper,
          exercise: press,
          position: 0,
          prescribed_sets: [%{set_type: :working, reps: "8-10"}]
        )

      insert(:workout_schedule, business: coach.business, plan: template, workout: lower, weekday: :monday)
      insert(:workout_schedule, business: coach.business, plan: template, workout: upper, weekday: :friday)

      response =
        conn
        |> post("/v1/coach/training-plans/#{template.id}/duplicate")
        |> json_response(201)

      assert %{
               "data" =>
                 %{
                   "id" => duplicate_id,
                   "kind" => "template",
                   "name" => "HTTP Strength (Copy)",
                   "revision" => 1,
                   "client_id" => nil,
                   "source_template_id" => nil,
                   "workouts" => [
                     %{
                       "id" => copied_lower_id,
                       "name" => "Lower",
                       "position" => 10,
                       "workout_elements" => [
                         %{
                           "id" => copied_lower_item_id,
                           "exercise_id" => squat_id,
                           "planned_sets" => [%{"reps" => "5", "load_unit" => "kg"}]
                         }
                       ]
                     },
                     %{
                       "id" => copied_upper_id,
                       "name" => "Upper",
                       "position" => 20,
                       "workout_elements" => [
                         %{
                           "id" => copied_upper_item_id,
                           "exercise_id" => press_id,
                           "planned_sets" => [%{"reps" => "8-10"}]
                         }
                       ]
                     }
                   ],
                   "schedule" => copied_schedule
                 } = data
             } = response

      assert duplicate_id != template.id
      assert copied_lower_id != lower.id
      assert copied_upper_id != upper.id
      assert copied_lower_item_id != lower_item.id
      assert copied_upper_item_id != upper_item.id
      assert squat_id == squat.id
      assert press_id == press.id
      assert copied_schedule["monday"] == copied_lower_id
      assert copied_schedule["friday"] == copied_upper_id
      assert_schema(data, "TrainingPlan", EasyWeb.ApiSpec.spec())
    end

    test "returns not found for archived, Client Plan, and cross-tenant sources", %{conn: conn} do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      other = insert(:coach)
      conn = authenticate_coach(conn, coach)

      archived =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          archived_at: ~U[2026-08-15 12:00:00Z]
        )

      client_plan =
        insert(:training_plan,
          business: coach.business,
          creator: coach.user,
          client: client,
          kind: :client_plan,
          start_date: ~D[2026-09-01]
        )

      hidden = insert(:training_plan, business: other.business, creator: other.user)

      for source <- [archived, client_plan, hidden] do
        response =
          conn
          |> post("/v1/coach/training-plans/#{source.id}/duplicate")
          |> json_response(404)

        assert %{"error_code" => "not_found"} = response
      end
    end
  end
end
