defmodule EasyWeb.Coaches.TrainingScheduleJSON do
  alias Easy.Training.{ScheduleEntry, TrainingWorkout}

  @spec show(map()) :: map()
  def show(%{schedule: schedule}), do: %{data: Map.new(schedule, fn {day, e} -> {day, entry(e)} end)}

  @spec day(map()) :: map()
  def day(%{entry: nil}), do: %{data: nil}
  def day(%{entry: %ScheduleEntry{} = e}), do: %{data: entry(e)}

  defp entry(%ScheduleEntry{} = e) do
    %{
      id: e.id,
      day_of_week: e.day_of_week,
      training_workout_id: e.training_workout_id,
      workout_name: workout_name(e.workout)
    }
  end

  defp workout_name(%TrainingWorkout{name: name}), do: name
  defp workout_name(_), do: nil
end
