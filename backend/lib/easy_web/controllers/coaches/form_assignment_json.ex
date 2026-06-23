defmodule EasyWeb.Coaches.FormAssignmentJSON do
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormTemplate
  alias EasyWeb.Coaches.FormTemplateJSON

  @spec show(%{assignment: FormAssignment.t()}) :: %{data: map()}
  def show(%{assignment: assignment}) do
    %{data: data(assignment)}
  end

  @spec index(%{assignments: [FormAssignment.t()]}) :: %{data: [map()]}
  def index(%{assignments: assignments}) do
    %{data: Enum.map(assignments, &data/1)}
  end

  @spec data(FormAssignment.t()) :: map()
  def data(%FormAssignment{} = assignment) do
    %{
      id: assignment.id,
      client_id: assignment.client_id,
      form_template_id: assignment.form_template_id,
      purpose: assignment.purpose,
      priority: assignment.priority,
      status: assignment.status,
      due_date: assignment.due_date,
      completed_at: assignment.completed_at,
      form_template: form_template(assignment.form_template),
      inserted_at: assignment.inserted_at,
      updated_at: assignment.updated_at
    }
  end

  defp form_template(%FormTemplate{} = template), do: FormTemplateJSON.data(template)
  defp form_template(_template), do: nil
end
