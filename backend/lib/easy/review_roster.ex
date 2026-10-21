defmodule Easy.Reviews.Roster do
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Easy.Reviews.Review
  alias Easy.Trackers.Reader
  import Ecto.Query

  @spec list(Ctx.t(), keyword()) :: {:ok, map()} | {:error, term()}
  def list(ctx, opts \\ []) do
    with :ok <- Ctx.ensure_coach(ctx) do
      Repo.snapshot(fn -> page(ctx, opts) end)
    end
  end

  defp page(ctx, opts) do
    clients =
      Client.for_business(ctx.business_id)
      |> Client.visible_to(ctx)
      |> Client.search(opts[:q])
      |> Client.for_state(opts[:state])
      |> Client.include_preloads(ctx.business_id)
      |> Repo.all()

    ids = Enum.map(clients, & &1.id)

    latest =
      Repo.all(
        from(r in Easy.Reviews.Review,
          where: r.business_id == ^ctx.business_id and r.client_id in ^ids,
          distinct: r.client_id,
          order_by: [asc: r.client_id, desc: r.reviewed_at, desc: r.id]
        )
      )
      |> Map.new(&{&1.client_id, &1})

    conversations = Repo.all(from(c in Conversation, where: c.business_id == ^ctx.business_id and c.client_id in ^ids))
    unread = Message.unread_counts(ctx.business_id, Enum.map(conversations, & &1.id), :coach) |> Repo.all() |> Map.new()
    unread = Map.new(conversations, &{&1.client_id, Map.get(unread, &1.id, 0)})
    waiting = Reader.waiting_for_clients(ctx, clients)

    rows =
      Enum.map(clients, &row(&1, latest[&1.id], Map.get(unread, &1.id, 0), waiting[&1.id]))
      |> Enum.filter(&matches?(&1, opts))

    sort = opts[:sort] || :due
    direction = opts[:direction] || :asc
    signature = {ctx.business_id, ctx.coach_id, Enum.sort(Keyword.drop(opts, [:cursor, :limit]))}

    with {:ok, after_key} <- position(opts[:cursor], signature) do
      ordered = Enum.sort_by(rows, &key(&1, sort), direction)
      remaining = if after_key, do: Enum.filter(ordered, &after?(key(&1, sort), after_key, direction)), else: ordered
      limit = Easy.CursorPage.limit(opts)
      {data, rest} = Enum.split(remaining, limit)

      cursor =
        if rest != [],
          do: Phoenix.Token.sign(EasyWeb.Endpoint, "review-roster", {signature, key(List.last(data), sort)})

      {:ok, %{data: data, count: length(rows), next_cursor: cursor}}
    end
  end

  defp row(client, latest, unread, waiting) do
    client = Client.derive(client, DateTime.utc_now())

    client
    |> Map.take([
      :id,
      :full_name,
      :preferred_name,
      :focus,
      :review_frequency_days,
      :current_term,
      :email,
      :phone,
      :state
    ])
    |> Map.merge(Review.due(client, latest, Client.local_date(client, DateTime.utc_now())))
    |> Map.merge(%{
      client_id: client.id,
      coach_name: Coach.full_name(client.coach),
      assessment: latest && latest.assessment,
      unread_chat: unread,
      waiting_since: waiting
    })
  end

  defp matches?(row, opts) when is_list(opts), do: Enum.all?(opts, &matches?(row, &1))
  defp matches?(r, {:due, value}) when value in [:due, "due"], do: r.due
  defp matches?(r, {:due, value}) when value in [:overdue, "overdue"], do: r.due and r.overdue_days > 0
  defp matches?(r, {:due, value}) when value in [:inactive, "inactive"], do: is_nil(r.current_term)
  defp matches?(r, {:due, value}) when value in [:not_due, "not_due"], do: not r.due and not is_nil(r.current_term)
  defp matches?(r, {:assessment, value}) when not is_nil(value), do: to_string(r.assessment) == to_string(value)
  defp matches?(r, {:unread, value}) when is_boolean(value), do: r.unread_chat > 0 == value
  defp matches?(r, {:waiting, value}) when is_boolean(value), do: not is_nil(r.waiting_since) == value
  defp matches?(r, {:last_reviewed, value}) when value in [:never, "never"], do: is_nil(r.last_reviewed_at)
  defp matches?(r, {:last_reviewed, value}) when value in [:reviewed, "reviewed"], do: not is_nil(r.last_reviewed_at)
  defp matches?(_, _), do: true

  defp key(row, sort), do: {sort_value(row, sort), row.id}
  defp sort_value(r, :name), do: String.downcase(r.preferred_name || r.full_name)
  defp sort_value(r, :due), do: {is_nil(r.due_on), r.due_on && Date.to_gregorian_days(r.due_on)}
  defp sort_value(r, :last_reviewed), do: stamp(r.last_reviewed_at)
  defp sort_value(r, :assessment), do: r.assessment |> to_string()
  defp sort_value(r, :unread_chat), do: r.unread_chat
  defp sort_value(r, :waiting_since), do: stamp(r.waiting_since)
  defp stamp(nil), do: {true, 0}
  defp stamp(value), do: {false, DateTime.to_unix(value, :microsecond)}
  defp after?(key, position, :asc), do: key > position
  defp after?(key, position, :desc), do: key < position
  defp position(cursor, _) when cursor in [nil, "start"], do: {:ok, nil}

  defp position(cursor, signature) do
    case Phoenix.Token.verify(EasyWeb.Endpoint, "review-roster", cursor, max_age: 86_400) do
      {:ok, {^signature, key}} -> {:ok, key}
      _ -> {:error, :invalid_cursor}
    end
  end
end
