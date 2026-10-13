defmodule EasyWeb.TypedRouteGenerationTest do
  use ExUnit.Case, async: false

  alias EasyWeb.TypedRoute.Type

  test "optional string keys support sparse nutrient dictionaries" do
    input = quote(do: %{optional(String.t()) => number()})
    assert Type.expand(input, __ENV__) == {:dict, :number}
  end
end
