defmodule Easy.Forms.Photos do
  import Ecto.Query

  alias Easy.Attachments.Attachment
  alias Easy.Ctx
  alias Easy.FormAnswers
  alias Easy.Forms.{FormAssignment, FormSubmission}
  alias Easy.Repo

  @spec validate(Ctx.t(), String.t(), [map()], map()) :: :ok | {:error, :invalid_answer_values}
  def validate(%Ctx{business_id: business_id}, client_id, sections, answers) do
    ids = FormAnswers.photo_attachment_ids(sections, answers)

    owned_count =
      Attachment
      |> Attachment.for_client(business_id, client_id)
      |> Attachment.for_ids(ids)
      |> where([attachment], attachment.content_type in ^Attachment.image_content_types())
      |> Repo.aggregate(:count, :id)

    if owned_count == length(ids), do: :ok, else: {:error, :invalid_answer_values}
  end

  @spec attach_submission(Ctx.t(), FormSubmission.t()) :: FormSubmission.t()
  def attach_submission(%Ctx{} = ctx, submission) do
    [attached] = attach_submissions(ctx, [submission])
    attached
  end

  @spec attach_submissions(Ctx.t(), [FormSubmission.t()]) :: [FormSubmission.t()]
  def attach_submissions(%Ctx{business_id: business_id}, submissions) do
    ids = submissions |> Enum.flat_map(&FormAnswers.photo_attachment_ids(&1.question_snapshot, &1.answers)) |> Enum.uniq()

    attachments_by_client_and_id =
      Attachment
      |> Attachment.for_business(business_id)
      |> Attachment.for_ids(ids)
      |> Repo.all()
      |> Map.new(&{{&1.client_id, &1.id}, &1})

    Enum.map(submissions, fn submission ->
      attachments =
        submission.question_snapshot
        |> FormAnswers.photo_attachment_ids(submission.answers)
        |> Enum.map(&Map.get(attachments_by_client_and_id, {submission.client_id, &1}))
        |> Enum.reject(&is_nil/1)

      %{submission | attachments: attachments}
    end)
  end

  @spec attach_assignments(Ctx.t(), nil | FormAssignment.t() | [FormAssignment.t()]) ::
          nil | FormAssignment.t() | [FormAssignment.t()]
  def attach_assignments(%Ctx{}, nil), do: nil

  def attach_assignments(%Ctx{} = ctx, %FormAssignment{} = assignment) do
    [attached] = attach_assignments(ctx, [assignment])
    attached
  end

  def attach_assignments(%Ctx{} = ctx, assignments) when is_list(assignments) do
    submissions =
      assignments
      |> Enum.flat_map(& &1.form_submissions)
      |> then(&attach_submissions(ctx, &1))
      |> Enum.group_by(& &1.form_assignment_id)

    Enum.map(assignments, fn assignment ->
      %{assignment | form_submissions: Map.get(submissions, assignment.id, [])}
    end)
  end
end
