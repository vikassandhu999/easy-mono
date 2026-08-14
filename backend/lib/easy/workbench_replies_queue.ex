defmodule Easy.WorkbenchRepliesQueue do
  import Ecto.Query

  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Ctx
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

    conversations =
      facts
      |> Conversation.include_client()
      |> Conversation.oldest()
      |> Easy.Utils.paginate(offset, limit)
      |> Repo.all()
      |> attach_unread_counts(ctx.business_id)

    waiting_counts = waiting_message_counts(conversations)

    items =
      Enum.map(conversations, fn conversation ->
        %{
          conversation: conversation,
          waiting_message_count: Map.get(waiting_counts, conversation.id, 0),
          client_status: conversation.client.status,
          reasons: [%{code: :reply_needed, waiting_since: conversation.waiting_since}]
        }
      end)

    %{count: distinct_identity_count(facts), items: items}
  end

  defp facts(%Ctx{} = ctx) do
    Conversation
    |> Conversation.for_business(ctx.business_id)
    |> Conversation.waiting()
    |> Conversation.for_visible_clients(ctx)
  end

  defp attach_unread_counts([], _business_id), do: []

  defp attach_unread_counts(conversations, business_id) do
    ids = Enum.map(conversations, & &1.id)

    counts =
      business_id
      |> Message.unread_counts(ids, :coach)
      |> Repo.all()
      |> Map.new()

    Enum.map(conversations, &Map.put(&1, :unread_count, Map.get(counts, &1.id, 0)))
  end

  defp waiting_message_counts([]), do: %{}

  defp waiting_message_counts(conversations) do
    pairs =
      for %{id: id, waiting_since: waiting_since} <- conversations,
          not is_nil(waiting_since),
          do: {id, waiting_since}

    if pairs == [] do
      %{}
    else
      ids = Enum.map(pairs, &elem(&1, 0))

      Message
      |> where([message], message.conversation_id in ^ids)
      |> where([message], message.sender_type == :client)
      |> join(:inner, [message], conversation in Conversation, on: conversation.id == message.conversation_id)
      |> where(
        [message, conversation],
        not is_nil(conversation.waiting_since) and
          message.inserted_at >= conversation.waiting_since
      )
      |> group_by([message], message.conversation_id)
      |> select([message], {message.conversation_id, count(message.id)})
      |> Repo.all()
      |> Map.new()
    end
  end

  defp distinct_identity_count(query) do
    query
    |> select([conversation], conversation.id)
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
