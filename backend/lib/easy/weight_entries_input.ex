defmodule Easy.WeightEntries.Input do
  alias Easy.Fitness.WeightEntry

  @type date_error :: :date_required | :invalid_date | :future_date
  @type t :: %{date: Date.t(), attrs: %{String.t() => term()}}

  @spec parse(map(), Date.t()) :: {:ok, t()} | {:error, date_error()}
  def parse(attrs, today) do
    attrs = normalize_attrs(attrs)

    with {:ok, date} <- parse_date(attrs["date"]),
         :ok <- ensure_not_future(date, today) do
      {:ok, %{date: date, attrs: attrs}}
    end
  end

  defp normalize_attrs(attrs) do
    attrs
    |> Map.new(fn {key, value} -> {to_string(key), value} end)
    |> Map.take(["date", "value", "unit", "note"])
  end

  @spec parse_since(term()) :: {:ok, Date.t() | nil} | {:error, :invalid_since}
  def parse_since(nil), do: {:ok, nil}
  def parse_since(""), do: {:ok, nil}

  def parse_since(value) do
    case Ecto.Type.cast(:date, value) do
      {:ok, %Date{} = date} -> {:ok, date}
      _ -> {:error, :invalid_since}
    end
  end

  defp parse_date(nil), do: {:error, :date_required}
  defp parse_date(""), do: {:error, :date_required}

  defp parse_date(value) do
    case Ecto.Type.cast(:date, value) do
      {:ok, %Date{} = date} -> {:ok, date}
      _ -> {:error, :invalid_date}
    end
  end

  defp ensure_not_future(%Date{} = date, today) do
    if WeightEntry.date_allowed?(date, today), do: :ok, else: {:error, :future_date}
  end
end
