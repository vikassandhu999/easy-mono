defmodule EasyWeb.ExerciseOpenApiTest do
  use ExUnit.Case, async: true

  test "generated OpenAPI includes every exercise endpoint" do
    paths = EasyWeb.ApiSpec.spec().paths

    assert Map.has_key?(paths, "/v1/coach/training-exercises"), inspect(Map.keys(paths))

    assert paths["/v1/coach/training-exercises"].get.operationId == "listCoachExercises"
    assert paths["/v1/coach/training-exercises"].post.operationId == "createExercise"

    assert paths["/v1/coach/training-exercises/{id}"].get.operationId == "getExercise"
    assert paths["/v1/coach/training-exercises/{id}"].patch.operationId == "updateExercise"
    assert paths["/v1/coach/training-exercises/{id}"].delete.operationId == "deleteExercise"

    assert paths["/v1/coach/training-exercises/{id}/copy"].post.operationId == "copyExercise"

    assert paths["/v1/client/training-exercises"].get.operationId == "listClientExercises"
    assert paths["/v1/client/training-exercises/{id}"].get.operationId == "getClientExercise"
  end
end
