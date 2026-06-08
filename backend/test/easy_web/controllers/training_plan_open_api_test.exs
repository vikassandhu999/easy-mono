defmodule EasyWeb.TrainingPlanOpenApiTest do
  use ExUnit.Case, async: true

  test "generated OpenAPI includes every training plan endpoint" do
    paths = EasyWeb.ApiSpec.spec().paths

    assert Map.has_key?(paths, "/v1/coach/training_plans"), inspect(Map.keys(paths))

    assert paths["/v1/coach/training_plans"].get.operationId == "listTrainingPlans"
    assert paths["/v1/coach/training_plans"].post.operationId == "createTrainingPlan"

    assert paths["/v1/coach/training_plans/{id}"].get.operationId == "getTrainingPlan"
    assert paths["/v1/coach/training_plans/{id}"].patch.operationId == "updateTrainingPlan"
    assert paths["/v1/coach/training_plans/{id}"].delete.operationId == "deleteTrainingPlan"

    assert paths["/v1/coach/training_plans/{id}/assign"].post.operationId == "assignTrainingPlan"

    assert paths["/v1/coach/training_plans/{id}/duplicate"].post.operationId ==
             "duplicateTrainingPlan"

    assert paths["/v1/client/training_plans"].get.operationId == "listClientTrainingPlans"
    assert paths["/v1/client/training_plans/{id}"].get.operationId == "getClientTrainingPlan"
  end

  test "generated OpenAPI documents training plan bodies and status codes" do
    paths = EasyWeb.ApiSpec.spec().paths

    assert paths["/v1/coach/training_plans"].post.requestBody.required == true
    assert paths["/v1/coach/training_plans"].post.responses[201]
    assert paths["/v1/coach/training_plans"].post.responses[422]

    assert paths["/v1/coach/training_plans/{id}"].get.responses[200]
    assert paths["/v1/coach/training_plans/{id}"].get.responses[404]

    assert paths["/v1/coach/training_plans/{id}"].patch.requestBody.required == true
    assert paths["/v1/coach/training_plans/{id}"].patch.responses[200]
    assert paths["/v1/coach/training_plans/{id}"].patch.responses[422]

    assert paths["/v1/coach/training_plans/{id}"].delete.responses[204]
    assert paths["/v1/coach/training_plans/{id}"].delete.responses[404]

    assert paths["/v1/coach/training_plans/{id}/assign"].post.requestBody.required == true
    assert paths["/v1/coach/training_plans/{id}/assign"].post.responses[201]
    assert paths["/v1/coach/training_plans/{id}/assign"].post.responses[422]

    assert paths["/v1/coach/training_plans/{id}/duplicate"].post.responses[201]
    assert paths["/v1/coach/training_plans/{id}/duplicate"].post.responses[404]

    assert paths["/v1/client/training_plans"].get.responses[200]
    assert paths["/v1/client/training_plans/{id}"].get.responses[200]
    assert paths["/v1/client/training_plans/{id}"].get.responses[404]
  end
end
