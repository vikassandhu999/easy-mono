defmodule EasyWeb.OpenApi.Schemas.HealthResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "HealthResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      status: %Schema{type: :string, example: "ok"},
      service: %Schema{type: :string, example: "easy-backend"},
      timestamp: %Schema{type: :string, format: :"date-time"},
      version: %Schema{type: :string, example: "1.0.0"}
    },
    required: [:status, :service, :timestamp, :version]
  })
end

defmodule EasyWeb.OpenApi.Schemas.BusinessRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "BusinessRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        handle: %Schema{type: :string, maxLength: 255},
        about: %Schema{type: :string, nullable: true},
        default_weight_unit: %Schema{type: :string, enum: ["kg", "lbs"]}
      },
      required: [:name, :handle],
      example: %{
        "name" => "Strong Coaching",
        "handle" => "strong-coaching",
        "about" => "Personal training and nutrition coaching."
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.BusinessUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "BusinessUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        handle: %Schema{type: :string, maxLength: 255},
        about: %Schema{type: :string, nullable: true},
        default_weight_unit: %Schema{type: :string, enum: ["kg", "lbs"]}
      },
      example: %{
        "name" => "Strong Coaching",
        "about" => "Updated business profile."
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.DashboardSetupUpdateRequest do
  require OpenApiSpex

  alias Easy.Orgs.Business, as: BusinessSchema
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "DashboardSetupUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        dashboard_setup_hidden_reason: %Schema{
          type: :string,
          enum: Enum.map(BusinessSchema.dashboard_setup_hidden_reasons(), &Atom.to_string/1),
          nullable: true
        }
      },
      required: [:dashboard_setup_hidden_reason],
      example: %{"dashboard_setup_hidden_reason" => "dismissed"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.Business do
  require OpenApiSpex

  alias Easy.Orgs.Business, as: BusinessSchema
  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "Business",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          handle: %Schema{type: :string},
          about: %Schema{type: :string, nullable: true},
          default_weight_unit: %Schema{type: :string, enum: ["kg", "lbs"]},
          dashboard_setup_hidden_at: %Schema{
            type: :string,
            format: :"date-time",
            nullable: true
          },
          dashboard_setup_hidden_reason: %Schema{
            type: :string,
            enum: Enum.map(BusinessSchema.dashboard_setup_hidden_reasons(), &Atom.to_string/1),
            nullable: true
          }
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :name,
      :handle,
      :about,
      :default_weight_unit,
      :dashboard_setup_hidden_at,
      :dashboard_setup_hidden_reason,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.BusinessResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Business, Shared}

  OpenApiSpex.schema(Shared.data_response(Business, "BusinessResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.CoachProfileUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "CoachProfileUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        first_name: %Schema{type: :string, nullable: true},
        last_name: %Schema{type: :string, nullable: true},
        phone: %Schema{type: :string, nullable: true},
        business_name: %Schema{type: :string, nullable: true},
        whatsapp_number: %Schema{type: :string, nullable: true}
      },
      example: %{
        "first_name" => "Alex",
        "last_name" => "Coach",
        "phone" => "+15551234567",
        "whatsapp_number" => "+15551234567"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.CoachProfileBusiness do
  require OpenApiSpex

  alias Easy.Orgs.Business, as: BusinessSchema
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "CoachProfileBusiness",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      slug: %Schema{type: :string},
      whatsapp_number: %Schema{type: :string, nullable: true},
      dashboard_setup_hidden_at: %Schema{
        type: :string,
        format: :"date-time",
        nullable: true
      },
      dashboard_setup_hidden_reason: %Schema{
        type: :string,
        enum: Enum.map(BusinessSchema.dashboard_setup_hidden_reasons(), &Atom.to_string/1),
        nullable: true
      }
    },
    required: [
      :id,
      :name,
      :slug,
      :whatsapp_number,
      :dashboard_setup_hidden_at,
      :dashboard_setup_hidden_reason
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.CoachProfile do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.CoachProfileBusiness
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "CoachProfile",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      first_name: %Schema{type: :string, nullable: true},
      last_name: %Schema{type: :string, nullable: true},
      email: %Schema{type: :string, format: :email},
      phone: %Schema{type: :string, nullable: true},
      is_owner: %Schema{type: :boolean},
      business: CoachProfileBusiness
    },
    required: [:id, :first_name, :last_name, :email, :phone, :is_owner, :business]
  })
end

defmodule EasyWeb.OpenApi.Schemas.CoachProfileResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{CoachProfile, Shared}

  OpenApiSpex.schema(Shared.data_response(CoachProfile, "CoachProfileResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ClientProfileUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        first_name: %Schema{type: :string, nullable: true},
        last_name: %Schema{type: :string, nullable: true},
        phone: %Schema{type: :string, nullable: true},
        goal_weight_value: %Schema{type: :number, nullable: true},
        goal_weight_unit: %Schema{type: :string, nullable: true}
      },
      example: %{
        "first_name" => "Jamie",
        "goal_weight_value" => 180,
        "goal_weight_unit" => "lb"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileCoach do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientProfileCoach",
    type: :object,
    additionalProperties: false,
    properties: %{
      first_name: %Schema{type: :string, nullable: true},
      last_name: %Schema{type: :string, nullable: true},
      phone: %Schema{type: :string, nullable: true},
      business_name: %Schema{type: :string}
    },
    required: [:first_name, :last_name, :phone, :business_name]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfile do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.ClientProfileCoach
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientProfile",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      first_name: %Schema{type: :string, nullable: true},
      last_name: %Schema{type: :string, nullable: true},
      email: %Schema{type: :string, format: :email, nullable: true},
      phone: %Schema{type: :string, nullable: true},
      goal_weight_value: %Schema{type: :number, nullable: true},
      goal_weight_unit: %Schema{type: :string, nullable: true},
      default_weight_unit: %Schema{type: :string, enum: ["kg", "lbs"]},
      subscription_started_on: %Schema{type: :string, format: :date, nullable: true},
      subscription_ends_on: %Schema{type: :string, format: :date, nullable: true},
      status: %Schema{type: :string},
      coach: %Schema{oneOf: [ClientProfileCoach], nullable: true}
    },
    required: [
      :id,
      :first_name,
      :last_name,
      :email,
      :phone,
      :goal_weight_value,
      :goal_weight_unit,
      :default_weight_unit,
      :subscription_started_on,
      :subscription_ends_on,
      :status,
      :coach
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientProfile, Shared}

  OpenApiSpex.schema(Shared.data_response(ClientProfile, "ClientProfileResponse"))
end
