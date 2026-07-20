defmodule EasyWeb.OpenApi.Schemas.ChatMessage do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{ChatAttachment, ChatMessageEmbed}
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
      body: %Schema{type: :string, nullable: true},
      attachments: %Schema{type: :array, items: ChatAttachment, default: []},
      embed: %Schema{allOf: [ChatMessageEmbed], nullable: true},
      inserted_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:id, :conversation_id, :sender_type, :sender_id, :body, :attachments, :embed, :inserted_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.FormSubmissionEmbedSnapshot do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "FormSubmissionEmbedSnapshot",
    type: :object,
    additionalProperties: false,
    properties: %{
      form_assignment_id: %Schema{type: :string, format: :uuid},
      title: %Schema{type: :string},
      submitted_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:form_assignment_id, :title, :submitted_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ChatMessageEmbed do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.FormSubmissionEmbedSnapshot
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ChatMessageEmbed",
    type: :object,
    additionalProperties: false,
    properties: %{
      type: %Schema{type: :string, enum: ["form_submission"]},
      id: %Schema{type: :string, format: :uuid},
      snapshot: FormSubmissionEmbedSnapshot
    },
    required: [:type, :id, :snapshot]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ChatMessageEmbedRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ChatMessageEmbedRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        type: %Schema{type: :string, enum: ["form_submission"]},
        id: %Schema{type: :string, format: :uuid}
      },
      required: [:type, :id]
    },
    struct?: false
  )
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

defmodule EasyWeb.OpenApi.Schemas.CoachChatMessageCreateRequest do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.ChatMessageEmbedRequest
  alias OpenApiSpex.Schema

  @body %Schema{type: :string, minLength: 1, maxLength: 4000, nullable: true}
  @nonblank_body %Schema{type: :string, minLength: 1, maxLength: 4000, pattern: "\\S"}
  @attachment_ids %Schema{
    type: :array,
    items: %Schema{type: :string, format: :uuid},
    maxItems: 4,
    uniqueItems: true,
    default: []
  }
  @nonempty_attachment_ids %Schema{
    type: :array,
    items: %Schema{type: :string, format: :uuid},
    minItems: 1,
    maxItems: 4,
    uniqueItems: true
  }
  @embed %Schema{allOf: [ChatMessageEmbedRequest], nullable: true}
  @required_embed %Schema{allOf: [ChatMessageEmbedRequest]}
  @properties %{body: @body, attachment_ids: @attachment_ids, embed: @embed}

  OpenApiSpex.schema(
    %{
      title: "CoachChatMessageCreateRequest",
      type: :object,
      anyOf: [
        %Schema{
          type: :object,
          additionalProperties: false,
          properties: Map.put(@properties, :body, @nonblank_body),
          required: [:body]
        },
        %Schema{
          type: :object,
          additionalProperties: false,
          properties: Map.put(@properties, :attachment_ids, @nonempty_attachment_ids),
          required: [:attachment_ids]
        },
        %Schema{
          type: :object,
          additionalProperties: false,
          properties: Map.put(@properties, :embed, @required_embed),
          required: [:embed]
        }
      ],
      example: %{
        "body" => "Energy improved.",
        "attachment_ids" => [],
        "embed" => %{"type" => "form_submission", "id" => "a65edc2e-f91b-4f01-9b31-1d0fb8b9104e"}
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientChatMessageCreateRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  @body %Schema{type: :string, minLength: 1, maxLength: 4000, nullable: true}
  @nonblank_body %Schema{type: :string, minLength: 1, maxLength: 4000, pattern: "\\S"}
  @attachment_ids %Schema{
    type: :array,
    items: %Schema{type: :string, format: :uuid},
    maxItems: 4,
    uniqueItems: true,
    default: []
  }
  @nonempty_attachment_ids %Schema{
    type: :array,
    items: %Schema{type: :string, format: :uuid},
    minItems: 1,
    maxItems: 4,
    uniqueItems: true
  }
  @properties %{body: @body, attachment_ids: @attachment_ids}

  OpenApiSpex.schema(
    %{
      title: "ClientChatMessageCreateRequest",
      type: :object,
      anyOf: [
        %Schema{
          type: :object,
          additionalProperties: false,
          properties: Map.put(@properties, :body, @nonblank_body),
          required: [:body]
        },
        %Schema{
          type: :object,
          additionalProperties: false,
          properties: Map.put(@properties, :attachment_ids, @nonempty_attachment_ids),
          required: [:attachment_ids]
        }
      ],
      example: %{"body" => "Here is today's set.", "attachment_ids" => []}
    },
    struct?: false
  )
end
