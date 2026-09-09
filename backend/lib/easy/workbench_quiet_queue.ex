defmodule Easy.WorkbenchQuietQueue do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Forms.FormAssignment
  alias Easy.Repo
  alias Easy.Workbench.QueueSnooze

  @type item :: %{
          client: Client.t(),
          reasons: [%{code: :missed_check_in, assignment_id: String.t(), due_on: Date.t()}]
        }
  @type page :: %{count: non_neg_integer(), items: [item()]}

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts(Date.utc_today())
    |> Repo.aggregate(:count, :client_id)
  end

  @spec list(Ctx.t(), keyword()) :: page()
  def list(%Ctx{} = ctx, opts) do
    facts = facts(ctx, Date.utc_today())

    items =
      facts
      |> order_by([assignment, client], asc: assignment.due_on, asc: client.id)
      |> select([assignment, client], %{
        client: client,
        assignment_id: assignment.assignment_id,
        due_on: assignment.due_on
      })
      |> Easy.Utils.paginate(opts)
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

  defp latest_due_assignments(%Ctx{} = ctx, today) do
    visible_clients =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.for_status(:active)

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
end
