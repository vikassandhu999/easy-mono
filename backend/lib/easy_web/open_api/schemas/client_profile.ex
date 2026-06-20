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

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormTemplateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @purposes ["intake", "weekly_check_in", "nutrition_update", "training_update", "custom"]
  @statuses ["active", "archived"]
  @section %Schema{type: :object, additionalProperties: true}

  OpenApiSpex.schema(%{
    title: "ClientProfileFormTemplateRequest",
    type: :object,
    additionalProperties: false,
    properties: %{
      name: %Schema{type: :string},
      purpose: %Schema{type: :string, enum: @purposes},
      sections: %Schema{type: :array, items: @section},
      status: %Schema{type: :string, enum: @statuses}
    },
    required: [:name, :purpose, :sections],
    example: %{
      "name" => "Initial intake",
      "purpose" => "intake",
      "sections" => [
        %{
          "title" => "Nutrition",
          "questions" => [
            %{"id" => "meal_prep_ability", "label" => "Meal prep ability", "type" => "select"}
          ]
        }
      ]
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormTemplateUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @purposes ["intake", "weekly_check_in", "nutrition_update", "training_update", "custom"]
  @statuses ["active", "archived"]
  @section %Schema{type: :object, additionalProperties: true}

  OpenApiSpex.schema(%{
    title: "ClientProfileFormTemplateUpdateRequest",
    type: :object,
    additionalProperties: false,
    properties: %{
      name: %Schema{type: :string},
      purpose: %Schema{type: :string, enum: @purposes},
      sections: %Schema{type: :array, items: @section},
      status: %Schema{type: :string, enum: @statuses}
    },
    example: %{
      "name" => "Updated intake",
      "status" => "archived"
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormTemplate do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  @purposes ["intake", "weekly_check_in", "nutrition_update", "training_update", "custom"]
  @statuses ["active", "archived"]
  @section %Schema{type: :object, additionalProperties: true}

  OpenApiSpex.schema(%{
    title: "ClientProfileFormTemplate",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          purpose: %Schema{type: :string, enum: @purposes},
          sections: %Schema{type: :array, items: @section},
          status: %Schema{type: :string, enum: @statuses}
        },
        Shared.timestamps()
      ),
    required: [:id, :name, :purpose, :sections, :status, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormTemplateResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormTemplate, Shared}

  OpenApiSpex.schema(Shared.data_response(ClientProfileFormTemplate, "ClientProfileFormTemplateResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormTemplateListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormTemplate, Shared}

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: ClientProfileFormTemplate}, "ClientProfileFormTemplateListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormAssignmentAssignRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @priorities ["high", "normal"]

  OpenApiSpex.schema(%{
    title: "ClientProfileFormAssignmentAssignRequest",
    type: :object,
    additionalProperties: false,
    properties: %{
      client_id: %Schema{type: :string, format: :uuid},
      priority: %Schema{type: :string, enum: @priorities},
      due_date: %Schema{type: :string, format: :date, nullable: true}
    },
    required: [:client_id],
    example: %{
      "client_id" => "00000000-0000-0000-0000-000000000000",
      "priority" => "high"
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormAssignmentUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @statuses ["assigned", "in_progress", "completed", "dismissed"]
  @priorities ["high", "normal"]

  OpenApiSpex.schema(%{
    title: "ClientProfileFormAssignmentUpdateRequest",
    type: :object,
    additionalProperties: false,
    properties: %{
      priority: %Schema{type: :string, enum: @priorities},
      status: %Schema{type: :string, enum: @statuses},
      due_date: %Schema{type: :string, format: :date, nullable: true}
    },
    example: %{
      "priority" => "normal",
      "status" => "in_progress"
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormAssignment do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormTemplate, Shared}

  @purposes ["intake", "weekly_check_in", "nutrition_update", "training_update", "custom"]
  @statuses ["assigned", "in_progress", "completed", "dismissed"]
  @priorities ["high", "normal"]

  OpenApiSpex.schema(%{
    title: "ClientProfileFormAssignment",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          client_id: %Schema{type: :string, format: :uuid},
          form_template_id: %Schema{type: :string, format: :uuid},
          purpose: %Schema{type: :string, enum: @purposes},
          priority: %Schema{type: :string, enum: @priorities},
          status: %Schema{type: :string, enum: @statuses},
          due_date: %Schema{type: :string, format: :date, nullable: true},
          completed_at: %Schema{type: :string, format: :"date-time", nullable: true},
          form_template: ClientProfileFormTemplate
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :client_id,
      :form_template_id,
      :purpose,
      :priority,
      :status,
      :due_date,
      :completed_at,
      :form_template,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormAssignmentResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormAssignment, Shared}

  OpenApiSpex.schema(Shared.data_response(ClientProfileFormAssignment, "ClientProfileFormAssignmentResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormAssignmentListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormAssignment, Shared}

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: ClientProfileFormAssignment}, "ClientProfileFormAssignmentListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormSubmissionRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientProfileFormSubmissionRequest",
    type: :object,
    additionalProperties: false,
    properties: %{
      answers: %Schema{type: :object, additionalProperties: true}
    },
    required: [:answers],
    example: %{
      "answers" => %{"meal_prep_ability" => "high"}
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormSubmission do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientProfileFormSubmission",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      form_assignment_id: %Schema{type: :string, format: :uuid},
      question_snapshot: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}},
      answers: %Schema{type: :object, additionalProperties: true},
      submitted_by_type: %Schema{type: :string, enum: ["coach", "client", "system"]},
      submitted_at: %Schema{type: :string, format: :"date-time"},
      inserted_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [
      :id,
      :form_assignment_id,
      :question_snapshot,
      :answers,
      :submitted_by_type,
      :submitted_at,
      :inserted_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormSubmissionResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormSubmission, Shared}

  OpenApiSpex.schema(Shared.data_response(ClientProfileFormSubmission, "ClientProfileFormSubmissionResponse"))
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
