defmodule Easy.Training do
  alias Easy.Training.{Library, Programming, Tracking}

  # Library - Exercises

  defdelegate list_exercises(business_id, params \\ %{}), to: Library
  defdelegate fetch_exercise(business_id, exercise_id), to: Library
  defdelegate get_exercise!(id), to: Library
  defdelegate create_exercise(business_id, attrs), to: Library
  defdelegate create_system_exercise(attrs), to: Library
  defdelegate update_exercise(exercise, attrs), to: Library
  defdelegate delete_exercise(exercise), to: Library
  defdelegate duplicate_exercise(exercise, business_id), to: Library

  # Library - Reference Data

  defdelegate list_muscles(), to: Library
  defdelegate fetch_muscle(id), to: Library
  defdelegate list_equipment(), to: Library
  defdelegate fetch_equipment(id), to: Library

  # Programming - Training Plans

  defdelegate list_training_plans(business_id, params \\ %{}), to: Programming
  defdelegate fetch_training_plan(business_id, id), to: Programming
  defdelegate get_training_plan!(business_id, id), to: Programming
  defdelegate create_training_plan(business_id, author_id, attrs), to: Programming
  defdelegate update_training_plan(plan, attrs), to: Programming
  defdelegate delete_training_plan(plan), to: Programming
  defdelegate duplicate_training_plan(business_id, id), to: Programming

  defdelegate assign_training_plan_to_client(
                business_id,
                template_id,
                client_id,
                start_date,
                end_date
              ),
              to: Programming

  # Programming - Planned Workouts

  defdelegate list_planned_workouts(business_id, training_plan_id), to: Programming
  defdelegate fetch_planned_workout(business_id, id), to: Programming
  defdelegate get_planned_workout!(business_id, id), to: Programming
  defdelegate create_planned_workout(business_id, training_plan_id, attrs), to: Programming
  defdelegate update_planned_workout(workout, attrs), to: Programming
  defdelegate delete_planned_workout(workout), to: Programming

  # Programming - Workout Elements

  defdelegate fetch_workout_element(business_id, id), to: Programming
  defdelegate get_workout_element!(business_id, id), to: Programming
  defdelegate create_workout_element(business_id, planned_workout_id, attrs), to: Programming

  defdelegate create_workout_element_with_sets(
                business_id,
                planned_workout_id,
                attrs,
                sets_attrs
              ),
              to: Programming

  defdelegate update_workout_element(element, attrs), to: Programming
  defdelegate update_workout_element_with_sets(element, attrs, sets_attrs), to: Programming
  defdelegate delete_workout_element(element), to: Programming

  # Tracking - Sessions

  defdelegate list_sessions(business_id, opts \\ []), to: Tracking
  defdelegate fetch_session(business_id, id), to: Tracking
  defdelegate get_session!(id), to: Tracking
  defdelegate start_session(business_id, client_id, attrs \\ %{}), to: Tracking
  defdelegate complete_session(session, attrs \\ %{}), to: Tracking
  defdelegate discard_session(session), to: Tracking

  # Tracking - Performed Sets

  defdelegate fetch_performed_set(business_id, id), to: Tracking
  defdelegate create_performed_set(business_id, attrs), to: Tracking
  defdelegate update_performed_set(set, attrs), to: Tracking
  defdelegate delete_performed_set(set), to: Tracking
end
