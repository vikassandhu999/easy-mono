defmodule Easy.WeightEntries.Progress do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.{CursorPage, DatedCursorPage, Repo}
  alias Easy.Fitness.WeightEntry
  alias Easy.WeightEntries.History

  @type t :: %{
          data: [WeightEntry.t()],
          count: non_neg_integer(),
          next_cursor: String.t() | nil,
          from: Date.t(),
          to: Date.t(),
          unit: History.unit(),
          goal: %{value: Decimal.t(), unit: History.unit()} | nil,
          summary: History.summary(),
          chart: %{points: [point()], min: float() | nil, max: float() | nil}
        }
  @type point :: %{id: String.t(), date: Date.t(), value: float()}

  @spec build(Client.t(), keyword()) :: {:ok, t()} | {:error, :invalid_cursor | Ecto.Changeset.t()}
  def build(client, opts) do
    with {:ok, range} <- date_range(opts),
         base = entries_in_range(client, range),
         limit = CursorPage.limit(opts),
         {:ok, query} <- DatedCursorPage.query(base, Keyword.get(opts, :cursor) || "start", limit) do
      Repo.snapshot(fn -> {:ok, progress(base, query, limit, client, range, opts)} end)
    end
  end

  defp entries_in_range(client, range) do
    WeightEntry
    |> WeightEntry.for_client(client.business_id, client.id)
    |> WeightEntry.for_since(range.from)
    |> WeightEntry.for_until(range.to)
  end

  defp progress(base, query, limit, client, range, opts) do
    latest = base |> WeightEntry.newest() |> limit(1) |> Repo.one()
    first = base |> WeightEntry.newest() |> reverse_order() |> limit(1) |> Repo.one()
    client = Repo.preload(client, :business)
    unit = Keyword.get(opts, :unit) || (latest && latest.unit) || client.goal_weight_unit || client.business.default_weight_unit
    page = DatedCursorPage.finish(Repo.all(WeightEntry.include_submission(query)), limit, Repo.aggregate(base, :count, :id))

    Map.merge(page, %{
      from: range.from,
      to: range.to,
      unit: unit,
      goal: goal(client, unit),
      summary: summary(first, latest, unit),
      chart: chart(base, unit)
    })
  end

  defp date_range(opts) do
    attrs = opts |> Keyword.take([:from, :to]) |> Enum.reject(fn {_key, value} -> is_nil(value) end) |> Map.new()

    {%{to: Date.utc_today()}, %{from: :date, to: :date}}
    |> Ecto.Changeset.cast(attrs, [:from, :to])
    |> Ecto.Changeset.validate_required([:to])
    |> default_from()
    |> validate_range()
    |> Ecto.Changeset.apply_action(:validate)
  end

  defp default_from(%{valid?: false} = changeset), do: changeset

  defp default_from(changeset) do
    case Ecto.Changeset.get_field(changeset, :from) do
      nil -> Ecto.Changeset.put_change(changeset, :from, Date.add(Ecto.Changeset.get_field(changeset, :to), -89))
      _date -> changeset
    end
  end

  defp validate_range(%{valid?: false} = changeset), do: changeset

  defp validate_range(changeset) do
    from = Ecto.Changeset.get_field(changeset, :from)
    to = Ecto.Changeset.get_field(changeset, :to)

    cond do
      Date.compare(from, to) == :gt -> Ecto.Changeset.add_error(changeset, :to, "must be on or after from")
      Date.diff(to, from) > 365 -> Ecto.Changeset.add_error(changeset, :to, "choose a range of up to one year")
      true -> changeset
    end
  end

  defp goal(%{goal_weight_value: nil}, _unit), do: nil
  defp goal(%{goal_weight_unit: nil}, _unit), do: nil
  defp goal(client, unit), do: %{value: History.convert_value(client.goal_weight_value, client.goal_weight_unit, unit), unit: unit}

  defp summary(nil, nil, _unit) do
    %{first_entry: nil, latest_entry: nil, total_change: nil, change_unit: nil}
  end

  defp summary(first, latest, unit) do
    first_value = History.convert_value(first.value, first.unit, unit)
    latest_value = History.convert_value(latest.value, latest.unit, unit)

    %{
      first_entry: %{date: first.date, value: first_value, unit: unit},
      latest_entry: %{date: latest.date, value: latest_value, unit: unit},
      total_change: latest_value |> Decimal.sub(first_value) |> Decimal.round(2) |> Decimal.to_float(),
      change_unit: unit
    }
  end

  defp chart(base, unit) do
    points =
      base
      |> WeightEntry.newest()
      |> distinct([entry], desc: entry.date)
      |> Repo.all()
      |> Enum.reverse()
      |> Enum.map(fn entry ->
        %{id: entry.id, date: entry.date, value: entry.value |> History.convert_value(entry.unit, unit) |> Decimal.to_float()}
      end)

    chart_scale(points)
  end

  defp chart_scale([]), do: %{points: [], min: nil, max: nil}

  defp chart_scale(points) do
    values = Enum.map(points, & &1.value)
    minimum = Enum.min(values)
    maximum = Enum.max(values)
    padding = max((maximum - minimum) * 0.1, 0.5)
    %{points: points, min: Float.round(max(minimum - padding, 0), 2), max: Float.round(maximum + padding, 2)}
  end
end
