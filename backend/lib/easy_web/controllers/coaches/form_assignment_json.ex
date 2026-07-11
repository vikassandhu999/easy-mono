defmodule EasyWeb.Coaches.FormAssignmentJSON do
  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormSubmission
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

  @spec submissions(%{submissions: [FormSubmission.t()]}) :: %{data: [map()]}
  def submissions(%{submissions: submissions}) do
    %{data: Enum.map(submissions, &submission_data/1)}
  end

  @spec data(FormAssignment.t()) :: map()
  def data(%FormAssignment{} = assignment) do
    %{
      id: assignment.id,
      client_id: assignment.client_id,
      form_template_id: assignment.form_template_id,
      check_in_schedule_id: assignment.check_in_schedule_id,
      purpose: assignment.purpose,
      priority: assignment.priority,
      status: assignment.status,
      due_date: assignment.due_date,
      completed_at: assignment.completed_at,
      due_reminder_sent_at: assignment.due_reminder_sent_at,
      overdue_reminder_sent_at: assignment.overdue_reminder_sent_at,
      latest_submission_reviewed_at: assignment.latest_submission_reviewed_at,
      form_template: form_template(assignment.form_template),
      inserted_at: assignment.inserted_at,
      updated_at: assignment.updated_at
    }
  end

  defp form_template(%FormTemplate{} = template), do: FormTemplateJSON.data(template)
  defp form_template(_template), do: nil

  @spec submission_data(FormSubmission.t()) :: map()
  def submission_data(%FormSubmission{} = submission) do
    %{
      id: submission.id,
      form_assignment_id: submission.form_assignment_id,
      question_snapshot: submission.question_snapshot,
      answers: submission.answers,
      submitted_by_type: submission.submitted_by_type,
      submitted_at: submission.submitted_at,
      reviewed_at: submission.reviewed_at,
      reviewed_by_id: submission.reviewed_by_id,
      inserted_at: submission.inserted_at
    }
  end
end
