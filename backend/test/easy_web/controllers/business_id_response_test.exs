defmodule EasyWeb.BusinessIdResponseTest do
  use ExUnit.Case, async: true

  test "JSON response serializers do not expose business_id" do
    offenders =
      ["lib/easy_web/controllers/**/*_json.ex", "lib/easy_web/controllers/response_helpers.ex"]
      |> Enum.flat_map(&Path.wildcard/1)
      |> Enum.flat_map(fn file ->
        file
        |> File.read!()
        |> String.split("\n")
        |> Enum.with_index(1)
        |> Enum.filter(fn {line, _line_number} -> String.contains?(line, "business_id:") end)
        |> Enum.map(fn {_line, line_number} -> "#{file}:#{line_number}" end)
      end)

    assert offenders == []
  end

  test "generated OpenAPI does not expose business_id" do
    spec_json =
      EasyWeb.ApiSpec.spec()
      |> OpenApiSpex.OpenApi.to_map()
      |> Jason.encode!()

    refute String.contains?(spec_json, ~s("business_id"))
  end
end
