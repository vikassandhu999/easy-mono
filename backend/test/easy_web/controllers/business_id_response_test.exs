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
        |> Enum.map(fn {line, line_number} ->
          %{file: file, line: String.trim(line), line_number: line_number}
        end)
      end)
      |> Enum.map(fn offender -> "#{offender.file}:#{offender.line_number}" end)

    assert offenders == []
  end

  test "generated OpenAPI does not expose business_id" do
    offenders =
      EasyWeb.ApiSpec.spec()
      |> OpenApiSpex.OpenApi.to_map()
      |> business_id_paths()
      |> Enum.map(&format_path/1)

    assert offenders == []
  end

  defp business_id_paths(value), do: business_id_paths(value, [])

  defp business_id_paths(%{} = map, path) do
    Enum.flat_map(map, fn {key, value} ->
      key = to_string(key)
      child_path = path ++ [key]

      if key == "business_id" do
        [child_path | business_id_paths(value, child_path)]
      else
        business_id_paths(value, child_path)
      end
    end)
  end

  defp business_id_paths(list, path) when is_list(list) do
    list
    |> Enum.with_index()
    |> Enum.flat_map(fn {value, index} ->
      child_path = path ++ [index]
      paths = if value == "business_id", do: [child_path], else: []

      paths ++ business_id_paths(value, child_path)
    end)
  end

  defp business_id_paths(_value, _path), do: []

  defp format_path(path) do
    Enum.map_join(path, ".", &to_string/1)
  end
end
