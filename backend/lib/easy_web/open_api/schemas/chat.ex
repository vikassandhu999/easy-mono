defmodule EasyWeb.OpenApi.Schemas.ChatMessage do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ChatMessage",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      conversation_id: %Schema{type: :string, format: :uuid},
      sender_type: %Schema{type: :string, enum: ~w(coach client)},
      sender_id: %Schema{type: :string, format: :uuid},
      body: %Schema{type: :string},
      inserted_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:id, :conversation_id, :sender_type, :sender_id, :body, :inserted_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.Conversation do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "Conversation",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      client_id: %Schema{type: :string, format: :uuid},
      client_name: %Schema{type: :string, nullable: true},
      last_message_at: %Schema{type: :string, format: :"date-time", nullable: true},
      last_message_preview: %Schema{type: :string, nullable: true},
      unread_count: %Schema{type: :integer},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:id, :client_id, :unread_count, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ConversationResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Conversation, Shared}
  OpenApiSpex.schema(Shared.data_response(Conversation, "ConversationResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ConversationListResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Conversation, Shared}
  OpenApiSpex.schema(Shared.list_response(Conversation, "ConversationListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ChatMessageResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{ChatMessage, Shared}
  OpenApiSpex.schema(Shared.data_response(ChatMessage, "ChatMessageResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ChatMessagesResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.ChatMessage
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ChatMessagesResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: ChatMessage, description: "Ascending by inserted_at"},
      has_more: %Schema{type: :boolean}
    },
    required: [:data, :has_more]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ChatMessageCreateRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ChatMessageCreateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        body: %Schema{type: :string, minLength: 1, maxLength: 4000}
      },
      required: [:body],
      example: %{"body" => "Sounds good, see you Monday!"}
    },
    struct?: false
  )
end
