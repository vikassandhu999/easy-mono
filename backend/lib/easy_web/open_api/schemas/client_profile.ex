defmodule EasyWeb.OpenApi.Schemas.ClientProfile.Common do
  alias OpenApiSpex.Schema

  def sections, do: ~w(general nutrition training lifestyle)
  def field_types, do: ~w(text number boolean date select multi_select)
  def form_purposes, do: ~w(intake weekly_check_in nutrition_update training_update custom)
  def template_statuses, do: ~w(active archived)
  def assignment_statuses, do: ~w(assigned in_progress completed dismissed)
  def priorities, do: ~w(high normal)
  def submitted_by_types, do: ~w(coach client system)
  def section_schema, do: %Schema{type: :object, additionalProperties: true}

  def section_properties,
    do: %{general: section_schema(), nutrition: section_schema(), training: section_schema(), lifestyle: section_schema()}
end

defmodule EasyWeb.OpenApi.Schemas.CoachingClientProfileRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(
    %{
      title: "CoachingClientProfileRequest",
      type: :object,
      additionalProperties: false,
      properties:
        Map.merge(Common.section_properties(), %{
          intake_status: %Schema{
            type: :string,
            enum: Common.assignment_statuses()
          },
          intake_completed_at: %Schema{type: :string, format: :"date-time", nullable: true}
        }),
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

defmodule EasyWeb.OpenApi.Schemas.ClientCoachingProfileUpdateRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  # Client self-service update: structured sections only. Intentionally excludes the
  # coach-owned intake_status / intake_completed_at fields (additionalProperties: false
  # rejects them at the edge; the context changeset also refuses to cast them).
  OpenApiSpex.schema(
    %{
      title: "ClientCoachingProfileUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: Common.section_properties(),
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
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(
    %{
      title: "ClientProfileFieldRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        section: %Schema{type: :string, enum: Common.sections()},
        label: %Schema{type: :string},
        key: %Schema{type: :string},
        field_type: %Schema{type: :string, enum: Common.field_types()},
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
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFieldUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(
    %{
      title: "ClientProfileFieldUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        section: %Schema{type: :string, enum: Common.sections()},
        label: %Schema{type: :string},
        key: %Schema{type: :string},
        field_type: %Schema{type: :string, enum: Common.field_types()},
        options: %Schema{type: :array, items: %Schema{type: :string}},
        filterable: %Schema{type: :boolean}
      },
      example: %{
        "label" => "Meal prep confidence",
        "options" => ["low", "medium", "high", "expert"]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileField do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(%{
    title: "ClientProfileField",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          section: %Schema{type: :string, enum: Common.sections()},
          label: %Schema{type: :string},
          key: %Schema{type: :string},
          field_type: %Schema{
            type: :string,
            enum: Common.field_types()
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
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(
    %{
      title: "ClientProfileFormTemplateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string},
        purpose: %Schema{type: :string, enum: Common.form_purposes()},
        sections: %Schema{type: :array, items: Common.section_schema()},
        status: %Schema{type: :string, enum: Common.template_statuses()}
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
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormTemplateUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(
    %{
      title: "ClientProfileFormTemplateUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string},
        purpose: %Schema{type: :string, enum: Common.form_purposes()},
        sections: %Schema{type: :array, items: Common.section_schema()},
        status: %Schema{type: :string, enum: Common.template_statuses()}
      },
      example: %{
        "name" => "Updated intake",
        "status" => "archived"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormTemplate do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(%{
    title: "ClientProfileFormTemplate",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          purpose: %Schema{type: :string, enum: Common.form_purposes()},
          sections: %Schema{type: :array, items: Common.section_schema()},
          status: %Schema{type: :string, enum: Common.template_statuses()}
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
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(
    %{
      title: "ClientProfileFormAssignmentAssignRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        client_id: %Schema{type: :string, format: :uuid},
        priority: %Schema{type: :string, enum: Common.priorities()},
        due_date: %Schema{type: :string, format: :date, nullable: true}
      },
      required: [:client_id],
      example: %{
        "client_id" => "00000000-0000-0000-0000-000000000000",
        "priority" => "high"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormAssignmentUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(
    %{
      title: "ClientProfileFormAssignmentUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        priority: %Schema{type: :string, enum: Common.priorities()},
        status: %Schema{type: :string, enum: Common.assignment_statuses()},
        due_date: %Schema{type: :string, format: :date, nullable: true}
      },
      example: %{
        "priority" => "normal",
        "status" => "in_progress"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormAssignment do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormTemplate, Shared}
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

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
          purpose: %Schema{type: :string, enum: Common.form_purposes()},
          priority: %Schema{type: :string, enum: Common.priorities()},
          status: %Schema{type: :string, enum: Common.assignment_statuses()},
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

  OpenApiSpex.schema(
    %{
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
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormSubmission do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(%{
    title: "ClientProfileFormSubmission",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      form_assignment_id: %Schema{type: :string, format: :uuid},
      question_snapshot: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}},
      answers: %Schema{type: :object, additionalProperties: true},
      submitted_by_type: %Schema{type: :string, enum: Common.submitted_by_types()},
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
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(%{
    title: "CoachingClientProfile",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        Map.merge(
          %{
            id: %Schema{type: :string, format: :uuid},
            business_id: %Schema{type: :string, format: :uuid},
            client_id: %Schema{type: :string, format: :uuid}
          },
          Map.merge(Common.section_properties(), %{
            intake_status: %Schema{type: :string, enum: Common.assignment_statuses()},
            intake_completed_at: %Schema{type: :string, format: :"date-time", nullable: true}
          })
        ),
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
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common

  OpenApiSpex.schema(%{
    title: "ClientCoachingProfile",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        Map.merge(
          %{
            id: %Schema{type: :string, format: :uuid},
            client_id: %Schema{type: :string, format: :uuid}
          },
          Map.merge(Common.section_properties(), %{
            intake_status: %Schema{type: :string, enum: Common.assignment_statuses()},
            intake_completed_at: %Schema{type: :string, format: :"date-time", nullable: true}
          })
        ),
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
