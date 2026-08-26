defmodule EasyWeb.TypedRouteGenerationTest do
  use ExUnit.Case, async: false

  import ExUnit.CaptureIO

  alias Mix.Tasks.TypedRoutes.Gen

  test "standalone output separates methods with one comma" do
    Mix.Task.reenable("typed_routes.gen")

    output = capture_io(fn -> Gen.run(["--stdout"]) end)

    assert output =~ "'/v1/client/weight_entries': {"
    assert output =~ "get: {"
    assert output =~ "post: {"
    refute output =~ "},,"
  end
end
