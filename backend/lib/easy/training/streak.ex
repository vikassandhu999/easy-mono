defmodule Easy.Training.Streak do
  import Ecto.Query

  alias Easy.Repo
  alias Easy.Training.{TrainingPlan, WorkoutSession}

  @type t :: %{current: non_neg_integer(), includes_today: boolean()}

  @spec compute(String.t(), String.t(), Date.t()) :: t()
  def compute(business_id, client_id, date) do
    rest_days = active_rest_days(business_id, client_id, date)
    session_dates = recent_session_dates(business_id, client_id, date)
    has_today = MapSet.member?(session_dates, date)

    streak = count_backwards(Date.add(date, -1), rest_days, session_dates, 0)
    streak = if has_today, do: streak + 1, else: streak

    %{current: streak, includes_today: has_today}
  end

  defp count_backwards(date, rest_days, session_dates, count) do
    day_number = Date.day_of_week(date)

    cond do
      MapSet.member?(session_dates, date) ->
        count_backwards(Date.add(date, -1), rest_days, session_dates, count + 1)

      day_number in rest_days ->
        count_backwards(Date.add(date, -1), rest_days, session_dates, count)

      true ->
        count
    end
  end

  defp active_rest_days(business_id, client_id, date) do
    plan =
      TrainingPlan
      |> TrainingPlan.for_business(business_id)
      |> TrainingPlan.for_client(client_id)
      |> TrainingPlan.with_status(:active)
      |> TrainingPlan.covering(date)
      |> TrainingPlan.newest()
      |> limit(1)
      |> Repo.one()

    case plan do
      %TrainingPlan{rest_days: rest_days} -> rest_days
      nil -> []
    end
  end

  defp recent_session_dates(business_id, client_id, date) do
    # Look back 365 days max to bound the query. No real streak exceeds a year.
    from_date = Date.add(date, -365)
    next_day = Date.add(date, 1)
    from_dt = DateTime.new!(from_date, ~T[00:00:00], "Etc/UTC")
    to_dt = DateTime.new!(next_day, ~T[00:00:00], "Etc/UTC")

    WorkoutSession
    |> WorkoutSession.for_business(business_id)
    |> WorkoutSession.for_client(client_id)
    |> WorkoutSession.with_state(:completed)
    |> WorkoutSession.started_between(from_dt, to_dt)
    |> select([s], fragment("DATE(?)", s.started_at))
    |> distinct(true)
    |> Repo.all()
    |> MapSet.new()
  end
end
