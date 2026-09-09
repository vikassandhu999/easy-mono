defmodule Easy.WorkbenchExpiringQueue do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Workbench.QueueSnooze

  @type item :: %{
          client: Client.t(),
          reasons: [%{code: :engagement_ending_soon, ends_on: Date.t()}]
        }
  @type page :: %{count: non_neg_integer(), items: [item()]}

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts(Date.utc_today())
    |> Repo.aggregate(:count, :id)
  end

  @spec list(Ctx.t(), keyword()) :: page()
  def list(%Ctx{} = ctx, opts) do
    facts = facts(ctx, Date.utc_today())

    items =
      facts
      |> order_by([client], asc: client.subscription_ends_on, asc: client.id)
      |> Easy.Utils.paginate(opts)
      |> Repo.all()
      |> Enum.map(fn client ->
        %{
          client: client,
          reasons: [
            %{code: :engagement_ending_soon, ends_on: client.subscription_ends_on}
          ]
        }
      end)

    %{count: Repo.aggregate(facts, :count, :id), items: items}
  end

  defp facts(%Ctx{} = ctx, today) do
    active_snooze =
      QueueSnooze
      |> QueueSnooze.for_business(ctx.business_id)
      |> QueueSnooze.for_queue(:expiring)
      |> QueueSnooze.active(today)
      |> where([snooze], snooze.client_id == parent_as(:expiring_client).id)
      |> select(1)

    visible_clients =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.expiring_soon(today)

    from(client in visible_clients,
      as: :expiring_client,
      where: not exists(subquery(active_snooze))
    )
  end
end
