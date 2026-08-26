defmodule EasyWeb.TypedRoute.Type do
  @type ir ::
          :string
          | :integer
          | :pos_integer
          | :non_neg_integer
          | :number
          | :float
          | :boolean
          | nil
          | :json
          | :datetime
          | :date
          | :decimal
          | {:atom, atom()}
          | {:list, ir()}
          | {:union, [ir()]}
          | {:record, [{atom(), :required | :optional, ir()}]}
          | {:dict, ir()}
          | {:remote, module(), atom()}

  @spec expand(Macro.t(), Macro.Env.t()) :: ir()
  def expand(ast, env) do
    ast
    |> expand_aliases(env)
    |> normalize([])
  end

  @spec fetch!(module(), atom()) :: ir()
  def fetch!(module, name) do
    from_beam!(module, name)
  end

  @spec from_beam!(module(), atom()) :: ir()
  def from_beam!(module, name) do
    key = {__MODULE__, module, name}

    case :persistent_term.get(key, :__miss__) do
      :__miss__ ->
        ir = load_from_beam!(module, name)
        :persistent_term.put(key, ir)
        ir

      ir ->
        ir
    end
  end

  @spec last_segment(module()) :: String.t()
  def last_segment(module) do
    module |> Module.split() |> List.last()
  end

  defp load_from_beam!(module, name) do
    {:ok, types} = Code.Typespec.fetch_types(module)

    spec =
      Enum.find_value(types, fn
        {:type, {^name, _, _} = spec} -> spec
        _ -> nil
      end) || raise ArgumentError, "#{inspect(module)} has no type #{name}"

    {:"::", _, [_lhs, rhs]} = Code.Typespec.type_to_quoted(spec)
    expand(rhs, %{__ENV__ | module: module, aliases: []})
  end

  defp expand_aliases(ast, env) do
    Macro.postwalk(ast, fn
      {:__aliases__, _, _} = aliases -> Macro.expand(aliases, env)
      other -> other
    end)
  end

  defp normalize({:|, _, [left, right]}, path) do
    {:union, flatten_union(normalize(left, path), normalize(right, path))}
  end

  defp normalize({:data, _, [inner]}, path), do: data(normalize(inner, path ++ ["data"]))
  defp normalize({:page, _, [inner]}, path), do: page(normalize(inner, path ++ ["page"]))

  defp normalize({{:., _, [{:__aliases__, _, [:EasyWeb, :Types]}, :data]}, _, [inner]}, path) do
    data(normalize(inner, path ++ ["data"]))
  end

  defp normalize({{:., _, [EasyWeb.Types, :data]}, _, [inner]}, path) do
    data(normalize(inner, path ++ ["data"]))
  end

  defp normalize({{:., _, [{:__aliases__, _, [:EasyWeb, :Types]}, :page]}, _, [inner]}, path) do
    page(normalize(inner, path ++ ["page"]))
  end

  defp normalize({{:., _, [EasyWeb.Types, :page]}, _, [inner]}, path) do
    page(normalize(inner, path ++ ["page"]))
  end

  defp normalize({{:., _, [mod, name]}, _, []}, path) when is_atom(mod) and is_atom(name) do
    remote(mod, name, path)
  end

  defp normalize({:__aliases__, _, _} = aliases, path) do
    raise ArgumentError, "illegal wire type #{format_path(path)}: #{Macro.to_string(aliases)}"
  end

  defp normalize({:String, _, []}, path) do
    raise ArgumentError, "illegal wire type #{format_path(path)}: String (use String.t())"
  end

  defp normalize({:json, _, []}, _path), do: :json
  defp normalize({{:., _, [EasyWeb.Types, :json]}, _, []}, _path), do: :json

  defp normalize({{:., _, [{:__aliases__, _, [:EasyWeb, :Types]}, :json]}, _, []}, _path), do: :json

  defp normalize({:non_neg_integer, _, []}, _path), do: :non_neg_integer
  defp normalize({:pos_integer, _, []}, _path), do: :pos_integer
  defp normalize({:integer, _, []}, _path), do: :integer
  defp normalize({:float, _, []}, _path), do: :float
  defp normalize({:number, _, []}, _path), do: :number
  defp normalize({:boolean, _, []}, _path), do: :boolean
  defp normalize({:binary, _, []}, _path), do: :string
  defp normalize([inner], path), do: {:list, normalize(inner, path ++ ["[]"])}

  defp normalize({:%{}, _, pairs}, path) when is_list(pairs) do
    normalize_map(pairs, path)
  end

  defp normalize(nil, _path), do: nil
  defp normalize(atom, _path) when is_atom(atom), do: {:atom, atom}

  defp normalize(other, path) do
    raise ArgumentError, "illegal wire type #{format_path(path)}: #{Macro.to_string(other)}"
  end

  defp remote(String, :t, _path), do: :string
  defp remote(DateTime, :t, _path), do: :datetime
  defp remote(Date, :t, _path), do: :date
  defp remote(Decimal, :t, _path), do: :decimal

  defp remote(mod, name, path) do
    cond do
      not_wire_module?(mod) ->
        raise ArgumentError, "illegal wire type #{format_path(path)}: #{inspect(mod)}.#{name}()"

      name == :json and mod == EasyWeb.Types ->
        :json

      true ->
        {:remote, mod, name}
    end
  end

  defp not_wire_module?(mod) do
    match?({:error, _}, Code.ensure_compiled(mod)) or
      function_exported?(mod, :__schema__, 1)
  end

  defp data(inner) do
    {:record, [{:data, :required, inner}]}
  end

  defp page(inner) do
    {:record, [{:data, :required, {:list, inner}}, {:count, :required, :non_neg_integer}]}
  end

  defp flatten_union({:union, left}, {:union, right}), do: left ++ right
  defp flatten_union({:union, left}, right), do: left ++ [right]
  defp flatten_union(left, {:union, right}), do: [left | right]
  defp flatten_union(left, right), do: [left, right]

  defp normalize_map([{key, value}], path) do
    case normalize_map_key(key) do
      {:dict, inner_key} ->
        _ = inner_key
        {:dict, normalize(value, path ++ ["*"])}

      {:field, name, req} ->
        {:record, [{name, req, normalize(value, path ++ [Atom.to_string(name)])}]}
    end
  end

  defp normalize_map(pairs, path) do
    fields =
      Enum.map(pairs, fn {key, value} ->
        case normalize_map_key(key) do
          {:field, name, req} ->
            {name, req, normalize(value, path ++ [Atom.to_string(name)])}

          {:dict, _} ->
            raise ArgumentError, "illegal wire type #{format_path(path)}: mixed record and dictionary map"
        end
      end)

    {:record, fields}
  end

  defp normalize_map_key({:required, _, [name]}) when is_atom(name), do: {:field, name, :required}
  defp normalize_map_key({:required, _, [key]}), do: normalize_map_key(key)
  defp normalize_map_key({:optional, _, [name]}) when is_atom(name), do: {:field, name, :optional}
  defp normalize_map_key(name) when is_atom(name), do: {:field, name, :required}

  defp normalize_map_key({{:., _, [String, :t]}, _, []}), do: {:dict, :string}
  defp normalize_map_key({{:., _, [{:__aliases__, _, [:String]}, :t]}, _, []}), do: {:dict, :string}

  defp normalize_map_key(other) do
    raise ArgumentError, "illegal map key #{Macro.to_string(other)}"
  end

  defp format_path([]), do: "$"
  defp format_path(path), do: Enum.join(path, ".")
end
