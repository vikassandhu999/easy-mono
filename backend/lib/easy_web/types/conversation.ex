defmodule EasyWeb.Types.Conversation do
  use EasyWeb.Type

  alias Easy.Chat.Conversation, as: ChatConversation
  alias Easy.Clients.Client

  @type t :: %{
          required(:id) => String.t(),
          required(:client_id) => String.t(),
          required(:client_name) => String.t() | nil,
          required(:last_message_at) => DateTime.t() | nil,
          required(:last_message_preview) => String.t() | nil,
          required(:last_message_role) => :coach | :client | nil,
          required(:waiting_since) => DateTime.t() | nil,
          required(:unread_count) => non_neg_integer(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type list_query :: %{
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:search) => String.t()
        }

  @type mark_handled :: %{required(:expected_last_message_at) => DateTime.t()}

  @type mark_read_query :: %{optional(:through) => DateTime.t()}

  @type inbox_query :: %{
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:status) => :all | :waiting | :unread
        }

  @spec format(ChatConversation.t()) :: t()
  def format(%ChatConversation{client: %Client{} = client} = conversation) do
    %{
      id: conversation.id,
      client_id: conversation.client_id,
      client_name: String.trim("#{client.first_name} #{client.last_name}"),
      last_message_at: conversation.last_message_at,
      last_message_preview: conversation.last_message_preview,
      last_message_role: conversation.last_message_role,
      waiting_since: conversation.waiting_since,
      unread_count: conversation.unread_count || 0,
      inserted_at: conversation.inserted_at,
      updated_at: conversation.updated_at
    }
  end
end

defmodule EasyWeb.Types.ConversationInbox do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Conversation.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end
