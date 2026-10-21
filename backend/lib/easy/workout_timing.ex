defmodule Easy.Workouts.Timing do
  import Bitwise
  @spec bit(integer()) :: integer()
  def bit(day), do: 1 <<< (day - 1)
  @spec applies?(map(), Date.t()) :: boolean()
  def applies?(row, on),
    do:
      Date.compare(on, row.from_date) != :lt and (is_nil(row.until_date) or Date.compare(on, row.until_date) != :gt) and
        (row.weekdays_mask &&& bit(Date.day_of_week(on))) != 0

  @spec last_fact(map(), Date.t()) :: Date.t() | nil
  def last_fact(row, today) do
    if Map.get(row, :claimed_today, false) and applies?(row, today), do: today, else: last_past_fact(row, today)
  end

  defp last_past_fact(row, today) do
    before = Date.add(today, -1)
    upper = if row.until_date && Date.before?(row.until_date, before), do: row.until_date, else: before
    Enum.find(Enum.map(0..6, &Date.add(upper, -&1)), &applies?(row, &1))
  end

  @spec future?(map(), Date.t()) :: boolean()
  def future?(row, today) do
    today = if Map.get(row, :claimed_today, false), do: Date.add(today, 1), else: today
    first = if Date.after?(row.from_date, today), do: row.from_date, else: today
    Enum.any?(0..6, &applies?(row, Date.add(first, &1)))
  end
end
