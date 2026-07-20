defmodule EasyWeb.OpenApi.Schemas.ClientProfile.Common do
  alias OpenApiSpex.Schema

  def field_types, do: ~w(text number boolean date select multi_select)
  def question_types, do: field_types() ++ ~w(rating weight photo)
  def form_purposes, do: ~w(intake check_in)
  def template_statuses, do: ~w(active archived)
  def assignment_statuses, do: ~w(assigned in_progress completed dismissed missed)
  def priorities, do: ~w(high normal)
  def submitted_by_types, do: ~w(coach client system)

  def question_schema do
    %Schema{
      type: :object,
      additionalProperties: true,
      properties: %{
        id: %Schema{type: :string},
        label: %Schema{type: :string},
        type: %Schema{type: :string, enum: question_types()},
        required: %Schema{type: :boolean},
        options: %Schema{type: :array, items: %Schema{type: :string}}
      },
      required: [:id, :label, :type]
    }
  end

  def form_section_schema do
    %Schema{
      type: :object,
      additionalProperties: true,
      properties: %{
        title: %Schema{type: :string},
        questions: %Schema{type: :array, items: question_schema()}
      },
      required: [:questions]
    }
  end
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormTemplateRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ClientProfileFormTemplateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string},
        purpose: %Schema{type: :string, enum: Common.form_purposes()},
        sections: %Schema{type: :array, items: Common.form_section_schema()},
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

  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ClientProfileFormTemplateUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string},
        purpose: %Schema{type: :string, enum: Common.form_purposes()},
        sections: %Schema{type: :array, items: Common.form_section_schema()},
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

  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common
  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

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
          sections: %Schema{type: :array, items: Common.form_section_schema()},
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

  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormTemplate, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: ClientProfileFormTemplate}, "ClientProfileFormTemplateListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileCheckInScheduleRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ClientProfileCheckInScheduleRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        form_template_id: %Schema{type: :string, format: :uuid},
        frequency: %Schema{type: :string, enum: ~w(once weekly biweekly monthly)},
        next_due_on: %Schema{type: :string, format: :date}
      },
      required: [:form_template_id, :frequency, :next_due_on]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileCheckInScheduleUpdateRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ClientProfileCheckInScheduleUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        frequency: %Schema{type: :string, enum: ~w(once weekly biweekly monthly)},
        next_due_on: %Schema{type: :string, format: :date},
        active: %Schema{type: :boolean}
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileCheckInSchedule do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormTemplate, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientProfileCheckInSchedule",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          client_id: %Schema{type: :string, format: :uuid},
          form_template_id: %Schema{type: :string, format: :uuid},
          frequency: %Schema{type: :string, enum: ~w(once weekly biweekly monthly)},
          next_due_on: %Schema{type: :string, format: :date},
          active: %Schema{type: :boolean},
          form_template: ClientProfileFormTemplate
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :client_id,
      :form_template_id,
      :frequency,
      :next_due_on,
      :active,
      :form_template,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileCheckInScheduleResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{ClientProfileCheckInSchedule, Shared}
  OpenApiSpex.schema(Shared.data_response(ClientProfileCheckInSchedule, "ClientProfileCheckInScheduleResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileCheckInScheduleListResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{ClientProfileCheckInSchedule, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    Shared.data_response(
      %Schema{type: :array, items: ClientProfileCheckInSchedule},
      "ClientProfileCheckInScheduleListResponse"
    )
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormAssignmentUpdateRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common
  alias OpenApiSpex.Schema

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

  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common
  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormSubmission, ClientProfileFormTemplate, Shared}
  alias OpenApiSpex.Schema

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
          check_in_schedule_id: %Schema{type: :string, format: :uuid, nullable: true},
          purpose: %Schema{type: :string, enum: Common.form_purposes()},
          priority: %Schema{type: :string, enum: Common.priorities()},
          status: %Schema{type: :string, enum: Common.assignment_statuses()},
          due_date: %Schema{type: :string, format: :date, nullable: true},
          completed_at: %Schema{type: :string, format: :"date-time", nullable: true},
          due_reminder_sent_at: %Schema{type: :string, format: :"date-time", nullable: true},
          overdue_reminder_sent_at: %Schema{type: :string, format: :"date-time", nullable: true},
          latest_submission: %Schema{oneOf: [ClientProfileFormSubmission], nullable: true},
          latest_submission_reviewed_at: %Schema{type: :string, format: :"date-time", nullable: true},
          form_template: ClientProfileFormTemplate
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :client_id,
      :form_template_id,
      :check_in_schedule_id,
      :purpose,
      :priority,
      :status,
      :due_date,
      :completed_at,
      :due_reminder_sent_at,
      :overdue_reminder_sent_at,
      :latest_submission,
      :latest_submission_reviewed_at,
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

  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormAssignment, Shared}
  alias OpenApiSpex.Schema

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

  alias EasyWeb.OpenApi.Schemas.Attachment
  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientProfileFormSubmission",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      form_assignment_id: %Schema{type: :string, format: :uuid},
      question_snapshot: %Schema{type: :array, items: Common.form_section_schema()},
      answers: %Schema{type: :object, additionalProperties: true},
      submitted_by_type: %Schema{type: :string, enum: Common.submitted_by_types()},
      submitted_at: %Schema{type: :string, format: :"date-time"},
      reviewed_at: %Schema{type: :string, format: :"date-time", nullable: true},
      reviewed_by_id: %Schema{type: :string, format: :uuid, nullable: true},
      attachments: %Schema{type: :array, items: Attachment},
      inserted_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [
      :id,
      :form_assignment_id,
      :question_snapshot,
      :answers,
      :submitted_by_type,
      :submitted_at,
      :reviewed_at,
      :reviewed_by_id,
      :attachments,
      :inserted_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileReviewClient do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientProfileReviewClient",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      email: %Schema{type: :string, nullable: true},
      first_name: %Schema{type: :string, nullable: true},
      last_name: %Schema{type: :string, nullable: true}
    },
    required: [:id, :email, :first_name, :last_name]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileReviewQueueItem do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{
    Attachment,
    ClientProfileFormAssignment,
    ClientProfileReviewClient
  }

  alias EasyWeb.OpenApi.Schemas.ClientProfile.Common
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientProfileReviewQueueItem",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      form_assignment_id: %Schema{type: :string, format: :uuid},
      question_snapshot: %Schema{type: :array, items: Common.form_section_schema()},
      answers: %Schema{type: :object, additionalProperties: true},
      submitted_by_type: %Schema{type: :string, enum: Common.submitted_by_types()},
      submitted_at: %Schema{type: :string, format: :"date-time"},
      reviewed_at: %Schema{type: :string, format: :"date-time", nullable: true},
      reviewed_by_id: %Schema{type: :string, format: :uuid, nullable: true},
      attachments: %Schema{type: :array, items: Attachment},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      client: ClientProfileReviewClient,
      form_assignment: ClientProfileFormAssignment
    },
    required: [
      :id,
      :form_assignment_id,
      :question_snapshot,
      :answers,
      :submitted_by_type,
      :submitted_at,
      :reviewed_at,
      :reviewed_by_id,
      :attachments,
      :inserted_at,
      :client,
      :form_assignment
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileReviewQueueListResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{ClientProfileReviewQueueItem, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    Shared.data_response(
      %Schema{type: :array, items: ClientProfileReviewQueueItem},
      "ClientProfileReviewQueueListResponse"
    )
  )
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormSubmissionResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormSubmission, Shared}

  OpenApiSpex.schema(Shared.data_response(ClientProfileFormSubmission, "ClientProfileFormSubmissionResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientProfileFormSubmissionListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientProfileFormSubmission, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    Shared.data_response(
      %Schema{type: :array, items: ClientProfileFormSubmission},
      "ClientProfileFormSubmissionListResponse"
    )
  )
end
