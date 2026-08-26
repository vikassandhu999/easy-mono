defmodule EasyWeb.TrainingPlanOpenApiTest do
  use ExUnit.Case, async: true

  test "generated OpenAPI does not include replaced child mutation routes" do
    spec = EasyWeb.ApiSpec.spec() |> OpenApiSpex.resolve_schema_modules()
    paths = spec.paths
    components = Map.keys(spec.components.schemas)

    refute Map.has_key?(paths, "/v1/coach/training-plans/{plan_id}/training-workouts")
    refute Map.has_key?(paths, "/v1/coach/training-workouts/{id}")
    refute Map.has_key?(paths, "/v1/coach/training-workouts/{workout_id}/exercises")
    refute Map.has_key?(paths, "/v1/coach/training-workouts/{workout_id}/exercises/reorder")
    refute Map.has_key?(paths, "/v1/coach/training-workout-exercises/{id}")
    refute Map.has_key?(paths, "/v1/coach/training-plans/{plan_id}/schedule")

    refute "TrainingWorkoutRequest" in components
    refute "TrainingWorkoutReorderRequest" in components
    refute "TrainingScheduleRequest" in components
  end
end
