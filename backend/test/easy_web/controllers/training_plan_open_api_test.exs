defmodule EasyWeb.TrainingPlanOpenApiTest do
  use ExUnit.Case, async: true

  test "generated OpenAPI includes every training plan endpoint" do
    paths = EasyWeb.ApiSpec.spec().paths

    assert Map.has_key?(paths, "/v1/coach/training-plans"), inspect(Map.keys(paths))

    assert paths["/v1/coach/training-plans"].get.operationId == "listTrainingPlans"
    assert paths["/v1/coach/training-plans"].post.operationId == "createTrainingPlan"

    assert paths["/v1/coach/training-plans/{id}"].get.operationId == "getTrainingPlan"
    assert paths["/v1/coach/training-plans/{id}"].patch.operationId == "updateTrainingPlan"
    assert paths["/v1/coach/training-plans/{id}"].delete.operationId == "deleteTrainingPlan"

    assert paths["/v1/coach/clients/{client_id}/training-plans/{id}/assign"].post.operationId ==
             "assignTrainingPlan"

    assert paths["/v1/coach/training-plans/{id}/duplicate"].post.operationId ==
             "duplicateTrainingPlan"

    assert paths["/v1/client/training-plans"].get.operationId == "listClientTrainingPlans"

    assert paths["/v1/client/training-plans/coverage"].get.operationId ==
             "resolveClientTrainingCoverage"

    assert paths["/v1/client/training-plans/{id}"].get.operationId == "getClientTrainingPlan"
  end

  test "generated OpenAPI documents training plan bodies and status codes" do
    paths = EasyWeb.ApiSpec.spec().paths

    assert paths["/v1/coach/training-plans"].post.requestBody.required == true
    assert paths["/v1/coach/training-plans"].post.responses[201]
    assert paths["/v1/coach/training-plans"].post.responses[422]

    assert paths["/v1/coach/training-plans/{id}"].get.responses[200]
    assert paths["/v1/coach/training-plans/{id}"].get.responses[404]

    assert paths["/v1/coach/training-plans/{id}"].patch.requestBody.required == true
    assert paths["/v1/coach/training-plans/{id}"].patch.responses[200]
    assert paths["/v1/coach/training-plans/{id}"].patch.responses[422]

    assert paths["/v1/coach/training-plans/{id}"].delete.responses[204]
    assert paths["/v1/coach/training-plans/{id}"].delete.responses[404]

    assignment = paths["/v1/coach/clients/{client_id}/training-plans/{id}/assign"].post
    assert assignment.requestBody.required == true
    assert assignment.responses[201]

    assert Map.fetch!(assignment.responses[201].content["application/json"].schema, :"$ref") ==
             "#/components/schemas/CoachClientTrainingPlanResponse"

    assert assignment.responses[404]
    assert assignment.responses[422]

    assert paths["/v1/coach/training-plans/{id}/duplicate"].post.responses[201]
    assert paths["/v1/coach/training-plans/{id}/duplicate"].post.responses[404]

    assert paths["/v1/client/training-plans"].get.responses[200]
    coverage = paths["/v1/client/training-plans/coverage"].get
    assert coverage.responses[200]
    assert coverage.parameters |> Enum.find(&(&1.name == :date)) |> Map.fetch!(:schema) |> Map.fetch!(:format) == :date
    assert paths["/v1/client/training-plans/{id}"].get.responses[200]
    assert paths["/v1/client/training-plans/{id}"].get.responses[404]
  end

  test "client plan contract exposes nullable Coverage and the complete Prescription shape" do
    spec = EasyWeb.ApiSpec.spec() |> OpenApiSpex.resolve_schema_modules()
    schemas = spec.components.schemas
    client_plan = schemas["ClientTrainingPlan"]
    coverage_response = schemas["ClientTrainingCoverageResponse"]
    workout = schemas["TrainingPlanWorkout"]
    prescribed_exercise = schemas["TrainingPlanWorkoutExercise"]
    exercise = schemas["TrainingPlanExercise"]

    assert coverage_response.properties.data.nullable
    assert client_plan.properties.kind.enum == ["client_plan"]
    assert client_plan.properties.lifecycle.enum == ["incomplete", "upcoming", "current", "ended"]

    for field <- [:kind, :lifecycle, :workouts, :schedule] do
      assert field in client_plan.required
    end

    for field <- [:position, :training_plan_id, :workout_elements] do
      assert field in workout.required
    end

    for field <- [:position, :workout_id, :exercise, :planned_sets] do
      assert field in prescribed_exercise.required
    end

    assert :tracking_type in exercise.required
    assert :images in exercise.required

    refute Enum.any?(spec.paths["/v1/client/training-plans"].get.parameters, &(&1.name == :status))
  end
end
