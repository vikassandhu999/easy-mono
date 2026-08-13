defmodule Easy.WorkbenchExpiringQueue do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Workbench.QueueSnooze

  @renewal_window_days 14

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts(Date.utc_today())
    |> Repo.aggregate(:count, :id)
  end

  @spec list(Ctx.t(), keyword()) :: %{count: non_neg_integer(), items: [map()]}
  def list(%Ctx{} = ctx, opts) do
    facts = facts(ctx, Date.utc_today())
    {offset, limit} = pagination(opts)

    items =
      facts
      |> order_by([client], asc: client.subscription_ends_on, asc: client.id)
      |> Easy.Utils.paginate(offset, limit)
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
    horizon = Date.add(today, @renewal_window_days)

    active_snooze =
      from(snooze in QueueSnooze,
        where:
          snooze.business_id == ^ctx.business_id and
            snooze.client_id == parent_as(:expiring_client).id and
            snooze.queue == :expiring and snooze.snoozed_until >= ^today,
        select: 1
      )

    visible_clients =
      Client
      |> Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.for_status(:active)

    from(client in visible_clients,
      as: :expiring_client,
      where:
        not is_nil(client.subscription_ends_on) and
          client.subscription_ends_on >= ^today and client.subscription_ends_on <= ^horizon,
      where: not exists(subquery(active_snooze))
    )
  end

  defp pagination(opts) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)
    {offset, limit}
  end
end
