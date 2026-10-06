defmodule EasyWeb.TypedRouteGenerationTest do
  use ExUnit.Case, async: false

  import ExUnit.CaptureIO

  alias EasyWeb.TypedRoute.Type
  alias Mix.Tasks.TypedRoutes.Gen

  test "optional string keys support sparse nutrient dictionaries" do
    input = quote(do: %{optional(String.t()) => number()})
    assert Type.expand(input, __ENV__) == {:dict, :number}
  end

  test "standalone output separates methods with one comma" do
    Mix.Task.reenable("typed_routes.gen")

    output = capture_io(fn -> Gen.run(["--stdout"]) end)

    assert output =~ "'/v1/coach/nutrition-plans': {"
    assert output =~ "get: {"
    assert output =~ "post: {"
    refute output =~ "},,"
  end
end
