defmodule Easy.CheckInRequests do
  alias Easy.{ClientAccess, Ctx, CursorPage, Repo, Search}
  alias Easy.Forms.{FormAssignment, FormSubmission, FormTemplate}

  import Ecto.Query

  @spec list_requests_for_client(Ctx.t(), String.t(), keyword()) ::
          {:ok, CursorPage.t(map())} | {:error, atom()}
  def list_requests_for_client(%Ctx{} = ctx, client_id, opts \\ []) do
    with :ok <- ClientAccess.authorize_client_id(ctx, client_id) do
      query =
        FormAssignment.for_client(ctx.business_id, client_id)
        |> where([assignment], assignment.purpose == :check_in)
        |> join(:inner, [assignment], template in FormTemplate, on: template.id == assignment.form_template_id and template.business_id == assignment.business_id)
        |> status(Keyword.get(opts, :status))
        |> search(Keyword.get(opts, :search))

      page(query, ctx.business_id, client_id, opts)
    end
  end

  defp page(query, business_id, client_id, opts) do
    limit = CursorPage.limit(opts)

    with {:ok, page_query} <- CursorPage.query(query, Keyword.get(opts, :cursor) || "start", limit) do
      Repo.snapshot(fn ->
        rows = page_query |> projection(business_id, client_id) |> Repo.all()
        {:ok, CursorPage.finish(rows, limit, Repo.aggregate(query, :count, :id))}
      end)
    end
  end

  defp status(query, value) when value in [nil, :all, "all"], do: query

  defp status(query, value) when value in [:outstanding, "outstanding"] do
    where(query, [assignment], assignment.status in [:assigned, :in_progress, :missed])
  end

  defp status(query, value), do: where(query, [assignment], assignment.status == ^value)

  defp search(query, value) when value in [nil, ""], do: query

  defp search(query, value) do
    where(query, [_assignment, template], ilike(template.name, ^Search.like_pattern(String.trim(value))))
  end

  defp projection(query, business_id, client_id) do
    submissions =
      FormSubmission.for_business(business_id)
      |> where([submission], submission.client_id == ^client_id)
      |> distinct([submission], submission.form_assignment_id)
      |> order_by([submission], asc: submission.form_assignment_id, desc: submission.submitted_at, desc: submission.id)

    from([assignment, template] in query,
      left_join: submission in subquery(submissions),
      on: submission.form_assignment_id == assignment.id,
      select: %{
        id: assignment.id,
        client_id: assignment.client_id,
        form_name: template.name,
        status: assignment.status,
        priority: assignment.priority,
        due_date: assignment.due_date,
        inserted_at: assignment.inserted_at,
        latest_submission_id: submission.id
      }
    )
  end
end
