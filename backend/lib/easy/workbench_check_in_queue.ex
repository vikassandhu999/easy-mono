defmodule Easy.WorkbenchCheckInQueue do
  import Ecto.Query

  alias Easy.Ctx
  alias Easy.Forms.FormSubmission
  alias Easy.Repo

  @type item :: %{
          submission: FormSubmission.t(),
          client: Easy.Clients.Client.t(),
          assignment: Easy.Forms.FormAssignment.t(),
          reasons: [%{code: :check_in_awaiting_review, submission_id: String.t(), submitted_at: DateTime.t()}]
        }
  @type page :: %{count: non_neg_integer(), items: [item()]}

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts()
    |> Repo.count_unique()
  end

  @spec list(Ctx.t(), keyword()) :: page()
  def list(%Ctx{} = ctx, opts) do
    facts = facts(ctx)

    items =
      facts
      |> FormSubmission.oldest()
      |> select([submission, review_assignment: assignment, review_client: client], %{
        submission: submission,
        client: client,
        assignment: assignment
      })
      |> Easy.Utils.paginate(opts)
      |> Repo.all()
      |> Enum.map(fn item ->
        reason = %{
          code: :check_in_awaiting_review,
          submission_id: item.submission.id,
          submitted_at: item.submission.submitted_at
        }

        Map.put(item, :reasons, [reason])
      end)

    %{count: Repo.count_unique(facts), items: items}
  end

  defp facts(%Ctx{} = ctx) do
    FormSubmission.awaiting_check_in_review(ctx)
  end
end
