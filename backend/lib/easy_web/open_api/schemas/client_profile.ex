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

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFieldRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @sections ["general", "nutrition", "training", "lifestyle"]
  @field_types ["text", "number", "boolean", "date", "select", "multi_select"]

  OpenApiSpex.schema(%{
    title: "ClientProfileFieldRequest",
    type: :object,
    additionalProperties: false,
    properties: %{
      section: %Schema{type: :string, enum: @sections},
      label: %Schema{type: :string},
      key: %Schema{type: :string},
      field_type: %Schema{type: :string, enum: @field_types},
      options: %Schema{type: :array, items: %Schema{type: :string}},
      filterable: %Schema{type: :boolean}
    },
    required: [:section, :label, :key, :field_type],
    example: %{
      "section" => "nutrition",
      "label" => "Meal prep ability",
      "key" => "meal_prep_ability",
      "field_type" => "select",
      "options" => ["low", "medium", "high"],
      "filterable" => true
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFieldUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @sections ["general", "nutrition", "training", "lifestyle"]
  @field_types ["text", "number", "boolean", "date", "select", "multi_select"]

  OpenApiSpex.schema(%{
    title: "ClientProfileFieldUpdateRequest",
    type: :object,
    additionalProperties: false,
    properties: %{
      section: %Schema{type: :string, enum: @sections},
      label: %Schema{type: :string},
      key: %Schema{type: :string},
      field_type: %Schema{type: :string, enum: @field_types},
      options: %Schema{type: :array, items: %Schema{type: :string}},
      filterable: %Schema{type: :boolean}
    },
    example: %{
      "label" => "Meal prep confidence",
      "options" => ["low", "medium", "high", "expert"]
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileField do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(%{
    title: "ClientProfileField",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          section: %Schema{type: :string, enum: ["general", "nutrition", "training", "lifestyle"]},
          label: %Schema{type: :string},
          key: %Schema{type: :string},
          field_type: %Schema{
            type: :string,
            enum: ["text", "number", "boolean", "date", "select", "multi_select"]
          },
          options: %Schema{type: :array, items: %Schema{type: :string}},
          filterable: %Schema{type: :boolean},
          archived_at: %Schema{type: :string, format: :"date-time", nullable: true}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :section,
      :label,
      :key,
      :field_type,
      :options,
      :filterable,
      :archived_at,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFieldResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientProfileField, Shared}

  OpenApiSpex.schema(Shared.data_response(ClientProfileField, "ClientProfileFieldResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFieldListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{ClientProfileField, Shared}

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: ClientProfileField}, "ClientProfileFieldListResponse"))
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
