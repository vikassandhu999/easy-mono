defmodule EasyWeb.OpenApi.Schemas.ClientInviteRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ClientInviteRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{type: :string, format: :email, nullable: true},
        first_name: %Schema{type: :string, nullable: true},
        last_name: %Schema{type: :string, nullable: true},
        phone: %Schema{type: :string, nullable: true},
        notes: %Schema{type: :string, nullable: true}
      },
      example: %{
        "email" => "client@example.com",
        "first_name" => "Jamie",
        "last_name" => "Client",
        "phone" => "+15551234567",
        "notes" => "Prefers morning sessions."
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ClientUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        email: %Schema{type: :string, format: :email, nullable: true},
        first_name: %Schema{type: :string, nullable: true},
        last_name: %Schema{type: :string, nullable: true},
        phone: %Schema{type: :string, nullable: true},
        notes: %Schema{type: :string, nullable: true},
        goal_weight_value: %Schema{type: :number, nullable: true},
        goal_weight_unit: %Schema{type: :string, enum: ["kg", "lbs"], nullable: true},
        status: %Schema{type: :string, enum: ["active", "inactive", "archived"]}
      },
      example: %{
        "first_name" => "Jamie",
        "goal_weight_value" => 180,
        "goal_weight_unit" => "lbs",
        "status" => "active"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.Client do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(%{
    title: "Client",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          email: %Schema{type: :string, format: :email, nullable: true},
          first_name: %Schema{type: :string, nullable: true},
          last_name: %Schema{type: :string, nullable: true},
          phone: %Schema{type: :string, nullable: true},
          notes: %Schema{type: :string, nullable: true},
          goal_weight_value: %Schema{type: :number, nullable: true},
          goal_weight_unit: %Schema{type: :string, enum: ["kg", "lbs"], nullable: true},
          status: %Schema{
            type: :string,
            enum: ["active", "pending", "inactive", "archived", "awaiting_seat"]
          },
          invite_url: %Schema{type: :string, nullable: true},
          invitation_sent_at: %Schema{type: :string, format: :"date-time", nullable: true},
          invitation_expires_at: %Schema{type: :string, format: :"date-time", nullable: true}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :email,
      :first_name,
      :last_name,
      :phone,
      :notes,
      :goal_weight_value,
      :goal_weight_unit,
      :status,
      :invite_url,
      :invitation_sent_at,
      :invitation_expires_at,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientSummary do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientSummary",
    type: :object,
    additionalProperties: false,
    properties: %{
      active: %Schema{type: :integer, minimum: 0},
      pending: %Schema{type: :integer, minimum: 0},
      inactive: %Schema{type: :integer, minimum: 0},
      archived: %Schema{type: :integer, minimum: 0},
      awaiting_seat: %Schema{type: :integer, minimum: 0}
    },
    required: [:active, :pending, :inactive, :archived, :awaiting_seat]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Client, Shared}

  OpenApiSpex.schema(Shared.data_response(Client, "ClientResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  alias EasyWeb.OpenApi.Schemas.{
    Client,
    ClientSummary
  }

  OpenApiSpex.schema(%{
    title: "ClientListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: Client},
      count: %Schema{type: :integer, minimum: 0},
      summary: ClientSummary
    },
    required: [:data, :count, :summary]
  })
end
