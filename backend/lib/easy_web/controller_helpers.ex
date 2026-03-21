defmodule EasyWeb.ControllerHelpers do
  @spec parse_integer(map(), String.t(), integer()) :: integer()
  def parse_integer(params, key, default) do
    case Map.get(params, key) do
      nil -> default
      value when is_integer(value) -> value
      value when is_binary(value) -> parse_integer_string(value, default)
    end
  end

  @spec parse_enum(map(), String.t(), [atom()]) :: atom() | nil
  def parse_enum(params, key, allowed) do
    case Map.get(params, key) do
      nil -> nil
      value when is_atom(value) -> if value in allowed, do: value, else: nil
      value when is_binary(value) -> Easy.Utils.safe_to_atom(value, allowed)
      _ -> nil
    end
  end

  @spec parse_boolean(map(), String.t()) :: boolean() | nil
  def parse_boolean(params, key) do
    case Map.get(params, key) do
      nil -> nil
      value -> Easy.Utils.parse_boolean(value)
    end
  end

  @spec parse_list(map(), String.t()) :: [String.t()] | nil
  def parse_list(params, key) do
    case Map.get(params, key) do
      nil -> nil
      "" -> nil
      value when is_list(value) -> value
      value when is_binary(value) -> split_list(value)
      _ -> nil
    end
  end

  defp parse_integer_string(value, default) do
    case Integer.parse(value) do
      {number, ""} -> number
      _ -> default
    end
  end

  defp split_list(value) do
    value
    |> String.split(",")
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> case do
      [] -> nil
      list -> list
    end
  end
end
