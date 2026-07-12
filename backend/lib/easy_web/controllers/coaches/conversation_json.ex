defmodule EasyWeb.Coaches.ConversationJSON do
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Clients.Client
  alias EasyWeb.AttachmentJSON

  @spec index(%{conversations: [Conversation.t()], count: non_neg_integer()}) :: map()
  def index(%{conversations: conversations, count: count}),
    do: %{data: Enum.map(conversations, &data/1), count: count}

  @spec show(%{conversation: Conversation.t()}) :: map()
  def show(%{conversation: conversation}), do: %{data: data(conversation)}

  @spec messages(%{messages: [Message.t()], has_more: boolean()}) :: map()
  def messages(%{messages: messages, has_more: has_more}),
    do: %{data: Enum.map(messages, &message_data/1), has_more: has_more}

  @spec message(%{message: Message.t()}) :: map()
  def message(%{message: message}), do: %{data: message_data(message)}

  @spec data(Conversation.t()) :: map()
  def data(%Conversation{} = c) do
    %{
      id: c.id,
      client_id: c.client_id,
      client_name: client_name(c.client),
      last_message_at: c.last_message_at,
      last_message_preview: c.last_message_preview,
      unread_count: c.unread_count || 0,
      inserted_at: c.inserted_at,
      updated_at: c.updated_at
    }
  end

  @spec message_data(Message.t()) :: map()
  def message_data(%Message{} = m) do
    %{
      id: m.id,
      conversation_id: m.conversation_id,
      sender_type: m.sender_type,
      sender_id: m.sender_id,
      body: m.body,
      attachments: Enum.map(m.attachments, &AttachmentJSON.data/1),
      embed: embed_data(m),
      inserted_at: m.inserted_at
    }
  end

  defp embed_data(%Message{embed_type: nil}), do: nil

  defp embed_data(%Message{} = message) do
    %{type: message.embed_type, id: message.embed_id, snapshot: message.embed_snapshot}
  end

  defp client_name(%Client{} = client),
    do: String.trim("#{client.first_name} #{client.last_name}")

  defp client_name(_), do: nil
end
