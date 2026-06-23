defmodule EasyWeb.TrainingReferenceOpenApiTest do
  use ExUnit.Case, async: true

  test "generated OpenAPI includes muscle and equipment endpoints" do
    paths = EasyWeb.ApiSpec.spec().paths

    assert paths["/v1/coach/training-muscles"].get.operationId == "listMuscles"
    assert paths["/v1/coach/training-equipment"].get.operationId == "listEquipment"
  end
end
