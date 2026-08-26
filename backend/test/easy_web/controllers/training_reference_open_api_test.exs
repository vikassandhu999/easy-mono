defmodule EasyWeb.TrainingReferenceOpenApiTest do
  use ExUnit.Case, async: true

  test "generated OpenAPI excludes typed training reference endpoints" do
    paths = EasyWeb.ApiSpec.spec().paths

    refute Map.has_key?(paths, "/v1/coach/training-equipment")
    refute Map.has_key?(paths, "/v1/coach/training-muscles")
  end
end
