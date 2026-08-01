defmodule EasyWeb.Coaches.CheckInReviewJSON do
  alias Easy.Forms.FormSubmission
  alias EasyWeb.Coaches.FormAssignmentJSON

  @spec index(%{count: non_neg_integer(), submissions: [FormSubmission.t()]}) :: %{
          count: non_neg_integer(),
          data: [map()]
        }
  def index(%{count: count, submissions: submissions}) do
    %{count: count, data: Enum.map(submissions, &queue_data/1)}
  end

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
