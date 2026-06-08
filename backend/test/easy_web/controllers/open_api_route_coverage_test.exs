defmodule EasyWeb.OpenApiRouteCoverageTest do
  use ExUnit.Case, async: true

  @http_methods [:delete, :get, :patch, :post, :put]
  @excluded_plugs [OpenApiSpex.Plug.RenderSpec, OpenApiSpex.Plug.SwaggerUI]

  test "generated OpenAPI includes every application route" do
    paths = EasyWeb.ApiSpec.spec().paths

    missing_routes =
      EasyWeb.Router.__routes__()
      |> Enum.reject(&excluded_route?/1)
      |> Enum.reject(&documented_route?(&1, paths))
      |> Enum.map(&route_name/1)

    assert missing_routes == []
  end

  test "each application route has a controller-local OpenApiSpex operation" do
    missing_operations =
      EasyWeb.Router.__routes__()
      |> Enum.reject(&excluded_route?/1)
      |> Enum.reject(&controller_operation?/1)
      |> Enum.map(&route_name/1)

    assert missing_operations == []
  end

  defp excluded_route?(%{plug: plug}), do: plug in @excluded_plugs

  defp controller_operation?(%{plug: plug, plug_opts: action}) do
    Code.ensure_loaded?(plug) and
      function_exported?(plug, :open_api_operation, 1) and
      match?(%OpenApiSpex.Operation{}, plug.open_api_operation(action))
  end

  defp documented_route?(%{verb: verb, path: path}, paths) when verb in @http_methods do
    open_api_path = open_api_path(path)

    case Map.get(paths, open_api_path) do
      nil -> false
      path_item -> not is_nil(Map.get(path_item, verb))
    end
  end

  defp documented_route?(_route, _paths), do: true

  defp open_api_path(path) do
    Regex.replace(~r/:([A-Za-z0-9_]+)/, path, "{\\1}")
  end

  defp route_name(%{verb: verb, path: path, plug: plug, plug_opts: action}) do
    "#{String.upcase(to_string(verb))} #{path} #{inspect(plug)}.#{action}"
  end
end
