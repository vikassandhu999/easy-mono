defmodule Easy.Training do
  @moduledoc """
  The Training context.
  """

  defdelegate list_exercises(business_id, params \\ %{}), to: Easy.Training.Library
  defdelegate fetch_exercise(business_id, exercise_id), to: Easy.Training.Library
  defdelegate get_exercise!(id), to: Easy.Training.Library
  defdelegate create_exercise(attrs), to: Easy.Training.Library
  defdelegate update_exercise(exercise, attrs), to: Easy.Training.Library
  defdelegate delete_exercise(exercise), to: Easy.Training.Library
  defdelegate duplicate_exercise(exercise, business_id), to: Easy.Training.Library

  defdelegate list_training_plans(business_id, params \\ %{}), to: Easy.Training.Programming
  defdelegate fetch_training_plan(business_id, training_plan_id), to: Easy.Training.Programming
  defdelegate get_training_plan!(id), to: Easy.Training.Programming
  defdelegate create_training_plan(attrs), to: Easy.Training.Programming
  defdelegate update_training_plan(plan, attrs), to: Easy.Training.Programming
  defdelegate delete_training_plan(plan), to: Easy.Training.Programming

  defdelegate duplicate_training_plan(business_id, training_plan_id),
    to: Easy.Training.Programming

  defdelegate assign_training_plan_to_client(template_id, client_id),
    to: Easy.Training.Programming

  defdelegate assign_training_plan_to_client(template_id, client_id, start_date),
    to: Easy.Training.Programming

  # Planned Workouts
  defdelegate fetch_planned_workout(business_id, workout_id), to: Easy.Training.Programming
  defdelegate get_planned_workout!(id), to: Easy.Training.Programming
  defdelegate create_planned_workout(attrs), to: Easy.Training.Programming
  defdelegate update_planned_workout(workout, attrs), to: Easy.Training.Programming
  defdelegate delete_planned_workout(workout), to: Easy.Training.Programming

  # Workout Elements
  defdelegate fetch_workout_element(business_id, element_id), to: Easy.Training.Programming
  defdelegate get_workout_element!(id), to: Easy.Training.Programming
  defdelegate create_workout_element(attrs), to: Easy.Training.Programming

  defdelegate create_workout_element_with_sets(element_attrs, sets_attrs),
    to: Easy.Training.Programming

  defdelegate update_workout_element(element, attrs), to: Easy.Training.Programming

  defdelegate update_workout_element_with_sets(element, element_attrs, sets_attrs),
    to: Easy.Training.Programming

  defdelegate delete_workout_element(element), to: Easy.Training.Programming

  defdelegate list_sessions(opts \\ []), to: Easy.Training.Tracking
  @spec get_session!(any()) :: nil | [%{optional(atom()) => any()}] | %{optional(atom()) => any()}
  defdelegate get_session!(id), to: Easy.Training.Tracking
  defdelegate start_session(attrs), to: Easy.Training.Tracking
  defdelegate complete_session(session, attrs \\ %{}), to: Easy.Training.Tracking
end
