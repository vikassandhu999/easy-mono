defmodule Easy.Nutrition.Timing do
  import Bitwise
  import Ecto.Changeset
  @spec validate(Ecto.Changeset.t(), atom()) :: Ecto.Changeset.t()
  def validate(cs, constraint) do
    cs
    |> validate_number(:weekdays_mask, greater_than_or_equal_to: 1, less_than_or_equal_to: 127)
    |> validate_shape()
    |> check_constraint(:weekdays_mask, name: constraint)
  end

  defp validate_shape(cs) do
    if get_field(cs, :date), do: validate_once(cs), else: validate_repeating(cs)
  end

  defp validate_once(cs) do
    if Enum.any?([:weekdays_mask, :from_date, :until_date], &get_field(cs, &1)),
      do: add_error(cs, :date, "choose a date or repeating weekdays"),
      else: cs
  end

  defp validate_repeating(cs) do
    from = get_field(cs, :from_date)
    until = get_field(cs, :until_date)

    cond do
      is_nil(get_field(cs, :weekdays_mask)) or is_nil(from) ->
        add_error(cs, :weekdays_mask, "choose repeating weekdays and a start date")

      until && Date.compare(until, from) == :lt ->
        add_error(cs, :until_date, "must be on or after the start date")

      true ->
        cs
    end
  end

  @spec bit(integer()) :: integer()
  def bit(weekday), do: 1 <<< (weekday - 1)
  @spec applies?(map(), Date.t()) :: boolean()
  def applies?(%{date: %Date{} = date}, on), do: date == on

  def applies?(%{weekdays_mask: mask, from_date: from, until_date: until}, on) do
    Date.compare(on, from) != :lt and (is_nil(until) or Date.compare(on, until) != :gt) and
      (mask &&& bit(Date.day_of_week(on))) != 0
  end

  @spec last_fact(map(), Date.t()) :: Date.t() | nil
  def last_fact(%{date: %Date{} = date}, today), do: if(Date.compare(date, today) == :lt, do: date)

  def last_fact(row, today) do
    before = Date.add(today, -1)
    upper = if row.until_date && Date.compare(row.until_date, before) == :lt, do: row.until_date, else: before
    Enum.find(Enum.map(0..6, &Date.add(upper, -&1)), &applies?(row, &1))
  end

  @spec future?(map(), Date.t()) :: boolean()
  def future?(%{date: %Date{} = date}, today), do: Date.compare(date, today) != :lt

  def future?(row, today) do
    first = if Date.compare(row.from_date, today) == :gt, do: row.from_date, else: today
    Enum.any?(0..6, &applies?(row, Date.add(first, &1)))
  end

  @spec overlap?(map(), map()) :: boolean()
  def overlap?(%{date: %Date{} = date}, other), do: applies?(other, date)
  def overlap?(row, %{date: %Date{} = date}), do: applies?(row, date)

  def overlap?(left, right) do
    from = if Date.compare(left.from_date, right.from_date) == :gt, do: left.from_date, else: right.from_date
    until = earlier_end(left.until_date, right.until_date)
    mask = left.weekdays_mask &&& right.weekdays_mask

    mask != 0 and
      Enum.any?(0..6, fn offset ->
        date = Date.add(from, offset)
        (is_nil(until) or Date.compare(date, until) != :gt) and (mask &&& bit(Date.day_of_week(date))) != 0
      end)
  end

  defp earlier_end(nil, right), do: right
  defp earlier_end(left, nil), do: left
  defp earlier_end(left, right), do: if(Date.compare(left, right) == :lt, do: left, else: right)
end
