defmodule Easy.Chat do
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Clients
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Orgs.Coach
  alias Easy.Repo

  import Ecto.Query

  @spec list_conversations(Ctx.t(), keyword()) ::
          {:ok, %{count: non_neg_integer(), conversations: [Conversation.t()]}}
  def list_conversations(%Ctx{} = ctx, opts \\ []) do
    offset = max(Keyword.get(opts, :offset, 0), 0)
    limit = min(max(Keyword.get(opts, :limit, 20), 0), 100)

    base =
      Conversation
      |> Conversation.for_business(ctx.business_id)
      |> constrain_to_visible_clients(ctx)

    count = Repo.aggregate(base, :count)

    conversations =
      base
      |> Conversation.include_client()
      |> Conversation.select_coach_unread()
      |> Conversation.recent()
      |> offset(^offset)
      |> limit(^limit)
      |> Repo.all()

    {:ok, %{count: count, conversations: conversations}}
  end

  @spec get_conversation(Ctx.t(), String.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def get_conversation(%Ctx{} = ctx, conversation_id) do
    conversation =
      Conversation
      |> Conversation.for_business(ctx.business_id)
      |> Conversation.include_client()
      |> Conversation.select_coach_unread()
      |> Repo.get(conversation_id)

    with {:ok, conversation} <- ok_or_not_found(conversation),
         :ok <- Clients.authorize_client_id(ctx, conversation.client_id) do
      {:ok, conversation}
    end
  end

  @spec get_or_create_conversation_for_client(Ctx.t(), String.t()) ::
          {:ok, Conversation.t()} | {:error, :not_found}
  def get_or_create_conversation_for_client(%Ctx{} = ctx, client_id) do
    with {:ok, client} <- Clients.get_client(ctx, client_id) do
      upsert_conversation(ctx.business_id, client.id, :coach)
    end
  end

  @spec list_messages(Ctx.t(), String.t(), keyword()) ::
          {:ok, %{messages: [Message.t()], has_more: boolean()}} | {:error, :not_found}
  def list_messages(%Ctx{} = ctx, conversation_id, opts \\ []) do
    with {:ok, conversation} <- get_conversation(ctx, conversation_id) do
      {:ok, page_messages(ctx.business_id, conversation.id, opts)}
    end
  end

  @spec send_message(Ctx.t(), String.t(), map()) ::
          {:ok, Message.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def send_message(%Ctx{} = ctx, conversation_id, attrs) do
    with {:ok, coach} <- get_coach(ctx),
         {:ok, conversation} <- get_conversation(ctx, conversation_id) do
      insert_message(ctx.business_id, conversation, :coach, coach.id, attrs)
    end
  end

  @spec mark_read(Ctx.t(), String.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def mark_read(%Ctx{} = ctx, conversation_id) do
    with {:ok, conversation} <- get_conversation(ctx, conversation_id) do
      advance_read_cursor(conversation, :coach_last_read_at)
    end
  end

  @spec get_client_conversation(Ctx.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def get_client_conversation(%Ctx{} = ctx) do
    with {:ok, client} <- get_client_account(ctx) do
      upsert_conversation(ctx.business_id, client.id, :client)
    end
  end

  @spec list_client_messages(Ctx.t(), keyword()) ::
          {:ok, %{messages: [Message.t()], has_more: boolean()}} | {:error, :not_found}
  def list_client_messages(%Ctx{} = ctx, opts \\ []) do
    with {:ok, conversation} <- get_client_conversation(ctx) do
      {:ok, page_messages(ctx.business_id, conversation.id, opts)}
    end
  end

  @spec send_client_message(Ctx.t(), map()) ::
          {:ok, Message.t()} | {:error, :not_found | Ecto.Changeset.t()}
  def send_client_message(%Ctx{} = ctx, attrs) do
    with {:ok, client} <- get_client_account(ctx),
         {:ok, conversation} <- upsert_conversation(ctx.business_id, client.id, :client) do
      insert_message(ctx.business_id, conversation, :client, client.id, attrs)
    end
  end

  @spec mark_client_read(Ctx.t()) :: {:ok, Conversation.t()} | {:error, :not_found}
  def mark_client_read(%Ctx{} = ctx) do
    with {:ok, conversation} <- get_client_conversation(ctx) do
      advance_read_cursor(conversation, :client_last_read_at)
    end
  end

  # Private

  defp upsert_conversation(business_id, client_id, unread_for) do
    business_id
    |> Conversation.insert_changeset(client_id)
    |> Repo.insert(on_conflict: :nothing)

    Conversation
    |> Conversation.for_client(business_id, client_id)
    |> Conversation.include_client()
    |> unread_select(unread_for)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp unread_select(query, :coach), do: Conversation.select_coach_unread(query)
  defp unread_select(query, :client), do: Conversation.select_client_unread(query)

  defp page_messages(business_id, conversation_id, opts) do
    limit = min(max(Keyword.get(opts, :limit, 50), 1), 100)

    messages =
      Message
      |> Message.for_conversation(business_id, conversation_id)
      |> maybe_before(business_id, conversation_id, Keyword.get(opts, :before))
      |> Message.newest()
      |> limit(^(limit + 1))
      |> Repo.all()

    {page, rest} = Enum.split(messages, limit)
    %{messages: Enum.reverse(page), has_more: rest != []}
  end

  defp maybe_before(query, _business_id, _conversation_id, nil), do: query

  defp maybe_before(query, business_id, conversation_id, before_id) do
    case Message |> Message.for_conversation(business_id, conversation_id) |> Repo.get(before_id) do
      nil -> query
      cursor -> Message.before_message(query, cursor)
    end
  end

  defp insert_message(business_id, conversation, sender_type, sender_id, attrs) do
    result =
      Repo.transaction(fn ->
        case business_id
             |> Message.insert_changeset(conversation.id, sender_type, sender_id, attrs)
             |> Repo.insert() do
          {:ok, message} ->
            Conversation
            |> where([c], c.id == ^conversation.id)
            |> where([c], is_nil(c.last_message_at) or c.last_message_at <= ^message.inserted_at)
            |> Repo.update_all(
              set: [
                last_message_at: message.inserted_at,
                last_message_preview: String.slice(message.body, 0, 200),
                updated_at: DateTime.truncate(message.inserted_at, :second)
              ]
            )

            message

          {:error, changeset} ->
            Repo.rollback(changeset)
        end
      end)

    with {:ok, message} <- result do
      broadcast_message(conversation, message)
      {:ok, message}
    end
  end

  defp broadcast_message(conversation, message) do
    Phoenix.PubSub.broadcast(Easy.PubSub, "conversation:#{conversation.id}", {:chat_message_created, message})

    Phoenix.PubSub.broadcast(
      Easy.PubSub,
      "inbox:business:#{conversation.business_id}",
      {:conversation_updated, conversation.id}
    )
  end

  defp advance_read_cursor(conversation, field) do
    {1, [updated]} =
      from(c in Conversation,
        where: c.id == ^conversation.id,
        update: [set: [{^field, c.last_message_at}]],
        select: c
      )
      |> Repo.update_all([])

    {:ok, conversation |> Map.put(field, Map.get(updated, field)) |> Map.put(:unread_count, 0)}
  end

  # Coach inbox listings must only surface conversations for clients the caller
  # can see: owner -> all, trainer -> assigned only. The join predicate mirrors
  # Client.visible_to/2 — keep them in sync if visibility semantics change.
  defp constrain_to_visible_clients(query, %Ctx{owner?: true}), do: query

  defp constrain_to_visible_clients(query, %Ctx{coach_id: coach_id}) when not is_nil(coach_id) do
    join(query, :inner, [c], cl in Client, on: cl.id == c.client_id and cl.assigned_coach_id == ^coach_id)
  end

  # Fail closed: coach routes always provide owner? or coach_id. A ctx with
  # neither is malformed and must see nothing.
  defp constrain_to_visible_clients(query, %Ctx{}), do: where(query, false)

  defp get_client_account(%Ctx{} = ctx) do
    Client
    |> Client.for_business(ctx.business_id)
    |> Client.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp get_coach(%Ctx{} = ctx) do
    Coach
    |> Coach.for_business(ctx.business_id)
    |> Coach.for_user(ctx.user_id)
    |> Repo.one()
    |> ok_or_not_found()
  end

  defp ok_or_not_found(nil), do: {:error, :not_found}
  defp ok_or_not_found(record), do: {:ok, record}
end
