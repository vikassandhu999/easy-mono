defmodule Easy.Training.TodayView do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Orgs.Coach
  alias Easy.Repo

  alias Easy.Training.{
    LastPerformed,
    PerformedSet,
    PlannedWorkout,
    Streak,
    TrainingPlan,
    WorkoutSession
  }

  @type t :: %{
          greeting: map(),
          coaching_context: map(),
          coach: map() | nil,
          today: map(),
          this_week: [map()],
          plan: map() | nil,
          workout_streak: Streak.t()
        }

  @spec build(Client.t(), Date.t()) :: t()
  def build(%Client{} = client, %Date{} = date) do
    plan = active_plan(client, date)
    coach = load_coach(client)
    week = week_dates(date)
    completed_sessions_by_date = completed_sessions_by_date(client, week)

    %{
      greeting: greeting(client, date),
      coaching_context: coaching_context(coach, plan, date),
      coach: coach_card(coach),
      today: today_view(plan, date, client, completed_sessions_by_date),
      this_week: this_week_view(plan, week, date, completed_sessions_by_date),
      plan: plan_summary(plan),
      workout_streak: Streak.compute(client.business_id, client.id, date)
    }
  end

  # -- Active plan ----------------------------------------------------------

  defp active_plan(client, date) do
    TrainingPlan
    |> TrainingPlan.for_business(client.business_id)
    |> TrainingPlan.for_client(client.id)
    |> TrainingPlan.with_status(:active)
    |> TrainingPlan.covering(date)
    |> TrainingPlan.newest()
    |> limit(1)
    |> TrainingPlan.with_workouts()
    |> Repo.one()
  end

  # -- Greeting & coaching context ------------------------------------------

  defp greeting(client, date) do
    %{
      first_name: client.first_name,
      day_name: Easy.Utils.weekday_name(date) |> String.capitalize(),
      date: date
    }
  end

  defp load_coach(client) do
    Coach
    |> Coach.for_business(client.business_id)
    |> Coach.with_preloads()
    |> limit(1)
    |> Repo.one()
  end

  defp coaching_context(coach, plan, date) do
    %{
      coach_first_name: coach && coach.first_name,
      week_number: week_number(plan, date)
    }
  end

  defp coach_card(nil), do: nil

  defp coach_card(%Coach{business: %{name: name}} = coach) do
    %{
      first_name: coach.first_name,
      last_name: coach.last_name,
      phone: coach.phone,
      photo_url: coach.photo_url,
      business_name: name
    }
  end

  defp week_number(%TrainingPlan{start_date: %Date{} = start_date}, %Date{} = date) do
    case Date.diff(date, start_date) do
      diff when diff >= 0 -> div(diff, 7) + 1
      _ -> nil
    end
  end

  defp week_number(_, _), do: nil

  # -- Today ----------------------------------------------------------------

  defp today_view(nil, _date, _client, _sessions) do
    %{
      kind: :no_plan,
      coach_note: nil,
      planned_workout: nil,
      last_session_recap: nil,
      last_performed_by_element: %{}
    }
  end

  defp today_view(plan, date, client, _sessions_by_date) do
    day_number = Date.day_of_week(date)

    case {find_workout(plan, day_number), day_number in plan.rest_days} do
      {%PlannedWorkout{} = workout, _} ->
        %{
          kind: :workout,
          coach_note: plan.coach_note,
          planned_workout: workout_data(workout),
          last_session_recap: last_session_recap(client, workout.id),
          last_performed_by_element: last_performed_for_workout(client, workout)
        }

      {nil, true} ->
        %{
          kind: :rest,
          coach_note: plan.coach_note,
          planned_workout: nil,
          last_session_recap: nil,
          last_performed_by_element: %{}
        }

      {nil, false} ->
        %{
          kind: :empty,
          coach_note: plan.coach_note,
          planned_workout: nil,
          last_session_recap: nil,
          last_performed_by_element: %{}
        }
    end
  end

  defp last_performed_for_workout(client, %PlannedWorkout{workout_elements: elements}) do
    LastPerformed.for_elements(client.business_id, client.id, elements)
  end

  defp find_workout(%TrainingPlan{planned_workouts: workouts}, day_number)
       when is_list(workouts) do
    Enum.find(workouts, &(&1.day_number == day_number))
  end

  defp find_workout(_, _), do: nil

  defp workout_data(%PlannedWorkout{workout_elements: elements} = workout) do
    %{
      id: workout.id,
      name: workout.name,
      day_number: workout.day_number,
      notes: workout.notes,
      exercise_count: length(elements),
      workout_elements: elements
    }
  end

  # -- Last-session recap ---------------------------------------------------
  #
  # Spec ask: "Last time: Bench Press 80kg × 4×8 · solid session".
  # We pick the last *completed* session for the same planned_workout (so e.g.
  # the previous Push Day), excluding any session that was started today.

  defp last_session_recap(client, planned_workout_id) do
    session =
      WorkoutSession
      |> WorkoutSession.for_business(client.business_id)
      |> WorkoutSession.for_client(client.id)
      |> WorkoutSession.for_planned_workout(planned_workout_id)
      |> WorkoutSession.with_state(:completed)
      |> WorkoutSession.newest()
      |> limit(1)
      |> Repo.one()

    case session do
      nil ->
        nil

      %WorkoutSession{} = s ->
        %{
          session_id: s.id,
          ended_at: s.ended_at,
          headline: session_headline(s)
        }
    end
  end

  defp session_headline(%WorkoutSession{id: session_id}) do
    set =
      PerformedSet
      |> PerformedSet.for_session(session_id)
      |> PerformedSet.with_kg_load()
      |> PerformedSet.heaviest_first()
      |> limit(1)
      |> PerformedSet.with_exercise()
      |> Repo.one()

    case set do
      nil -> nil
      %PerformedSet{exercise: nil} -> nil
      %PerformedSet{} = s -> format_set_headline(s)
    end
  end

  defp format_set_headline(%PerformedSet{} = set) do
    load = set.load_value && Decimal.to_string(set.load_value)
    unit = set.load_unit && Atom.to_string(set.load_unit)
    reps = set.actual_reps
    name = set.exercise.name

    parts =
      [name, load && unit && "#{load}#{unit}", reps && "× #{reps}"]
      |> Enum.reject(&is_nil/1)

    Enum.join(parts, " ")
  end

  # -- This week strip ------------------------------------------------------

  defp this_week_view(plan, week_dates, today, sessions_by_date) do
    rest_days = (plan && plan.rest_days) || []

    Enum.map(week_dates, fn date ->
      day_number = Date.day_of_week(date)
      planned = plan && find_workout(plan, day_number)
      session = Map.get(sessions_by_date, date)

      %{
        day_number: day_number,
        day_name: Easy.Utils.weekday_name(date) |> String.capitalize(),
        date: date,
        is_today: Date.compare(date, today) == :eq,
        kind: day_kind(session, planned, day_number, rest_days),
        planned_workout_name: planned && planned.name,
        session_id: session && session.id
      }
    end)
  end

  defp day_kind(%WorkoutSession{}, _, _, _), do: :done
  defp day_kind(nil, nil, day, rest_days), do: if(day in rest_days, do: :rest, else: :empty)
  defp day_kind(nil, %PlannedWorkout{}, _, _), do: :upcoming

  defp week_dates(date) do
    monday = Date.add(date, -(Date.day_of_week(date) - 1))
    for offset <- 0..6, do: Date.add(monday, offset)
  end

  defp completed_sessions_by_date(client, week_dates) do
    from_date = List.first(week_dates)
    to_date = List.last(week_dates)
    next_day = Date.add(to_date, 1)

    from_dt = DateTime.new!(from_date, ~T[00:00:00], "Etc/UTC")
    to_dt = DateTime.new!(next_day, ~T[00:00:00], "Etc/UTC")

    WorkoutSession
    |> WorkoutSession.for_business(client.business_id)
    |> WorkoutSession.for_client(client.id)
    |> WorkoutSession.with_state(:completed)
    |> WorkoutSession.started_between(from_dt, to_dt)
    |> Repo.all()
    |> Enum.reduce(%{}, fn session, acc ->
      date = DateTime.to_date(session.started_at)
      # If multiple sessions on the same day, keep the latest (by started_at).
      Map.update(acc, date, session, fn existing ->
        if DateTime.compare(session.started_at, existing.started_at) == :gt,
          do: session,
          else: existing
      end)
    end)
  end

  # -- Plan summary ---------------------------------------------------------

  defp plan_summary(nil), do: nil

  defp plan_summary(%TrainingPlan{} = plan) do
    %{
      id: plan.id,
      name: plan.name,
      start_date: plan.start_date,
      end_date: plan.end_date
    }
  end
end
