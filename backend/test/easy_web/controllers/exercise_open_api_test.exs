defmodule EasyWeb.ExerciseOpenApiTest do
  use ExUnit.Case, async: true

  test "generated OpenAPI includes every exercise endpoint" do
    paths = EasyWeb.ApiSpec.spec().paths

    assert Map.has_key?(paths, "/v1/coach/exercises"), inspect(Map.keys(paths))

    assert paths["/v1/coach/exercises"].get.operationId == "listCoachExercises"
    assert paths["/v1/coach/exercises"].post.operationId == "createExercise"

    assert paths["/v1/coach/exercises/{id}"].get.operationId == "getExercise"
    assert paths["/v1/coach/exercises/{id}"].patch.operationId == "updateExercise"
    assert paths["/v1/coach/exercises/{id}"].delete.operationId == "deleteExercise"

    assert paths["/v1/coach/exercises/{id}/duplicate"].post.operationId == "duplicateExercise"

    assert paths["/v1/client/exercises"].get.operationId == "listClientExercises"
    assert paths["/v1/client/exercises/{id}"].get.operationId == "getClientExercise"
  end
end
