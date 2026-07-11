defmodule EasyWeb.OpenApiRouteCoverageTest do
  use ExUnit.Case, async: true

  @http_methods [:delete, :get, :patch, :post, :put]
  @excluded_plugs [OpenApiSpex.Plug.RenderSpec, OpenApiSpex.Plug.SwaggerUI]

  test "generated OpenAPI includes every application route" do
    paths = EasyWeb.ApiSpec.spec().paths

    missing_routes =
      EasyWeb.Router.__routes__()
      |> Enum.reject(&(excluded_route?(&1) or documented_route?(&1, paths)))
      |> Enum.map(&route_name/1)

    assert missing_routes == []
  end

  test "each application route has a controller-local OpenApiSpex operation" do
    missing_operations =
      EasyWeb.Router.__routes__()
      |> Enum.reject(&(excluded_route?(&1) or controller_operation?(&1)))
      |> Enum.map(&route_name/1)

    assert missing_operations == []
  end

  test "each write route runs CastAndValidate" do
    missing_validation =
      EasyWeb.Router.__routes__()
      |> Enum.filter(&(&1.verb in [:delete, :patch, :post, :put]))
      |> Enum.reject(&cast_and_validate?/1)
      |> Enum.map(&route_name/1)

    assert missing_validation == []
  end

  defp excluded_route?(%{plug: plug}), do: plug in @excluded_plugs

  defp controller_operation?(%{plug: plug, plug_opts: action}) do
    Code.ensure_loaded?(plug) and
      function_exported?(plug, :open_api_operation, 1) and
      match?(%OpenApiSpex.Operation{}, plug.open_api_operation(action))
  end

  defp cast_and_validate?(route) do
    source = route.plug.module_info(:compile)[:source] |> to_string()
    ast = source |> File.read!() |> Code.string_to_quoted!()

    {_ast, scopes} =
      Macro.prewalk(ast, [], fn
        {:plug, _, [plug_module, opts]} = node, scopes ->
          if Macro.to_string(plug_module) == "OpenApiSpex.Plug.CastAndValidate" do
            {node, [cast_scope(opts) | scopes]}
          else
            {node, scopes}
          end

        node, scopes ->
          {node, scopes}
      end)

    Enum.any?(scopes, &(&1 == :all or route.plug_opts in &1))
  end

  defp cast_scope({:when, _, [_opts, {:in, _, [{:action, _, _}, actions]}]}) when is_list(actions),
    do: actions

  defp cast_scope(_opts), do: :all

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
