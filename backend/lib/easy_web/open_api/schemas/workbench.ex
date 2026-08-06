defmodule EasyWeb.OpenApi.Schemas.WorkbenchCounts do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkbenchCounts",
    type: :object,
    additionalProperties: false,
    properties: %{
      check_ins: %Schema{type: :integer, minimum: 0, description: "Check-in submissions not yet reviewed"},
      replies: %Schema{
        type: :integer,
        minimum: 0,
        description: "Conversations where the client sent the last message and the coach hasn't replied"
      },
      programming: %Schema{
        type: :integer,
        minimum: 0,
        description: "Active clients with no plan in force, or whose last scheduled plan day is within 3 days"
      },
      expiring: %Schema{
        type: :integer,
        minimum: 0,
        description: "Active clients whose subscription ends within 7 days"
      },
      new_clients: %Schema{
        type: :integer,
        minimum: 0,
        description: "Clients added within 14 days, invites pending over 3 days, or intake incomplete"
      },
      quiet: %Schema{
        type: :integer,
        minimum: 0,
        description: "Active clients who missed their last two scheduled training sessions, or whose latest check-in lapsed to missed. Schedule-aware — rest days never count."
      }
    },
    required: [:check_ins, :replies, :programming, :expiring, :new_clients, :quiet]
  })
end

defmodule EasyWeb.OpenApi.Schemas.QueueSnoozeRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "QueueSnoozeRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        queue: %Schema{type: :string, enum: ["quiet", "expiring"]},
        snoozed_until: %Schema{type: :string, format: :date}
      },
      required: [:queue, :snoozed_until],
      example: %{"queue" => "quiet", "snoozed_until" => "2026-08-20"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchCountsResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.WorkbenchCounts

  OpenApiSpex.schema(%{
    title: "WorkbenchCountsResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: WorkbenchCounts},
    required: [:data]
  })
end
