defmodule EasyWeb.OpenApi.Schemas.CoachingClientProfileRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @section %Schema{type: :object, additionalProperties: true}

  OpenApiSpex.schema(
    %{
      title: "CoachingClientProfileRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        general: @section,
        nutrition: @section,
        training: @section,
        lifestyle: @section,
        intake_status: %Schema{
          type: :string,
          enum: ["assigned", "in_progress", "completed", "dismissed"]
        },
        intake_completed_at: %Schema{type: :string, format: :"date-time", nullable: true}
      },
      example: %{
        "general" => %{"goal" => "strength"},
        "nutrition" => %{"protein_goal" => "120g"},
        "training" => %{"experience" => "intermediate"},
        "lifestyle" => %{"sleep_hours" => 7}
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.CoachingClientProfile do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  @section %Schema{type: :object, additionalProperties: true}

  OpenApiSpex.schema(%{
    title: "CoachingClientProfile",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          business_id: %Schema{type: :string, format: :uuid},
          client_id: %Schema{type: :string, format: :uuid},
          general: @section,
          nutrition: @section,
          training: @section,
          lifestyle: @section,
          intake_status: %Schema{
            type: :string,
            enum: ["assigned", "in_progress", "completed", "dismissed"]
          },
          intake_completed_at: %Schema{type: :string, format: :"date-time", nullable: true}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :business_id,
      :client_id,
      :general,
      :nutrition,
      :training,
      :lifestyle,
      :intake_status,
      :intake_completed_at,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientCoachingProfile do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  @section %Schema{type: :object, additionalProperties: true}

  OpenApiSpex.schema(%{
    title: "ClientCoachingProfile",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          client_id: %Schema{type: :string, format: :uuid},
          general: @section,
          nutrition: @section,
          training: @section,
          lifestyle: @section,
          intake_status: %Schema{
            type: :string,
            enum: ["assigned", "in_progress", "completed", "dismissed"]
          },
          intake_completed_at: %Schema{type: :string, format: :"date-time", nullable: true}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :client_id,
      :general,
      :nutrition,
      :training,
      :lifestyle,
      :intake_status,
      :intake_completed_at,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.CoachingClientProfileResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{CoachingClientProfile, Shared}

  OpenApiSpex.schema(Shared.data_response(CoachingClientProfile, "CoachingClientProfileResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientCoachingProfileResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientCoachingProfile, Shared}

  OpenApiSpex.schema(Shared.data_response(ClientCoachingProfile, "ClientCoachingProfileResponse"))
end
