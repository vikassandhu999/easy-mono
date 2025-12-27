defmodule Easy.Training.QueryHelpers do
  @default_limit 50
  @max_limit 100

  @spec fetch_param(map(), atom()) :: any()
  def fetch_param(params, key) when is_atom(key) do
    Map.get(params, key) || Map.get(params, Atom.to_string(key))
  end

  @spec parse_integer(any()) :: integer() | nil
  def parse_integer(value) when is_integer(value), do: value

  def parse_integer(value) when is_binary(value) do
    case Integer.parse(value) do
      {int, ""} -> int
      _ -> nil
    end
  end

  def parse_integer(_), do: nil

  @spec parse_boolean(any()) :: boolean() | nil
  def parse_boolean(value) when is_boolean(value), do: value
  def parse_boolean("true"), do: true
  def parse_boolean("false"), do: false
  def parse_boolean(_), do: nil

  @spec parse_search(any()) :: String.t() | nil
  def parse_search(nil), do: nil

  def parse_search(value) when is_binary(value) do
    value = String.trim(value)
    if value == "", do: nil, else: value
  end

  def parse_search(_), do: nil

  @spec parse_list(any()) :: list() | nil
  def parse_list(nil), do: nil
  def parse_list([]), do: nil
  def parse_list(list) when is_list(list), do: list

  def parse_list(string) when is_binary(string) do
    string
    |> String.split(",")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> case do
      [] -> nil
      list -> list
    end
  end

  def parse_list(_), do: nil

  @spec clamp_limit(integer() | nil) :: integer()
  def clamp_limit(nil), do: @default_limit
  def clamp_limit(limit) when is_integer(limit), do: limit |> max(1) |> min(@max_limit)

  @spec normalize_offset(integer() | nil) :: non_neg_integer()
  def normalize_offset(nil), do: 0
  def normalize_offset(offset) when is_integer(offset), do: max(offset, 0)
end
