defmodule EasyWeb.ControllerHelpers do
  @spec parse_integer(map(), String.t(), integer()) :: integer()
  def parse_integer(params, key, default) do
    case Map.get(params, key) do
      nil -> default
      value when is_integer(value) -> value
      value when is_binary(value) -> parse_integer_string(value, default)
    end
  end

  defp parse_integer_string(value, default) do
    case Integer.parse(value) do
      {number, ""} -> number
      _ -> default
    end
  end
end
