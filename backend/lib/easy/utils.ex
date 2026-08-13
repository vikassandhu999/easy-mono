defmodule Easy.Utils do
  import Ecto.Query, only: [from: 2]

  @spec safe_to_atom(any(), [String.t()]) :: atom() | nil
  def safe_to_atom(binary, allowed) when is_binary(binary) do
    if binary in allowed do
      String.to_existing_atom(binary)
    end
  rescue
    ArgumentError -> nil
  end

  def safe_to_atom(_, _), do: nil

  # For update_change/3 on string fields: cast turns "" into nil, so the trim
  # must pass non-binaries through untouched instead of crashing.
  @spec trim(any()) :: any()
  def trim(value) when is_binary(value), do: String.trim(value)
  def trim(value), do: value

  @spec safe_date(any()) :: Date.t() | nil
  def safe_date(nil), do: nil

  def safe_date(string) when is_binary(string) do
    case Date.from_iso8601(string) do
      {:ok, date} -> date
      _ -> nil
    end
  end

  def safe_date(_), do: nil

  @spec parse_optional_date(any()) :: {:ok, Date.t() | nil} | {:error, :invalid_date}
  def parse_optional_date(nil), do: {:ok, nil}

  def parse_optional_date(string) when is_binary(string) do
    case Date.from_iso8601(string) do
      {:ok, date} -> {:ok, date}
      _ -> {:error, :invalid_date}
    end
  end

  def parse_optional_date(_), do: {:error, :invalid_date}

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
