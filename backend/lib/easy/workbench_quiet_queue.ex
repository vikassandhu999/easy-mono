defmodule Easy.WorkbenchQuietQueue do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.FormAssignment
  alias Easy.Repo
  alias Easy.Workbench.QueueSnooze

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts(Date.utc_today())
    |> Repo.aggregate(:count, :client_id)
  end

  @spec list(Ctx.t(), keyword()) :: %{count: non_neg_integer(), items: [map()]}
  def list(%Ctx{} = ctx, opts) do
    facts = facts(ctx, Date.utc_today())
    {offset, limit} = pagination(opts)

    items =
      facts
      |> order_by([assignment, client], asc: assignment.due_on, asc: client.id)
      |> select([assignment, client], %{
        client: client,
        assignment_id: assignment.assignment_id,
        due_on: assignment.due_on
      })
      |> Easy.Utils.paginate(offset, limit)
      |> Repo.all()
      |> Enum.map(fn row ->
        %{
          client: row.client,
          reasons: [
            %{
              code: :missed_check_in,
              assignment_id: row.assignment_id,
              due_on: row.due_on
            }
          ]
        }
      end)

    %{count: Repo.aggregate(facts, :count, :client_id), items: items}
  end

  defp facts(%Ctx{} = ctx, today) do
    latest_due = latest_due_assignments(ctx, today)

    active_snooze =
      from(snooze in QueueSnooze,
        where:
          snooze.business_id == ^ctx.business_id and
            snooze.client_id == parent_as(:quiet_assignment).client_id and
            snooze.queue == :quiet and snooze.snoozed_until >= ^today,
        select: 1
      )

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

  defp latest_due_assignments(%Ctx{} = ctx, today) do
    visible_clients =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.for_status(:active)

    from(assignment in FormAssignment,
      join: client in subquery(visible_clients),
      on:
        client.id == assignment.client_id and
          client.business_id == assignment.business_id,
      where:
        assignment.business_id == ^ctx.business_id and
          assignment.purpose == :check_in and
          not is_nil(assignment.due_date) and assignment.due_date <= ^today,
      distinct: assignment.client_id,
      order_by: [
        asc: assignment.client_id,
        desc: assignment.due_date,
        desc: assignment.inserted_at,
        desc: assignment.id
      ],
      select: %{
        client_id: assignment.client_id,
        assignment_id: assignment.id,
        due_on: assignment.due_date,
        status: assignment.status
      }
    )
  end

  defp pagination(opts) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)
    {offset, limit}
  end
end
