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
end
