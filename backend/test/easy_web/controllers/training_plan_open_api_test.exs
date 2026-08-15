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
    assert paths["/v1/client/training-plans/{id}"].get.responses[200]
    assert paths["/v1/client/training-plans/{id}"].get.responses[404]
  end
end
