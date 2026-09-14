defmodule Easy.WorkbenchQuietQueue do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.FormAssignment
  alias Easy.Repo
  alias Easy.Workbench.QueueSnooze
  alias Easy.WorkbenchPage

  @type item :: %{
          client: Client.t(),
          reasons: [%{code: :missed_check_in, assignment_id: String.t(), due_on: Date.t()}]
        }
  @type page :: %{count: non_neg_integer(), items: [item()], next_cursor: String.t() | nil}

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts(Date.utc_today())
    |> Repo.aggregate(:count, :client_id)
  end

  @spec list(Ctx.t(), keyword()) :: {:ok, page()} | {:error, :cursor_incompatible | :invalid_cursor}
  def list(%Ctx{} = ctx, opts) do
    scope = %{"queue" => "quiet", "search" => Keyword.get(opts, :search, "") || ""}

    with {:ok, mode} <- WorkbenchPage.mode(opts, scope),
         {:ok, position} <- decode_position(mode) do
      facts = facts(ctx, Date.utc_today(), opts[:search])
      count = Repo.aggregate(facts, :count, :client_id)

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

  defp facts(%Ctx{} = ctx, today, search \\ nil) do
    latest_due = latest_due_assignments(ctx, today, search)

    active_snooze =
      QueueSnooze
      |> QueueSnooze.for_business(ctx.business_id)
      |> QueueSnooze.for_queue(:quiet)
      |> QueueSnooze.active(today)
      |> where([snooze], snooze.client_id == parent_as(:quiet_assignment).client_id)
      |> select(1)

    from(assignment in subquery(latest_due),
      as: :quiet_assignment,
      join: client in Client,
      on:
        client.id == assignment.client_id and
          client.business_id == ^ctx.business_id,
      where: assignment.status == :missed,
      where: not exists(subquery(active_snooze))
    )
  end

  defp latest_due_assignments(%Ctx{} = ctx, today, search) do
    visible_clients =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.for_status(:active)
      |> Client.search(search)

    assignments =
      FormAssignment.for_business(ctx.business_id)
      |> FormAssignment.latest_due_check_in_per_client(today)

    from(assignment in assignments,
      join: client in subquery(visible_clients),
      on:
        client.id == assignment.client_id and
          client.business_id == assignment.business_id,
      select: %{
        client_id: assignment.client_id,
        assignment_id: assignment.id,
        due_on: assignment.due_date,
        status: assignment.status
      }
    )
  end

  defp ordered(query) do
    query
    |> order_by([assignment, client], asc: assignment.due_on, asc: client.id)
    |> select([assignment, client], %{
      client: client,
      assignment_id: assignment.assignment_id,
      due_on: assignment.due_on
    })
  end

  defp decode_position(:legacy), do: {:ok, nil}
  defp decode_position({:cursor, nil}), do: {:ok, nil}

  defp decode_position({:cursor, %{"due_on" => due_on, "id" => id}}) when is_binary(due_on) and is_binary(id) do
    with {:ok, due_on} <- Date.from_iso8601(due_on), {:ok, id} <- Ecto.UUID.cast(id), do: {:ok, %{due_on: due_on, id: id}}
  end

  defp decode_position(_mode), do: {:error, :invalid_cursor}
  defp after_position(query, nil), do: query

  defp after_position(query, %{due_on: due_on, id: id}) do
    where(query, [assignment, client], assignment.due_on > ^due_on or (assignment.due_on == ^due_on and client.id > ^id))
  end

  defp position_of(row), do: %{"due_on" => Date.to_iso8601(row.due_on), "id" => row.client.id}

  defp to_item(row) do
    %{client: row.client, reasons: [%{code: :missed_check_in, assignment_id: row.assignment_id, due_on: row.due_on}]}
  end
end
