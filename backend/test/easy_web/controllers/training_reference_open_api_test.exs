defmodule EasyWeb.TrainingReferenceOpenApiTest do
  use ExUnit.Case, async: true

  test "generated OpenAPI includes muscle and equipment endpoints" do
    paths = EasyWeb.ApiSpec.spec().paths

    assert paths["/v1/coach/muscles"].get.operationId == "listMuscles"
    assert paths["/v1/coach/equipment"].get.operationId == "listEquipment"
  end
end
