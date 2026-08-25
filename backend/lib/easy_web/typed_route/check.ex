defmodule EasyWeb.TypedRoute.Check do
  alias EasyWeb.TypedRoute.Type

  @spec assert!(term(), Type.ir(), [String.t()]) :: :ok
  def assert!(value, ir, path \\ []) do
    check(value, ir, path)
    :ok
  end

  defp check(value, {:remote, mod, name}, path) do
    check(value, Type.fetch!(mod, name), path)
  end

  defp check(list, {:list, inner}, path) when is_list(list) do
    Enum.with_index(list, fn item, idx ->
      check(item, inner, path ++ [Integer.to_string(idx)])
    end)
  end

  defp check(value, {:union, variants}, path) do
    if Enum.any?(variants, &fits?(value, &1)) do
      variant = Enum.find(variants, &fits?(value, &1))
      check(value, variant, path)
    else
      fail(path, "expected union, got #{inspect(value)}")
    end
  end

  defp check(map, {:record, fields}, path) when is_map(map) do
    allowed = MapSet.new(fields, fn {name, _, _} -> name end)
    extras = map |> Map.keys() |> Enum.reject(&MapSet.member?(allowed, &1))

    if extras != [] do
      fail(path ++ [Atom.to_string(hd(extras))], "is unknown")
    end

    Enum.each(fields, &check_record_field(&1, map, path))
  end

  defp check(map, {:dict, inner}, path) when is_map(map) do
    Enum.each(map, fn {k, v} ->
      check(v, inner, path ++ [to_string(k)])
    end)
  end

  defp check(value, :string, _path) when is_binary(value), do: :ok
  defp check(value, :boolean, _path) when is_boolean(value), do: :ok
  defp check(value, :integer, _path) when is_integer(value), do: :ok
  defp check(value, :pos_integer, _path) when is_integer(value) and value > 0, do: :ok
  defp check(value, :non_neg_integer, _path) when is_integer(value) and value >= 0, do: :ok
  defp check(value, :number, _path) when is_number(value), do: :ok
  defp check(value, :float, _path) when is_number(value), do: :ok
  defp check(_value, :json, _path), do: :ok
  defp check(nil, nil, _path), do: :ok
  defp check(value, :datetime, _path) when is_binary(value), do: :ok
  defp check(value, :date, _path) when is_binary(value), do: :ok
  defp check(value, :decimal, _path) when is_binary(value), do: :ok

  defp check(value, {:atom, atom}, path) when is_binary(value) do
    if value == Atom.to_string(atom), do: :ok, else: fail(path, "expected #{inspect(atom)}")
  end

  defp check(value, ir, path), do: fail(path, "expected #{inspect(ir)}, got #{inspect(value)}")

  defp check_record_field({name, _req, ir}, map, path) when is_map_key(map, name) do
    check(Map.fetch!(map, name), ir, path ++ [Atom.to_string(name)])
  end

  defp check_record_field({name, :required, _ir}, _map, path) do
    fail(path ++ [Atom.to_string(name)], "is required")
  end

  defp check_record_field(_field, _map, _path), do: :ok

  defp fits?(value, {:remote, mod, name}), do: fits?(value, Type.fetch!(mod, name))
  defp fits?(nil, nil), do: true
  defp fits?(value, :string), do: is_binary(value)
  defp fits?(value, :boolean), do: is_boolean(value)
  defp fits?(value, :integer), do: is_integer(value)
  defp fits?(value, :pos_integer), do: is_integer(value) and value > 0
  defp fits?(value, :non_neg_integer), do: is_integer(value) and value >= 0
  defp fits?(value, :number), do: is_number(value)
  defp fits?(value, :float), do: is_number(value)
  defp fits?(value, {:atom, atom}), do: value == Atom.to_string(atom) or value == atom
  defp fits?(value, {:record, _}) when is_map(value), do: true
  defp fits?(value, {:list, _}) when is_list(value), do: true
  defp fits?(_value, :json), do: true
  defp fits?(_, _), do: false

  defp fail(path, message) do
    loc = if path == [], do: "$", else: Enum.join(path, ".")
    raise ArgumentError, "#{loc}: #{message}"
  end
end
