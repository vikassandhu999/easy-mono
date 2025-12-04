defmodule Easy.Training do
  @moduledoc """
  The Training context.
  """

  # Library - Exercises
  defdelegate list_exercises(business_id, params \\ %{}), to: Easy.Training.Library
  defdelegate fetch_exercise(business_id, exercise_id), to: Easy.Training.Library
  defdelegate get_exercise!(id), to: Easy.Training.Library
  defdelegate create_exercise(business_id, attrs), to: Easy.Training.Library
  defdelegate create_system_exercise(attrs), to: Easy.Training.Library
  defdelegate update_exercise(exercise, attrs), to: Easy.Training.Library
  defdelegate delete_exercise(exercise), to: Easy.Training.Library
  defdelegate duplicate_exercise(exercise, business_id), to: Easy.Training.Library

  # Library - Reference Data
  defdelegate list_muscles(), to: Easy.Training.Library
  defdelegate fetch_muscle(id), to: Easy.Training.Library
  defdelegate list_equipment(), to: Easy.Training.Library
  defdelegate fetch_equipment(id), to: Easy.Training.Library

  # Programming - Training Plans
  defdelegate list_training_plans(business_id, params \\ %{}), to: Easy.Training.Programming
  defdelegate fetch_training_plan(business_id, training_plan_id), to: Easy.Training.Programming
  defdelegate get_training_plan!(business_id, id), to: Easy.Training.Programming
  defdelegate create_training_plan(business_id, author_id, attrs), to: Easy.Training.Programming
  defdelegate update_training_plan(plan, attrs), to: Easy.Training.Programming
  defdelegate delete_training_plan(plan), to: Easy.Training.Programming

  defdelegate duplicate_training_plan(business_id, training_plan_id),
    to: Easy.Training.Programming

  defdelegate assign_training_plan_to_client(
                business_id,
                template_id,
                client_id,
                start_date,
                end_date
              ),
              to: Easy.Training.Programming

  # Programming - Planned Workouts
  defdelegate list_planned_workouts(business_id, training_plan_id), to: Easy.Training.Programming
  defdelegate fetch_planned_workout(business_id, workout_id), to: Easy.Training.Programming
  defdelegate get_planned_workout!(business_id, id), to: Easy.Training.Programming

  defdelegate create_planned_workout(business_id, training_plan_id, attrs),
    to: Easy.Training.Programming

  defdelegate update_planned_workout(workout, attrs), to: Easy.Training.Programming
  defdelegate delete_planned_workout(workout), to: Easy.Training.Programming

  # Programming - Workout Elements
  defdelegate fetch_workout_element(business_id, element_id), to: Easy.Training.Programming
  defdelegate get_workout_element!(business_id, id), to: Easy.Training.Programming

  defdelegate create_workout_element(business_id, planned_workout_id, attrs),
    to: Easy.Training.Programming

  defdelegate create_workout_element_with_sets(
                business_id,
                planned_workout_id,
                element_attrs,
                sets_attrs
              ),
              to: Easy.Training.Programming

  defdelegate update_workout_element(element, attrs), to: Easy.Training.Programming

  defdelegate update_workout_element_with_sets(element, element_attrs, sets_attrs),
    to: Easy.Training.Programming

  defdelegate delete_workout_element(element), to: Easy.Training.Programming

  # Tracking - Workout Sessions
  defdelegate list_sessions(business_id, opts \\ []), to: Easy.Training.Tracking
  defdelegate fetch_session(business_id, session_id), to: Easy.Training.Tracking
  defdelegate get_session!(id), to: Easy.Training.Tracking
  defdelegate start_session(business_id, client_id, attrs \\ %{}), to: Easy.Training.Tracking
  defdelegate complete_session(session, attrs \\ %{}), to: Easy.Training.Tracking
  defdelegate discard_session(session), to: Easy.Training.Tracking

  # Tracking - Performed Sets
  defdelegate create_performed_set(business_id, attrs), to: Easy.Training.Tracking
  defdelegate update_performed_set(set, attrs), to: Easy.Training.Tracking
  defdelegate delete_performed_set(set), to: Easy.Training.Tracking
  defdelegate fetch_performed_set(business_id, set_id), to: Easy.Training.Tracking
end
