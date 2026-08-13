defmodule Easy.WorkbenchCheckInQueue do
  import Ecto.Query

  alias Easy.Ctx
  alias Easy.Forms.FormSubmission
  alias Easy.Repo

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts()
    |> distinct_identity_count()
  end

  @spec list(Ctx.t(), keyword()) :: %{count: non_neg_integer(), items: [map()]}
  def list(%Ctx{} = ctx, opts) do
    facts = facts(ctx)
    {offset, limit} = pagination(opts)

    items =
      facts
      |> FormSubmission.oldest()
      |> select([submission, review_assignment: assignment, review_client: client], %{
        submission: submission,
        client: client,
        assignment: assignment
      })
      |> Easy.Utils.paginate(offset, limit)
      |> Repo.all()
      |> Enum.map(fn item ->
        reason = %{
          code: :check_in_awaiting_review,
          submission_id: item.submission.id,
          submitted_at: item.submission.submitted_at
        }

        Map.put(item, :reasons, [reason])
      end)

    %{count: distinct_identity_count(facts), items: items}
  end

  defp facts(%Ctx{} = ctx) do
    FormSubmission
    |> FormSubmission.for_business(ctx.business_id)
    |> FormSubmission.unreviewed()
    |> FormSubmission.for_check_ins()
    |> FormSubmission.for_visible_clients(ctx)
  end

  defp distinct_identity_count(query) do
    query
    |> select([submission], submission.id)
    |> distinct(true)
    |> subquery()
    |> Repo.aggregate(:count)
  end

  defp pagination(opts) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)
    {offset, limit}
  end
end
