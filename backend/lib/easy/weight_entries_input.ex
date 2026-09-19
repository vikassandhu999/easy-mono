defmodule Easy.WeightEntries.Input do
  alias Easy.Fitness.WeightEntry

  @type date_error :: :date_required | :invalid_date | :future_date
  @type expected_entry :: :any | :absent | %{id: String.t(), revision: pos_integer()}
  @type t :: %{date: Date.t(), attrs: %{String.t() => term()}, expected_entry: expected_entry()}

  @spec parse(map(), Date.t()) :: {:ok, t()} | {:error, date_error() | Ecto.Changeset.t()}
  def parse(attrs, today) do
    attrs = normalize_attrs(attrs)

    with {:ok, date} <- parse_date(attrs["date"]),
         :ok <- ensure_not_future(date, today),
         {:ok, expected_entry} <- expected_entry(attrs) do
      {:ok, %{date: date, attrs: Map.delete(attrs, "expected_entry"), expected_entry: expected_entry}}
    end
  end

  defp normalize_attrs(attrs) do
    attrs
    |> Map.new(fn {key, value} -> {to_string(key), value} end)
    |> Map.take(["date", "value", "unit", "note", "expected_entry"])
  end

  defp expected_entry(attrs) do
    case Map.fetch(attrs, "expected_entry") do
      :error -> {:ok, :any}
      {:ok, nil} -> {:ok, :absent}
      {:ok, entry} -> parse_expected_entry(entry)
    end
  end

  defp parse_expected_entry(entry) when is_map(entry) do
    {%{}, %{id: :binary_id, revision: :integer}}
    |> Ecto.Changeset.cast(entry, [:id, :revision])
    |> Ecto.Changeset.validate_required([:id, :revision])
    |> Ecto.Changeset.validate_number(:revision, greater_than: 0)
    |> Ecto.Changeset.apply_action(:validate)
  end

  defp parse_expected_entry(_entry) do
    changeset = {%{}, %{expected_entry: :map}} |> Ecto.Changeset.change() |> Ecto.Changeset.add_error(:expected_entry, "is invalid")
    {:error, changeset}
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

  @spec parse_date(term()) :: {:ok, Date.t()} | {:error, :date_required | :invalid_date}
  def parse_date(nil), do: {:error, :date_required}
  def parse_date(""), do: {:error, :date_required}

  def parse_date(value) do
    case Ecto.Type.cast(:date, value) do
      {:ok, %Date{} = date} -> {:ok, date}
      _ -> {:error, :invalid_date}
    end
  end

  defp ensure_not_future(%Date{} = date, today) do
    if WeightEntry.date_allowed?(date, today), do: :ok, else: {:error, :future_date}
  end
end
