defmodule EasyWeb.OpenApi.Schemas.ThreadModules do
  def modules, do: ~w(nutrition training fitness profile general)
  def statuses, do: ~w(open resolved archived)
  def priorities, do: ~w(normal attention)
  def actor_types, do: ~w(coach client system)
end

defmodule EasyWeb.OpenApi.Schemas.ThreadMessage do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{Shared, ThreadModules}

  OpenApiSpex.schema(%{
    title: "ThreadMessage",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          thread_id: %Schema{type: :string, format: :uuid},
          author_type: %Schema{type: :string, enum: ThreadModules.actor_types()},
          author_id: %Schema{type: :string, format: :uuid, nullable: true},
          body: %Schema{type: :string},
          kind: %Schema{type: :string},
          metadata: %Schema{type: :object, additionalProperties: true}
        },
        Shared.timestamps()
      ),
    required: [:id, :thread_id, :author_type, :body, :kind, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.Thread do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{Shared, ThreadModules}

  OpenApiSpex.schema(%{
    title: "Thread",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          client_id: %Schema{type: :string, format: :uuid},
          module: %Schema{type: :string, enum: ThreadModules.modules()},
          subject_type: %Schema{type: :string},
          subject_ref: %Schema{type: :object, additionalProperties: true},
          title: %Schema{type: :string, nullable: true},
          status: %Schema{type: :string, enum: ThreadModules.statuses()},
          priority: %Schema{type: :string, enum: ThreadModules.priorities()},
          last_message_at: %Schema{type: :string, format: :"date-time", nullable: true},
          last_message_preview: %Schema{type: :string, nullable: true},
          created_by_type: %Schema{type: :string, enum: ThreadModules.actor_types()},
          created_by_id: %Schema{type: :string, format: :uuid, nullable: true}
        },
        Shared.timestamps()
      ),
    required: [:id, :client_id, :module, :status, :priority, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ThreadWithMessages do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{Thread, ThreadMessage}

  OpenApiSpex.schema(%{
    title: "ThreadWithMessages",
    type: :object,
    additionalProperties: false,
    properties:
      Map.put(
        Thread.schema().properties,
        :messages,
        %Schema{type: :array, items: ThreadMessage}
      ),
    required: Thread.schema().required
  })
end

defmodule EasyWeb.OpenApi.Schemas.ThreadResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Thread, Shared}
  OpenApiSpex.schema(Shared.data_response(Thread, "ThreadResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ThreadDetailResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{ThreadWithMessages, Shared}
  OpenApiSpex.schema(Shared.data_response(ThreadWithMessages, "ThreadDetailResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ThreadListResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Thread, Shared}
  OpenApiSpex.schema(Shared.list_response(Thread, "ThreadListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ThreadMessageResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{ThreadMessage, Shared}
  OpenApiSpex.schema(Shared.data_response(ThreadMessage, "ThreadMessageResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.CoachThreadCreateRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.ThreadModules

  OpenApiSpex.schema(
    %{
      title: "CoachThreadCreateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        module: %Schema{type: :string, enum: ThreadModules.modules()},
        title: %Schema{type: :string},
        subject_type: %Schema{type: :string},
        subject_ref: %Schema{type: :object, additionalProperties: true},
        priority: %Schema{type: :string, enum: ThreadModules.priorities()}
      },
      required: [:module],
      example: %{"module" => "nutrition", "title" => "Weekly check-in"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientThreadCreateRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.ThreadModules

  OpenApiSpex.schema(
    %{
      title: "ClientThreadCreateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        module: %Schema{type: :string, enum: ThreadModules.modules()},
        title: %Schema{type: :string},
        subject_type: %Schema{type: :string},
        subject_ref: %Schema{type: :object, additionalProperties: true}
      },
      required: [:module],
      example: %{"module" => "general", "title" => "Question about my plan"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ThreadUpdateRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.ThreadModules

  OpenApiSpex.schema(
    %{
      title: "ThreadUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        status: %Schema{type: :string, enum: ThreadModules.statuses()},
        priority: %Schema{type: :string, enum: ThreadModules.priorities()},
        title: %Schema{type: :string}
      },
      example: %{"status" => "resolved"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ThreadMessageRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ThreadMessageRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        body: %Schema{type: :string},
        kind: %Schema{type: :string}
      },
      required: [:body],
      example: %{"body" => "Sounds good, thanks!"}
    },
    struct?: false
  )
end
