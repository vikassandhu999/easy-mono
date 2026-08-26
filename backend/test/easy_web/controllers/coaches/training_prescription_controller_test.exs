defmodule EasyWeb.Coaches.TrainingPrescriptionControllerTest do
  use Easy.ConnCase

  describe "PUT /v1/coach/training-plans/:id/prescription" do
    test "rejects unknown nested body keys", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      exercise = insert(:exercise, business: coach.business)

      response =
        conn
        |> authenticate_coach(coach)
        |> put("/v1/coach/training-plans/#{template.id}/prescription", %{
          "expected_revision" => 1,
          "workouts" => [
            %{
              "name" => "Lower",
              "position" => 0,
              "prescribed_exercises" => [
                %{
                  "exercise_id" => exercise.id,
                  "position" => 0,
                  "prescribed_sets" => [%{"unexpected" => true}]
                }
              ]
            }
          ],
          "schedule" => schedule()
        })
        |> json_response(422)

      assert %{"error_code" => "invalid_input", "error_detail" => %{"fields" => fields}} = response

      assert fields["workouts.0.prescribed_exercises.0.prescribed_sets.0.unexpected"] == [
               "is unknown"
             ]
    end

    test "replaces and returns the complete Prescription", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      exercise = insert(:exercise, business: coach.business, name: "Back Squat")

      response =
        conn
        |> authenticate_coach(coach)
        |> put("/v1/coach/training-plans/#{template.id}/prescription", %{
          "expected_revision" => 1,
          "workouts" => [
            %{
              "local_ref" => "upper",
              "name" => "Upper",
              "position" => 20,
              "prescribed_exercises" => []
            },
            %{
              "local_ref" => "lower",
              "name" => "Lower",
              "position" => 10,
              "prescribed_exercises" => [
                %{
                  "local_ref" => "squat",
                  "exercise_id" => exercise.id,
                  "position" => 30,
                  "prescribed_sets" => [%{"reps" => "5", "duration_seconds" => 0, "rest_seconds" => 0}]
                }
              ]
            }
          ],
          "schedule" => schedule(%{"monday" => %{"workout_ref" => "lower"}, "friday" => %{"workout_ref" => "lower"}})
        })
        |> json_response(200)

      assert %{
               "data" => %{
                 "revision" => 2,
                 "workouts" => [
                   %{
                     "name" => "Lower",
                     "position" => 10,
                     "workout_elements" => [
                       %{
                         "position" => 30,
                         "exercise" => %{"name" => "Back Squat"},
                         "planned_sets" => [%{"reps" => "5", "duration_seconds" => 0, "rest_seconds" => 0}]
                       }
                     ]
                   },
                   %{
                     "name" => "Upper",
                     "position" => 20,
                     "workout_elements" => []
                   }
                 ],
                 "schedule" => %{"monday" => workout_id, "friday" => workout_id}
               }
             } = response
    end

    test "returns the structured stale revision error", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user, revision: 3)

      response =
        conn
        |> authenticate_coach(coach)
        |> put("/v1/coach/training-plans/#{template.id}/prescription", %{
          "expected_revision" => 2,
          "workouts" => [],
          "schedule" => schedule()
        })
        |> json_response(409)

      assert %{
               "error_code" => "stale_revision",
               "error_detail" => %{"current_revision" => 3}
             } = response
    end

    test "rejects duplicate request-local references without writing", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)

      response =
        conn
        |> authenticate_coach(coach)
        |> put("/v1/coach/training-plans/#{template.id}/prescription", %{
          "expected_revision" => 1,
          "workouts" => [
            %{"local_ref" => "same", "name" => "One", "position" => 0, "prescribed_exercises" => []},
            %{"local_ref" => "same", "name" => "Two", "position" => 1, "prescribed_exercises" => []}
          ],
          "schedule" => schedule()
        })
        |> json_response(422)

      assert %{"error_code" => "invalid_input"} = response
      assert Easy.Repo.get!(Easy.Training.TrainingPlan, template.id).revision == 1
    end

    test "rejects negative Prescribed Set values without writing", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      exercise = insert(:exercise, business: coach.business)

      response =
        conn
        |> authenticate_coach(coach)
        |> put("/v1/coach/training-plans/#{template.id}/prescription", %{
          "expected_revision" => 1,
          "workouts" => [
            %{
              "local_ref" => "lower",
              "name" => "Lower",
              "position" => 0,
              "prescribed_exercises" => [
                %{
                  "local_ref" => "squat",
                  "exercise_id" => exercise.id,
                  "position" => 0,
                  "prescribed_sets" => [%{"duration_seconds" => -1}]
                }
              ]
            }
          ],
          "schedule" => schedule()
        })
        |> json_response(422)

      assert %{
               "error_code" => "invalid_input",
               "error_detail" => %{"fields" => fields}
             } = response

      assert Map.has_key?(fields, "workouts.0.prescribed_exercises.0.prescribed_sets.0.duration_seconds")

      assert Easy.Repo.get!(Easy.Training.TrainingPlan, template.id).revision == 1
      assert Easy.Repo.aggregate(Easy.Training.TrainingWorkout, :count, :id) == 0
    end

    test "rejects out-of-range Prescribed Set rpe without writing", %{conn: conn} do
      coach = insert(:coach)
      template = insert(:training_plan, business: coach.business, creator: coach.user)
      exercise = insert(:exercise, business: coach.business)

      response =
        conn
        |> authenticate_coach(coach)
        |> put("/v1/coach/training-plans/#{template.id}/prescription", %{
          "expected_revision" => 1,
          "workouts" => [
            %{
              "local_ref" => "lower",
              "name" => "Lower",
              "position" => 0,
              "prescribed_exercises" => [
                %{
                  "local_ref" => "squat",
                  "exercise_id" => exercise.id,
                  "position" => 0,
                  "prescribed_sets" => [%{"rpe" => 11}]
                }
              ]
            }
          ],
          "schedule" => schedule()
        })
        |> json_response(422)

      assert %{"error_code" => "invalid_input", "error_detail" => %{"fields" => fields}} = response
      assert Map.has_key?(fields, "prescribed_sets")

      assert Easy.Repo.get!(Easy.Training.TrainingPlan, template.id).revision == 1
      assert Easy.Repo.aggregate(Easy.Training.TrainingWorkout, :count, :id) == 0
    end

    test "rejects positions above the storage maximum without writing", %{conn: conn} do
      coach = insert(:coach)
      exercise = insert(:exercise, business: coach.business)
      too_large = 2_147_483_648

      requests = [
        {
          insert(:training_plan, business: coach.business, creator: coach.user),
          "/workouts/0/position",
          [
            %{
              "local_ref" => "lower",
              "name" => "Lower",
              "position" => too_large,
              "prescribed_exercises" => []
            }
          ]
        },
        {
          insert(:training_plan, business: coach.business, creator: coach.user),
          "/workouts/0/prescribed_exercises/0/position",
          [
            %{
              "local_ref" => "lower",
              "name" => "Lower",
              "position" => 0,
              "prescribed_exercises" => [
                %{
                  "local_ref" => "squat",
                  "exercise_id" => exercise.id,
                  "position" => too_large,
                  "prescribed_sets" => []
                }
              ]
            }
          ]
        }
      ]

      for {template, _pointer, workouts} <- requests do
        response =
          conn
          |> authenticate_coach(coach)
          |> put("/v1/coach/training-plans/#{template.id}/prescription", %{
            "expected_revision" => 1,
            "workouts" => workouts,
            "schedule" => schedule()
          })
          |> json_response(422)

        assert %{"error_code" => "invalid_input", "error_detail" => %{"fields" => fields}} = response
        assert Map.has_key?(fields, "workouts")
        assert Easy.Repo.get!(Easy.Training.TrainingPlan, template.id).revision == 1
      end

      assert Easy.Repo.aggregate(Easy.Training.TrainingWorkout, :count, :id) == 0
    end
  end

  defp schedule(overrides \\ %{}) do
    for weekday <- ~w(monday tuesday wednesday thursday friday saturday sunday) do
      Map.merge(%{"weekday" => weekday}, Map.get(overrides, weekday, %{}))
    end
  end
end
