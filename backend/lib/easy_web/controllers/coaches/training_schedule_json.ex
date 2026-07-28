defmodule EasyWeb.Coaches.TrainingScheduleJSON do
  @spec show(map()) :: map()
  def show(%{schedule: schedule}), do: %{data: schedule}
end
