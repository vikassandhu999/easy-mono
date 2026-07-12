defmodule EasyWeb.Coaches.CheckInReviewJSON do
  alias Easy.Forms.FormSubmission
  alias EasyWeb.Coaches.FormAssignmentJSON

  @spec index(%{submissions: [FormSubmission.t()]}) :: %{data: [map()]}
  def index(%{submissions: submissions}), do: %{data: Enum.map(submissions, &queue_data/1)}

  @spec show(%{submission: FormSubmission.t()}) :: %{data: map()}
  def show(%{submission: submission}), do: %{data: FormAssignmentJSON.submission_data(submission)}

  @spec queue_data(FormSubmission.t()) :: map()
  def queue_data(%FormSubmission{} = submission) do
    submission
    |> FormAssignmentJSON.submission_data()
    |> Map.merge(%{
      client: client_data(submission.client),
      form_assignment: FormAssignmentJSON.data(submission.form_assignment)
    })
  end

  defp client_data(client) do
    %{
      id: client.id,
      email: client.email,
      first_name: client.first_name,
      last_name: client.last_name
    }
  end
end
