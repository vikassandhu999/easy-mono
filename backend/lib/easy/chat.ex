defmodule Easy.Chat do
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.ChatMessages
  alias Easy.ClientAccess
  alias Easy.Clients.Client
  alias Easy.Coaches
  alias Easy.Ctx
  alias Easy.Repo

  import Ecto.Query

  @spec list_conversations(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), conversations: [Conversation.t()]}}
  def list_conversations(%Ctx{} = ctx, opts \\ []) do
    base =
      ctx
      |> visible_conversations()
      |> Conversation.for_client_search(Keyword.get(opts, :search))

    count = Repo.aggregate(base, :count)

    conversations =
      base
      |> Conversation.include_client()
      |> Conversation.recent()
      |> Easy.Utils.paginate(opts)
      |> Repo.all()
      |> attach_unread_counts(ctx.business_id, :coach)

    {:ok, %{count: count, conversations: conversations}}
  end

  @type waiting_conversation :: %{
          conversation: Conversation.t(),
          waiting_message_count: non_neg_integer()
        }

  @spec count_waiting_conversations(Ctx.t()) :: {:ok, non_neg_integer()}
  def count_waiting_conversations(%Ctx{} = ctx) do
    {:ok, ctx |> waiting_conversations() |> Repo.count_unique()}
  end

  @spec list_waiting_conversations(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), items: [waiting_conversation()]}}
  def list_waiting_conversations(%Ctx{} = ctx, opts \\ []) do
    query = waiting_conversations(ctx)

    conversations =
      query
      |> Conversation.include_client()
      |> Conversation.oldest()
      |> Easy.Utils.paginate(opts)
      |> Repo.all()
      |> attach_unread_counts(ctx.business_id, :coach)

    waiting_counts = waiting_message_counts(conversations, ctx.business_id)

    items =
      Enum.map(conversations, fn conversation ->
        %{conversation: conversation, waiting_message_count: Map.get(waiting_counts, conversation.id, 0)}
      end)

    {:ok, %{count: Repo.count_unique(query), items: items}}
  end

  @spec get_conversation(Ctx.t(), String.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def get_conversation(%Ctx{} = ctx, conversation_id) do
    with {:ok, conversation} <- fetch_conversation(ctx, conversation_id) do
      {:ok, attach_unread_count(conversation, ctx.business_id, :coach)}
    end
  end

  @spec get_or_create_conversation_for_client(Ctx.t(), String.t()) ::
          {:ok, Conversation.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def get_or_create_conversation_for_client(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- ClientAccess.authorize_client(ctx, client_id),
         {:ok, conversation} <- upsert_conversation(ctx.business_id, client.id) do
      {:ok, attach_unread_count(conversation, ctx.business_id, :coach)}
    end
  end

  @spec list_messages(Ctx.t(), String.t(), keyword()) ::
          {:ok, ChatMessages.page()} | {:error, :not_found}
  def list_messages(%Ctx{} = ctx, conversation_id, opts \\ []) do
    with {:ok, conversation} <- fetch_conversation(ctx, conversation_id) do
      ChatMessages.list_messages(ctx, conversation, opts)
    end
  end

  @spec send_message(Ctx.t(), String.t(), map()) ::
          {:ok, Message.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def send_message(%Ctx{} = ctx, conversation_id, attrs) do
    with {:ok, coach} <- Coaches.get_membership(ctx),
         {:ok, conversation} <- fetch_conversation(ctx, conversation_id) do
      ChatMessages.send_message(ctx, conversation, {:coach, coach.id}, attrs)
    end
  end

  @spec mark_read(Ctx.t(), String.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def mark_read(%Ctx{} = ctx, conversation_id) do
    with {:ok, conversation} <- fetch_conversation(ctx, conversation_id) do
      advance_read_cursor(conversation, :coach_last_read_at)
    end
  end

  @spec mark_conversation_handled(Ctx.t(), String.t(), DateTime.t()) ::
          {:ok, :handled} | {:error, :not_found | :conflict}
  def mark_conversation_handled(%Ctx{} = ctx, conversation_id, expected_last_message_at) do
    Repo.transact(fn ->
      conversation =
        ctx
        |> visible_conversations()
        |> where([conversation], conversation.id == ^conversation_id)
        |> lock("FOR UPDATE")
        |> Repo.one()

      handle_locked_conversation(conversation, expected_last_message_at)
    end)
  end

  @spec get_client_conversation(Ctx.t()) :: {:ok, Conversation.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def get_client_conversation(%Ctx{} = ctx) do
    with {:ok, conversation} <- client_conversation(ctx) do
      {:ok, attach_unread_count(conversation, ctx.business_id, :client)}
    end
  end

  @spec list_client_messages(Ctx.t(), keyword()) ::
          {:ok, ChatMessages.page()} | {:error, :not_found | Ecto.Changeset.t()}
  def list_client_messages(%Ctx{} = ctx, opts \\ []) do
    with {:ok, conversation} <- client_conversation(ctx) do
      ChatMessages.list_messages(ctx, conversation, opts)
    end
  end

  @spec send_client_message(Ctx.t(), map()) ::
          {:ok, Message.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def send_client_message(%Ctx{} = ctx, attrs) do
    with {:ok, conversation} <- client_conversation(ctx) do
      ChatMessages.send_message(ctx, conversation, {:client, conversation.client_id}, attrs)
    end
  end

  @spec mark_client_read(Ctx.t()) :: {:ok, Conversation.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def mark_client_read(%Ctx{} = ctx) do
    with {:ok, conversation} <- client_conversation(ctx) do
      advance_read_cursor(conversation, :client_last_read_at)
    end
  end

  defp waiting_conversations(%Ctx{} = ctx) do
    ctx |> visible_conversations() |> Conversation.waiting()
  end

  defp visible_conversations(%Ctx{} = ctx) do
    Conversation
    |> Conversation.for_business(ctx.business_id)
    |> Conversation.for_visible_clients(ctx)
  end

  defp waiting_message_counts([], _business_id), do: %{}

  defp waiting_message_counts(conversations, business_id) do
    pairs =
      for %{id: id, waiting_since: waiting_since} <- conversations,
          not is_nil(waiting_since),
          do: {id, waiting_since}

    if pairs == [] do
      %{}
    else
      business_id
      |> Message.waiting_counts(pairs)
      |> Repo.all()
      |> Map.new()
    end
  end

  # Private

  defp fetch_conversation(ctx, conversation_id) do
    ctx
    |> visible_conversations()
    |> Conversation.include_client()
    |> Repo.get(conversation_id)
    |> ok_or_not_found()
  end

  defp client_conversation(%Ctx{} = ctx) do
    with {:ok, client_id} <- Ctx.fetch_client_id(ctx) do
      upsert_conversation(ctx.business_id, client_id)
    end
  end

  defp upsert_conversation(business_id, client_id) do
    Repo.transact(fn ->
      client = Client |> Client.for_business(business_id) |> lock("FOR KEY SHARE") |> Repo.get(client_id)

      with {:ok, _client} <- ok_or_not_found(client),
           {:ok, _inserted} <- insert_conversation(business_id, client_id) do
        load_conversation(business_id, client_id)
      end
    end)
  end

  defp insert_conversation(business_id, client_id) do
    business_id
    |> Conversation.insert_changeset(client_id)
    |> Repo.insert(on_conflict: :nothing, conflict_target: [:business_id, :client_id])
  end

  defp load_conversation(business_id, client_id) do
    Conversation
    |> Conversation.for_client(business_id, client_id)
    |> Conversation.include_client()
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp attach_unread_count(conversation, business_id, reader) do
    [conversation] = attach_unread_counts([conversation], business_id, reader)
    conversation
  end

  defp attach_unread_counts([], _business_id, _reader), do: []

  defp attach_unread_counts(conversations, business_id, reader) do
    ids = Enum.map(conversations, & &1.id)

    counts =
      business_id
      |> Message.unread_counts(ids, reader)
      |> Repo.all()
      |> Map.new()

    Enum.map(conversations, &Map.put(&1, :unread_count, Map.get(counts, &1.id, 0)))
  end

  defp advance_read_cursor(conversation, field) do
    from(c in Conversation,
      where: c.id == ^conversation.id and c.business_id == ^conversation.business_id,
      update: [set: [{^field, c.last_message_at}]],
      select: c
    )
    |> Repo.update_all([])
    |> case do
      {1, [updated]} -> {:ok, %{updated | client: conversation.client, unread_count: 0}}
      {0, []} -> {:error, :not_found}
    end
  end

  defp handle_locked_conversation(nil, _expected_last_message_at), do: {:error, :not_found}

  defp handle_locked_conversation(%Conversation{waiting_since: nil}, _expected_last_message_at),
    do: {:ok, :handled}

  defp handle_locked_conversation(
         %Conversation{last_message_at: last_message_at} = conversation,
         expected_last_message_at
       ) do
    if DateTime.compare(last_message_at, expected_last_message_at) == :eq do
      Conversation
      |> Conversation.for_business(conversation.business_id)
      |> where([candidate], candidate.id == ^conversation.id)
      |> Repo.update_all(set: [waiting_since: nil])

      {:ok, :handled}
    else
      {:error, :conflict}
    end
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
