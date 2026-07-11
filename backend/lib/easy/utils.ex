defmodule Easy.Utils do
  import Ecto.Query, only: [from: 2]

  @spec parse_boolean(any()) :: boolean() | nil
  def parse_boolean(nil), do: nil
  def parse_boolean(value) when is_boolean(value), do: value

  def parse_boolean(bool_string) when is_binary(bool_string) do
    case String.downcase(bool_string) do
      "true" -> true
      "false" -> false
      _ -> nil
    end
  end

  def parse_boolean(_), do: nil

  @spec safe_to_atom(any(), [String.t()]) :: atom() | nil
  def safe_to_atom(binary, allowed) when is_binary(binary) do
    if binary in allowed do
      String.to_existing_atom(binary)
    end
  rescue
    ArgumentError -> nil
  end

  def safe_to_atom(_, _), do: nil

  @spec safe_date(any()) :: Date.t() | nil
  def safe_date(nil), do: nil

  def safe_date(string) when is_binary(string) do
    case Date.from_iso8601(string) do
      {:ok, date} -> date
      _ -> nil
    end
  end

  def safe_date(_), do: nil

  @spec paginate(Ecto.Queryable.t(), non_neg_integer(), pos_integer()) :: Ecto.Query.t()
  def paginate(query, offset, limit) do
    from(q in query, offset: ^offset, limit: ^limit)
  end

  @spec weekday_name(Date.t()) :: String.t()
  def weekday_name(%Date{} = date) do
    date |> Date.day_of_week() |> weekday_number_to_name()
  end

  @spec weekday_number_to_name(1..7) :: String.t()
  def weekday_number_to_name(1), do: "monday"
  def weekday_number_to_name(2), do: "tuesday"
  def weekday_number_to_name(3), do: "wednesday"
  def weekday_number_to_name(4), do: "thursday"
  def weekday_number_to_name(5), do: "friday"
  def weekday_number_to_name(6), do: "saturday"
  def weekday_number_to_name(7), do: "sunday"
end
