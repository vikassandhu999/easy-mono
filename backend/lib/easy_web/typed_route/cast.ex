defmodule EasyWeb.TypedRoute.Cast do
  alias EasyWeb.TypedRoute.Type

  @type result :: {:ok, term()} | {:error, %{String.t() => [String.t()]}}

  @spec body(term(), Type.ir() | nil) :: result()
  def body(nil, nil), do: {:ok, %{}}
  def body(value, nil), do: empty_or_error(value)
  def body(value, ir), do: run(value, ir, :atoms, [])

  @spec query(map(), Type.ir() | nil) :: result()
  def query(value, nil), do: empty_or_error(value)
  def query(value, ir), do: run(value, ir, :strings, [])

  @spec path(map(), Type.ir() | nil) :: result()
  def path(value, nil), do: {:ok, value || %{}}

  def path(value, {:record, fields}) do
    Enum.reduce_while(fields, {:ok, value || %{}}, &cast_path_field/2)
  end

  defp empty_or_error(value) when value in [%{}, nil], do: {:ok, %{}}
  defp empty_or_error(value) when is_map(value) and map_size(value) == 0, do: {:ok, %{}}

  defp empty_or_error(value) when is_map(value) do
    {:error, %{"$" => ["must be empty"]}}
  end

  defp empty_or_error(_value), do: {:ok, %{}}

  defp run(value, {:remote, mod, name}, keys, path) do
    run(value, Type.fetch!(mod, name), keys, path)
  end

  defp run(value, {:union, variants}, keys, path) do
    Enum.reduce_while(variants, {:error, %{join(path) => ["is invalid"]}}, fn variant, _acc ->
      case run(value, variant, keys, path) do
        {:ok, _} = ok -> {:halt, ok}
        {:error, _} -> {:cont, {:error, %{join(path) => ["is invalid"]}}}
      end
    end)
  end

  defp run(list, {:list, inner}, keys, path) when is_list(list) do
    list
    |> Enum.with_index()
    |> Enum.reduce_while({:ok, []}, fn {item, idx}, {:ok, acc} ->
      case run(item, inner, keys, path ++ [Integer.to_string(idx)]) do
        {:ok, coerced} -> {:cont, {:ok, acc ++ [coerced]}}
        {:error, _} = err -> {:halt, err}
      end
    end)
  end

  defp run(value, {:list, inner}, keys, path) do
    run([value], {:list, inner}, keys, path)
  end

  defp run(map, {:record, fields}, keys, path) when is_map(map) do
    with :ok <- reject_unknown(map, fields, keys, path) do
      Enum.reduce_while(fields, {:ok, %{}}, &cast_record_field(&1, &2, map, keys, path))
    end
  end

  defp run(map, {:dict, inner}, keys, path) when is_map(map) do
    Enum.reduce_while(map, {:ok, %{}}, fn {k, v}, {:ok, acc} ->
      key = to_string(k)

      case run(v, inner, keys, path ++ [key]) do
        {:ok, coerced} -> {:cont, {:ok, Map.put(acc, key, coerced)}}
        {:error, _} = err -> {:halt, err}
      end
    end)
  end

  defp run(value, ir, _keys, path), do: coerce(value, ir, path)

  defp cast_path_field({name, req, ir}, {:ok, acc}) do
    key = Atom.to_string(name)

    case {Map.get(acc, key), req} do
      {nil, :optional} -> {:cont, {:ok, acc}}
      {nil, :required} -> {:halt, {:error, %{key => ["is required"]}}}
      {raw, _} -> put_coerced(acc, key, run(raw, ir, :strings, [key]))
    end
  end

  defp cast_record_field({name, req, ir}, {:ok, acc}, map, keys, path) do
    case {lookup(map, name), req} do
      {:__missing__, :optional} -> {:cont, {:ok, acc}}
      {:__missing__, :required} -> {:halt, {:error, %{join(path ++ [Atom.to_string(name)]) => ["is required"]}}}
      {raw, _} -> put_coerced_key(acc, name, run(raw, ir, keys, path ++ [Atom.to_string(name)]), keys)
    end
  end

  defp put_coerced_key(acc, name, {:ok, coerced}, keys), do: {:cont, {:ok, put_key(acc, name, coerced, keys)}}
  defp put_coerced_key(_acc, _name, {:error, _} = err, _keys), do: {:halt, err}

  defp put_coerced(acc, key, {:ok, coerced}), do: {:cont, {:ok, Map.put(acc, key, coerced)}}
  defp put_coerced(_acc, _key, {:error, _} = err), do: {:halt, err}

  defp reject_unknown(map, fields, keys, path) do
    allowed =
      MapSet.new(fields, fn {name, _, _} ->
        if keys == :atoms, do: name, else: Atom.to_string(name)
      end)

    extras =
      map
      |> Map.keys()
      |> Enum.map(&normalize_incoming_key(&1, keys))
      |> Enum.reject(&MapSet.member?(allowed, &1))

    if extras == [] do
      :ok
    else
      extra = hd(extras)
      name = if is_atom(extra), do: Atom.to_string(extra), else: extra
      {:error, %{join(path ++ [name]) => ["is unknown"]}}
    end
  end

  defp normalize_incoming_key(key, :atoms) when is_atom(key), do: key

  defp normalize_incoming_key(key, :atoms) when is_binary(key) do
    String.to_existing_atom(key)
  rescue
    ArgumentError -> key
  end

  defp normalize_incoming_key(key, :strings), do: to_string(key)

  defp lookup(map, name) do
    cond do
      Map.has_key?(map, name) -> Map.fetch!(map, name)
      Map.has_key?(map, Atom.to_string(name)) -> Map.fetch!(map, Atom.to_string(name))
      true -> :__missing__
    end
  end

  defp put_key(acc, name, value, :atoms), do: Map.put(acc, name, value)
  defp put_key(acc, name, value, :strings), do: Map.put(acc, Atom.to_string(name), value)

  defp coerce(value, :json, _path), do: {:ok, value}
  defp coerce(nil, nil, _path), do: {:ok, nil}

  defp coerce(value, :string, _path) when is_binary(value), do: {:ok, value}

  defp coerce(value, :integer, path), do: int(value, path, &is_integer/1)
  defp coerce(value, :pos_integer, path), do: int(value, path, &(&1 > 0))
  defp coerce(value, :non_neg_integer, path), do: int(value, path, &(&1 >= 0))
  defp coerce(value, :number, path), do: num(value, path)
  defp coerce(value, :float, path), do: num(value, path)

  defp coerce(value, :boolean, _path) when is_boolean(value), do: {:ok, value}
  defp coerce("true", :boolean, _path), do: {:ok, true}
  defp coerce("false", :boolean, _path), do: {:ok, false}

  defp coerce(value, :datetime, path), do: datetime(value, path)
  defp coerce(value, :date, path), do: date(value, path)
  defp coerce(value, :decimal, path), do: decimal(value, path)

  defp coerce(value, {:atom, atom}, _path) when value == atom, do: {:ok, atom}

  defp coerce(value, {:atom, atom}, path) when is_binary(value) do
    if value == Atom.to_string(atom), do: {:ok, atom}, else: {:error, %{join(path) => ["is invalid"]}}
  end

  defp coerce(_value, _ir, path), do: {:error, %{join(path) => ["is invalid"]}}

  defp int(value, path, pred) when is_integer(value) do
    if pred.(value), do: {:ok, value}, else: {:error, %{join(path) => ["is invalid"]}}
  end

  defp int(value, path, pred) when is_binary(value) do
    case Integer.parse(value) do
      {int, ""} -> int(int, path, pred)
      _ -> {:error, %{join(path) => ["is invalid"]}}
    end
  end

  defp int(_value, path, _pred), do: {:error, %{join(path) => ["is invalid"]}}

  defp num(value, _path) when is_number(value), do: {:ok, value}

  defp num(value, path) when is_binary(value) do
    case Float.parse(value) do
      {num, ""} -> {:ok, num}
      _ -> {:error, %{join(path) => ["is invalid"]}}
    end
  end

  defp num(_value, path), do: {:error, %{join(path) => ["is invalid"]}}

  defp datetime(%DateTime{} = dt, _path), do: {:ok, dt}

  defp datetime(value, path) when is_binary(value) do
    case DateTime.from_iso8601(value) do
      {:ok, dt, _} -> {:ok, dt}
      _ -> {:error, %{join(path) => ["is invalid"]}}
    end
  end

  defp datetime(_value, path), do: {:error, %{join(path) => ["is invalid"]}}

  defp date(%Date{} = date, _path), do: {:ok, date}

  defp date(value, path) when is_binary(value) do
    case Date.from_iso8601(value) do
      {:ok, date} -> {:ok, date}
      _ -> {:error, %{join(path) => ["is invalid"]}}
    end
  end

  defp date(_value, path), do: {:error, %{join(path) => ["is invalid"]}}

  defp decimal(%Decimal{} = dec, _path), do: {:ok, dec}

  defp decimal(value, path) when is_binary(value) do
    case Decimal.parse(value) do
      {dec, ""} -> {:ok, dec}
      {%Decimal{} = dec, _} -> {:ok, dec}
      :error -> {:error, %{join(path) => ["is invalid"]}}
    end
  end

  defp decimal(_value, path), do: {:error, %{join(path) => ["is invalid"]}}

  defp join([]), do: "$"
  defp join(path), do: Enum.join(path, ".")
end
