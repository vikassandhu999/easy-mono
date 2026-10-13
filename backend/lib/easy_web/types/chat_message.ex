defmodule EasyWeb.Types.Attachment do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:content_type) =>
            :"image/jpeg"
            | :"image/png"
            | :"image/webp"
            | :"image/heic"
            | :"video/mp4"
            | :"video/webm"
            | :"video/quicktime"
            | :"audio/webm"
            | :"audio/mp4"
            | :"audio/mpeg",
          required(:byte_size) => pos_integer(),
          required(:duration_ms) => pos_integer() | nil
        }
end

defmodule EasyWeb.Types.ChatRecordSnapshot do
  use EasyWeb.Type

  @type t :: %{
          required(:title) => String.t(),
          optional(:revision) => pos_integer(),
          optional(:occurred_on) => Date.t(),
          optional(:recorded_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.ChatMessageEmbed do
  use EasyWeb.Type

  @type t :: %{
          required(:type) => :review,
          required(:id) => String.t(),
          required(:snapshot) => EasyWeb.Types.ChatRecordSnapshot.t()
        }
end

defmodule EasyWeb.Types.ChatMessage do
  use EasyWeb.Type

  alias Easy.Chat.Message
  alias EasyWeb.Types.Attachment

  @type t :: %{
          required(:id) => String.t(),
          required(:conversation_id) => String.t(),
          required(:sender_type) => :coach | :client,
          required(:sender_id) => String.t(),
          required(:sender_name) => String.t() | nil,
          required(:request_id) => String.t() | nil,
          required(:edited_at) => DateTime.t() | nil,
          required(:body) => String.t() | nil,
          required(:attachments) => [EasyWeb.Types.Attachment.t()],
          required(:embed) => EasyWeb.Types.ChatMessageEmbed.t() | nil,
          required(:inserted_at) => DateTime.t()
        }

  @type list_query :: %{
          optional(:before) => String.t(),
          optional(:limit) => integer()
        }

  @type coach_create :: %{
          optional(:body) => String.t() | nil,
          optional(:request_id) => Ecto.UUID.t(),
          optional(:attachment_ids) => [String.t()]
        }

  @type history_query :: %{optional(:cursor) => String.t(), optional(:limit) => pos_integer()}

  @type client_create :: %{
          optional(:body) => String.t() | nil,
          optional(:request_id) => Ecto.UUID.t(),
          optional(:attachment_ids) => [String.t()]
        }

  @spec format(Message.t()) :: t()
  def format(%Message{embed_type: nil} = message), do: message_data(message, nil)

  def format(%Message{} = message) do
    embed = %{
      type: message.embed_type,
      id: message.embed_id,
      snapshot: message.embed_snapshot
    }

    message_data(message, embed)
  end

  defp message_data(message, embed) do
    %{
      id: message.id,
      conversation_id: message.conversation_id,
      sender_type: message.sender_type,
      sender_id: message.sender_id,
      sender_name: message.sender_name,
      request_id: message.request_id,
      body: message.body,
      edited_at: message.edited_at,
      attachments: Enum.map(message.attachments, &Attachment.take/1),
      embed: embed,
      inserted_at: message.inserted_at
    }
  end
end

defmodule EasyWeb.Types.ChatMessagePage do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.ChatMessage.t()],
          required(:has_more) => boolean()
        }
end

defmodule EasyWeb.Types.ChatMessageHistory do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.ChatMessage.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil,
          required(:latest_message_at) => DateTime.t() | nil
        }
end
