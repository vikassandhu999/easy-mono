defmodule EasyWeb.Coaches.CheckInScheduleJSON do
  alias Easy.Forms.CheckInSchedule
  alias Easy.Forms.FormTemplate
  alias EasyWeb.Coaches.FormTemplateJSON

  @spec show(%{schedule: CheckInSchedule.t()}) :: %{data: map()}
  def show(%{schedule: schedule}), do: %{data: data(schedule)}

  @spec index(%{schedules: [CheckInSchedule.t()]}) :: %{data: [map()]}
  def index(%{schedules: schedules}), do: %{data: Enum.map(schedules, &data/1)}

  @spec data(CheckInSchedule.t()) :: map()
  def data(%CheckInSchedule{} = schedule) do
    %{
      id: schedule.id,
      client_id: schedule.client_id,
      form_template_id: schedule.form_template_id,
      frequency: schedule.frequency,
      next_due_on: schedule.next_due_on,
      active: schedule.active,
      form_template: form_template(schedule.form_template),
      inserted_at: schedule.inserted_at,
      updated_at: schedule.updated_at
    }
  end

  defp form_template(%FormTemplate{} = template), do: FormTemplateJSON.data(template)
  defp form_template(_template), do: nil
end
