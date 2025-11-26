defmodule Easy.Training do
  @moduledoc """
  The Training context.
  """

  defdelegate list_exercises(opts \\ []), to: Easy.Training.Library
  defdelegate get_exercise!(id), to: Easy.Training.Library
  defdelegate create_exercise(attrs), to: Easy.Training.Library
  defdelegate update_exercise(exercise, attrs), to: Easy.Training.Library
  defdelegate delete_exercise(exercise), to: Easy.Training.Library

  defdelegate list_training_plans(opts \\ []), to: Easy.Training.Programming
  defdelegate get_training_plan!(id), to: Easy.Training.Programming
  defdelegate create_training_plan(attrs), to: Easy.Training.Programming
  defdelegate update_training_plan(plan, attrs), to: Easy.Training.Programming

  defdelegate assign_training_plan_to_client(template_id, client_id),
    to: Easy.Training.Programming

  defdelegate list_sessions(opts \\ []), to: Easy.Training.Tracking
  defdelegate get_session!(id), to: Easy.Training.Tracking
  defdelegate start_session(attrs), to: Easy.Training.Tracking
  defdelegate complete_session(session, attrs \\ %{}), to: Easy.Training.Tracking
end
