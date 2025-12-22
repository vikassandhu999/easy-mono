defmodule Easy.Scheduling do
  @moduledoc """
  Scheduling context (computed-on-read MVP).

  This context builds a client-facing "schedule" by reading the currently assigned
  training and nutrition plans for a client and projecting them onto calendar days.

  It merges two independent sources:
  - Training (weekly): `Easy.Training.Programming.TrainingPlan` with `planned_workouts.day_number` (1..7 ISO weekday)
  - Nutrition (weekly): `Easy.Nutrition.NutritionPlan` with `meals.day_number` (1..7 ISO weekday)

  IMPORTANT ARCHITECTURE NOTES
  - Tenant isolation: all DB queries are scoped by `business_id`.
  - Controllers must remain thin: this module returns `{:ok, result}` / `{:error, reason}` tuples.
  - Performance: avoid N+1 by querying and preloading needed associations up front.

  For MVP correctness, "completion" is derived from existing tracking/log models.
  Training completion uses `WorkoutSession` state for the planned workout. We pick the
  most recent session for that planned workout (optionally within the day).
  Nutrition completion is not logged yet in this code; we return placeholders.
  """

  import Ecto.Query, warn: false

  alias Easy.Auth.Scope
  alias Easy.Repo

  alias Easy.Training.Programming.{TrainingPlan, PlannedWorkout}
  alias Easy.Training.Tracking.WorkoutSession

  alias Easy.Nutrition.{NutritionPlan, Meal}

  require Logger

  @type iso_date :: Date.t()

  @doc """
  Returns the merged schedule for a week starting on `week_start` (Monday).

  """
  @spec get_week_for_client(Scope.t(), iso_date()) :: {:ok, map()} | {:error, term()}
  def get_week_for_client(%Scope{} = scope, %Date{} = week_start) do
    with :ok <- require_client(scope),
         {:ok, {plan, workouts_by_weekday}} <-
           fetch_active_training_plan_with_workouts(scope, week_start),
         {:ok, {nutrition_plan, meals_by_day_number}} <-
           fetch_active_nutrition_plan_with_meals(scope, week_start),
         week_end <- Date.add(week_start, 6),
         {:ok, sessions_by_workout_id} <-
           fetch_recent_sessions_index(scope, Map.values(workouts_by_weekday)) do
      days =
        0..6
        |> Enum.map(fn offset ->
          date = Date.add(week_start, offset)
          weekday = Date.day_of_week(date)

          training_items =
            case plan do
              nil ->
                []

              _ ->
                workouts = Map.get(workouts_by_weekday, weekday, [])

                Enum.map(workouts, fn w ->
                  training_item_for_date(date, w, sessions_by_workout_id)
                end)
            end

          nutrition_items =
            case nutrition_plan do
              nil ->
                []

              _ ->
                # Nutrition plans are now weekly like training - use weekday directly
                meals = Map.get(meals_by_day_number, weekday, [])

                Enum.map(meals, fn m ->
                  nutrition_item_for_date(date, m)
                end)
            end

          %{
            date: date,
            weekday: weekday,
            training: %{items: training_items},
            nutrition: %{items: nutrition_items}
          }
        end)

      {:ok,
       %{
         week_start: week_start,
         week_end: week_end,
         days: days
       }}
    end
  end

  # Training schedule (weekly)

  defp fetch_active_training_plan_with_workouts(%Scope{} = scope, date \\ nil) do
    business_id = scope.business_id
    client_id = scope.client_id

    date = date || Date.utc_today()

    plan =
      Repo.one(
        from t in TrainingPlan,
          where:
            t.business_id == ^business_id and
              t.client_id == ^client_id and
              t.is_template == false and
              t.status == :active and
              t.start_date <= ^date and
              t.end_date >= ^date,
          order_by: [desc: t.inserted_at],
          preload: [planned_workouts: [workout_elements: :exercise]]
      )

    workouts_by_weekday =
      case plan do
        nil ->
          %{}

        %TrainingPlan{} = p ->
          p.planned_workouts
          |> Enum.group_by(& &1.day_number)
      end

    {:ok, {plan, workouts_by_weekday}}
  end

  defp fetch_recent_sessions_index(%Scope{} = scope, workouts_nested) do
    business_id = scope.business_id
    client_id = scope.client_id

    Logger.info("Workout Nested  #{inspect(workouts_nested)}")

    planned_workouts =
      workouts_nested
      |> List.flatten()
      |> Enum.filter(fn x -> match?(%PlannedWorkout{}, x) end)

    workout_ids =
      planned_workouts
      |> Enum.map(fn x -> x.id end)
      |> Enum.uniq()

    sessions_by_workout_id =
      if workout_ids == [] do
        %{}
      else
        # MVP: No explicit "scheduled_on" field exists in WorkoutSession schema.
        # We index the most recent session per planned_workout for completion info.
        Repo.all(
          from s in WorkoutSession,
            where:
              s.business_id == ^business_id and
                s.client_id == ^client_id and
                s.planned_workout_id in ^workout_ids,
            order_by: [desc: s.started_at]
        )
        |> Enum.reduce(%{}, fn s, acc ->
          Map.put_new(acc, s.planned_workout_id, s)
        end)
      end

    Logger.info("Session By Workout Ids #{inspect(sessions_by_workout_id)}")

    {:ok, sessions_by_workout_id}
  end

  defp training_item_for_date(%Date{} = date, %PlannedWorkout{} = workout, sessions_by_workout_id) do
    session = Map.get(sessions_by_workout_id, workout.id)

    status =
      case session do
        %WorkoutSession{state: :completed} ->
          "completed"

        _ ->
          case Date.compare(date, Date.utc_today()) do
            :lt -> "skipped"
            :gt -> "upcoming"
            :eq -> "available"
          end
      end

    %{
      kind: "training",
      date: date,
      status: status,
      title: workout.name,
      subtitle: workout.notes,
      entity: %{
        planned_workout_id: workout.id
      }
    }
  end

  # Nutrition schedule (multi-week) - computed by day_number in plan

  defp fetch_active_nutrition_plan_with_meals(%Scope{} = scope, date \\ nil) do
    business_id = scope.business_id
    client_id = scope.client_id

    date = date || Date.utc_today()

    plan =
      Repo.one(
        from np in NutritionPlan,
          where:
            np.business_id == ^business_id and
              np.client_id == ^client_id and
              np.is_template == false and
              np.status == :active and
              np.start_date <= ^date and
              np.end_date >= ^date,
          order_by: [desc: np.inserted_at],
          preload: [meals: [:meal_items]]
      )

    meals_by_day_number =
      case plan do
        nil ->
          %{}

        %NutritionPlan{} = p ->
          p.meals
          |> Enum.group_by(& &1.day_number)
      end

    {:ok, {plan, meals_by_day_number}}
  end

  defp nutrition_item_for_date(%Date{} = date, %Meal{} = meal) do
    # MVP: no nutrition logs yet; everything is considered due/upcoming based on calendar.
    status = if Date.compare(date, Date.utc_today()) == :lt, do: "missed", else: "due"

    title =
      case meal.label do
        nil -> to_string(meal.daytime)
        value -> value
      end

    subtitle =
      case meal.time do
        %Time{} = t -> Time.to_iso8601(t)
        _ -> nil
      end

    %{
      kind: "nutrition",
      date: date,
      status: status,
      title: title,
      subtitle: subtitle,
      entity: %{
        meal_id: meal.id
      },
      cta: "view"
    }
  end

  defp first_nutrition_item_for_date(%Date{} = date, meals) do
    meals
    |> Enum.sort_by(& &1.position)
    |> Enum.find_value(fn m ->
      nutrition_item_for_date(date, m)
    end)
  end

  # ===========================================================================
  # Selection logic
  # ===========================================================================

  defp choose_next_item(nil, nil, _date, _today), do: nil

  defp choose_next_item(training, nil, _date, _today), do: normalize_due_status(training)

  defp choose_next_item(nil, nutrition, _date, _today), do: normalize_due_status(nutrition)

  defp choose_next_item(training, nutrition, date, today) do
    # Prefer training for now (MVP). Later we can introduce priorities/time-of-day.
    item = training || nutrition
    item = normalize_due_status(item)

    # If it's today and due, mark as due; otherwise upcoming.
    if item && Date.compare(date, today) == :eq && item.status in ["due", "missed"] do
      Map.put(item, :status, "due")
    else
      Map.put(item, :status, "upcoming")
    end
  end

  defp normalize_due_status(nil), do: nil

  defp normalize_due_status(%{date: %Date{} = date} = item) do
    today = Date.utc_today()

    cond do
      item.status == "completed" ->
        item

      Date.compare(date, today) == :eq ->
        Map.put(item, :status, "due")

      Date.compare(date, today) == :gt ->
        Map.put(item, :status, "upcoming")

      true ->
        item
    end
  end

  # ===========================================================================
  # Guards / auth helpers
  # ===========================================================================

  defp require_client(%Scope{client_id: nil}), do: {:error, :forbidden}
  defp require_client(%Scope{business_id: nil}), do: {:error, :forbidden}

  defp require_client(%Scope{} = scope) do
    if Scope.is_client?(scope) do
      :ok
    else
      {:error, :forbidden}
    end
  end
end
