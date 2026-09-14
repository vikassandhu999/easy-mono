defmodule Easy.WorkbenchExpiringQueue do
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Workbench.QueueSnooze
  alias Easy.WorkbenchPage

  @type item :: %{
          client: Client.t(),
          reasons: [%{code: :engagement_ending_soon, ends_on: Date.t()}]
        }
  @type page :: %{count: non_neg_integer(), items: [item()], next_cursor: String.t() | nil}

  @spec count(Ctx.t()) :: non_neg_integer()
  def count(%Ctx{} = ctx) do
    ctx
    |> facts(Date.utc_today())
    |> Repo.aggregate(:count, :id)
  end

  @spec list(Ctx.t(), keyword()) :: {:ok, page()} | {:error, :cursor_incompatible | :invalid_cursor}
  def list(%Ctx{} = ctx, opts) do
    scope = %{"queue" => "expiring", "search" => Keyword.get(opts, :search, "") || ""}

    with {:ok, mode} <- WorkbenchPage.mode(opts, scope),
         {:ok, position} <- decode_position(mode) do
      facts = facts(ctx, Date.utc_today(), opts[:search])
      count = Repo.aggregate(facts, :count, :id)

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
      |> Client.search(search)

    from(client in visible_clients,
      as: :expiring_client,
      where: not exists(subquery(active_snooze))
    )
  end

  defp ordered(query), do: order_by(query, [client], asc: client.subscription_ends_on, asc: client.id)
  defp decode_position(:legacy), do: {:ok, nil}
  defp decode_position({:cursor, nil}), do: {:ok, nil}

  defp decode_position({:cursor, %{"ends_on" => ends_on, "id" => id}}) do
    with {:ok, ends_on} <- Date.from_iso8601(ends_on), {:ok, id} <- Ecto.UUID.cast(id), do: {:ok, %{ends_on: ends_on, id: id}}
  end

  defp decode_position(_mode), do: {:error, :invalid_cursor}
  defp after_position(query, nil), do: query

  defp after_position(query, %{ends_on: ends_on, id: id}) do
    where(query, [client], client.subscription_ends_on > ^ends_on or (client.subscription_ends_on == ^ends_on and client.id > ^id))
  end

  defp position_of(client), do: %{"ends_on" => Date.to_iso8601(client.subscription_ends_on), "id" => client.id}

  defp to_item(client), do: %{client: client, reasons: [%{code: :engagement_ending_soon, ends_on: client.subscription_ends_on}]}
end
