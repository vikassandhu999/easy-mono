defmodule EasyWeb.TypedRoute.Dump do
  alias EasyWeb.TypedRoute.Type

  @spec pick(term(), Type.ir()) :: term()
  def pick(%Ecto.Association.NotLoaded{}, _ir) do
    raise ArgumentError, "got %Ecto.Association.NotLoaded{}"
  end

  def pick(nil, {:union, _variants}), do: nil

  def pick(nil, nil), do: nil

  def pick(list, {:list, inner}) when is_list(list) do
    Enum.map(list, &pick(&1, inner))
  end

  def pick(value, {:remote, mod, :t}) do
    remote(value, mod)
  end

  def pick(value, {:union, variants}) do
    case Enum.find(variants, &match_remote_t?(&1)) do
      {:remote, mod, :t} when is_struct(value) -> remote(value, mod)
      _ -> value
    end
  end

  def pick(value, _ir), do: value

  @spec remote(term(), module()) :: term()
  def remote(%Ecto.Association.NotLoaded{}, mod) do
    raise ArgumentError, "#{inspect(mod)} got %Ecto.Association.NotLoaded{}"
  end

  def remote(nil, _mod), do: nil

  def remote(value, mod) do
    cond do
      function_exported?(mod, :format, 1) and is_struct(value) -> mod.format(value)
      function_exported?(mod, :take, 1) -> mod.take(value)
      true -> value
    end
  end

  @spec dump(term(), Type.ir()) :: term()
  def dump(value, {:remote, mod, name}) do
    ir = Type.fetch!(mod, name)

    if name == :t and (is_struct(value) or function_exported?(mod, :format, 1)) do
      dump(remote(value, mod), ir)
    else
      dump(value, ir)
    end
  end

  def dump(list, {:list, inner}) when is_list(list) do
    Enum.map(list, &dump(&1, inner))
  end

  def dump(value, {:union, variants}) do
    case Enum.find(variants, &matches?(value, &1)) do
      nil -> dump_scalar(value, hd(variants))
      variant -> dump(value, variant)
    end
  end

  def dump(map, {:record, fields}) when is_map(map) do
    Enum.reduce(fields, %{}, &dump_record_field(&1, &2, map))
  end

  def dump(map, {:dict, inner}) when is_map(map) do
    Map.new(map, fn {k, v} -> {to_string(k), dump(v, inner)} end)
  end

  def dump(value, ir), do: dump_scalar(value, ir)

  defp dump_record_field({name, :optional, ir}, acc, map) do
    if has_key?(map, name), do: Map.put(acc, name, dump(fetch(map, name), ir)), else: acc
  end

  defp dump_record_field({name, :required, ir}, acc, map) do
    value = if has_key?(map, name), do: fetch(map, name)
    Map.put(acc, name, dump(value, ir))
  end

  defp dump_scalar(%DateTime{} = dt, :datetime), do: DateTime.to_iso8601(dt)
  defp dump_scalar(%Date{} = date, :date), do: Date.to_iso8601(date)
  defp dump_scalar(%Decimal{} = dec, :decimal), do: Decimal.to_string(dec)
  defp dump_scalar(atom, {:atom, atom}) when is_atom(atom), do: Atom.to_string(atom)

  defp dump_scalar(atom, {:union, _}) when is_atom(atom) and not is_boolean(atom) and atom != nil do
    Atom.to_string(atom)
  end

  defp dump_scalar(value, :json), do: value
  defp dump_scalar(value, _ir), do: value

  defp matches?(nil, nil), do: true
  defp matches?(nil, {:union, variants}), do: nil in variants
  defp matches?(value, {:remote, _mod, :t}), do: is_struct(value) or is_map(value)
  defp matches?(value, :string), do: is_binary(value)
  defp matches?(value, :boolean), do: is_boolean(value)
  defp matches?(value, {:atom, atom}), do: value == atom
  defp matches?(_, _), do: false

  defp match_remote_t?({:remote, _mod, :t}), do: true
  defp match_remote_t?(_), do: false

  defp has_key?(map, name), do: Map.has_key?(map, name) or Map.has_key?(map, Atom.to_string(name))

  defp fetch(map, name) do
    Map.get(map, name, Map.get(map, Atom.to_string(name)))
  end
end
