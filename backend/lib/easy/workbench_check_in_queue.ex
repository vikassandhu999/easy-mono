defmodule Easy.WorkbenchCheckInQueue do
  import Ecto.Query

  alias Easy.Ctx
  alias Easy.Forms.FormSubmission
  alias Easy.Repo
  alias Easy.WorkbenchPage

  @type item :: %{
          submission: FormSubmission.t(),
          client: Easy.Clients.Client.t(),
          assignment: Easy.Forms.FormAssignment.t(),
          reasons: [%{code: :check_in_awaiting_review, submission_id: String.t(), submitted_at: DateTime.t()}]
        }
  @type page :: %{count: non_neg_integer(), items: [item()], next_cursor: String.t() | nil}

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts()
    |> Repo.count_unique()
  end

  @spec list(Ctx.t(), keyword()) :: {:ok, page()} | {:error, :cursor_incompatible | :invalid_cursor}
  def list(%Ctx{} = ctx, opts) do
    scope = %{"queue" => "check-ins", "search" => Keyword.get(opts, :search, "") || ""}

    with {:ok, mode} <- WorkbenchPage.mode(opts, scope),
         {:ok, position} <- decode_position(mode) do
      facts = facts(ctx, opts[:search])
      count = Repo.count_unique(facts)

      page =
        case mode do
          :legacy ->
            %{count: count, items: facts |> ordered() |> Easy.Utils.paginate(opts) |> Repo.all(), next_cursor: nil}

          {:cursor, _cursor} ->
            limit = WorkbenchPage.limit(opts)
            facts |> after_position(position) |> ordered() |> limit(^(limit + 1)) |> Repo.all() |> WorkbenchPage.finish(limit, count, scope, &position_of/1)
        end

      {:ok, Map.update!(page, :items, fn items -> Enum.map(items, &to_item/1) end)}
    end
  end

  defp facts(%Ctx{} = ctx, search \\ nil) do
    FormSubmission.awaiting_check_in_review(ctx)
    |> FormSubmission.for_review_search(search)
  end

  defp ordered(query) do
    query
    |> FormSubmission.oldest()
    |> select([submission, review_assignment: assignment, review_client: client], %{
      submission: submission,
      client: client,
      assignment: assignment
    })
  end

  defp decode_position(:legacy), do: {:ok, nil}
  defp decode_position({:cursor, nil}), do: {:ok, nil}

  defp decode_position({:cursor, %{"submitted_at" => submitted_at, "id" => id}}) when is_binary(submitted_at) and is_binary(id) do
    with {:ok, submitted_at, 0} <- DateTime.from_iso8601(submitted_at),
         {:ok, id} <- Ecto.UUID.cast(id) do
      {:ok, %{submitted_at: submitted_at, id: id}}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  defp decode_position(_mode), do: {:error, :invalid_cursor}
  defp after_position(query, nil), do: query

  defp after_position(query, %{submitted_at: submitted_at, id: id}) do
    where(query, [submission], submission.submitted_at > ^submitted_at or (submission.submitted_at == ^submitted_at and submission.id > ^id))
  end

  defp position_of(item), do: %{"submitted_at" => DateTime.to_iso8601(item.submission.submitted_at), "id" => item.submission.id}

  defp to_item(item) do
    Map.put(item, :reasons, [%{code: :check_in_awaiting_review, submission_id: item.submission.id, submitted_at: item.submission.submitted_at}])
  end
end
