defmodule EasyWeb.TypedRoute.Emit do
  alias EasyWeb.TypedRoute.Type

  @spec type_name(module(), atom()) :: String.t()
  def type_name(mod, :t), do: Type.last_segment(mod)

  def type_name(mod, name) do
    Type.last_segment(mod) <> Macro.camelize(Atom.to_string(name))
  end

  @spec ir_to_ts(Type.ir(), map()) :: String.t()
  def ir_to_ts(ir, named \\ %{})

  def ir_to_ts({:remote, mod, name}, named) do
    Map.get_lazy(named, {mod, name}, fn -> type_name(mod, name) end)
  end

  def ir_to_ts(:string, _named), do: "string"
  def ir_to_ts(:integer, _named), do: "number"
  def ir_to_ts(:pos_integer, _named), do: "number"
  def ir_to_ts(:non_neg_integer, _named), do: "number"
  def ir_to_ts(:number, _named), do: "number"
  def ir_to_ts(:float, _named), do: "number"
  def ir_to_ts(:boolean, _named), do: "boolean"
  def ir_to_ts(nil, _named), do: "null"
  def ir_to_ts(:json, _named), do: "unknown"
  def ir_to_ts(:datetime, _named), do: "string"
  def ir_to_ts(:date, _named), do: "string"
  def ir_to_ts(:decimal, _named), do: "string"
  def ir_to_ts({:atom, atom}, _named), do: inspect(Atom.to_string(atom))

  def ir_to_ts({:list, inner}, named), do: "Array<#{ir_to_ts(inner, named)}>"

  def ir_to_ts({:union, variants}, named) do
    Enum.map_join(variants, " | ", &ir_to_ts(&1, named))
  end

  def ir_to_ts({:dict, inner}, named) do
    "{ [key: string]: #{ir_to_ts(inner, named)} }"
  end

  def ir_to_ts({:record, fields}, named) do
    inner =
      Enum.map_join(fields, "; ", fn {name, req, ir} ->
        key = Atom.to_string(name)
        ts = ir_to_ts(ir, named)
        if req == :optional, do: "#{key}?: #{ts}", else: "#{key}: #{ts}"
      end)

    "{ #{inner} }"
  end

  @spec named_aliases(Type.ir(), map()) :: map()
  def named_aliases(ir, acc \\ %{})

  def named_aliases({:remote, mod, name}, acc) do
    acc = Map.put_new(acc, {mod, name}, type_name(mod, name))
    named_aliases(Type.fetch!(mod, name), acc)
  end

  def named_aliases({:list, inner}, acc), do: named_aliases(inner, acc)
  def named_aliases({:union, variants}, acc), do: Enum.reduce(variants, acc, &named_aliases/2)
  def named_aliases({:dict, inner}, acc), do: named_aliases(inner, acc)

  def named_aliases({:record, fields}, acc) do
    Enum.reduce(fields, acc, fn {_n, _r, ir}, acc -> named_aliases(ir, acc) end)
  end

  def named_aliases(_ir, acc), do: acc

  @spec export_named_types(map()) :: String.t()
  def export_named_types(named) do
    named
    |> Enum.sort_by(fn {_k, ts_name} -> ts_name end)
    |> Enum.map_join("\n", fn {{mod, name}, ts_name} ->
      "export type #{ts_name} = #{ir_to_ts(Type.fetch!(mod, name), named)};"
    end)
  end

  @spec path_template(String.t()) :: String.t()
  def path_template(phoenix_path) do
    String.replace(phoenix_path, ~r/:([A-Za-z0-9_]+)/, "{\\1}")
  end
end
