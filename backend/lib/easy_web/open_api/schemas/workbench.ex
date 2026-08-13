defmodule EasyWeb.OpenApi.Schemas.WorkbenchProgrammingCounts do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkbenchProgrammingCounts",
    type: :object,
    additionalProperties: false,
    properties: %{
      all: %Schema{type: :integer, minimum: 0},
      training: %Schema{type: :integer, minimum: 0},
      nutrition: %Schema{type: :integer, minimum: 0}
    },
    required: [:all, :training, :nutrition]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchCounts do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.WorkbenchProgrammingCounts
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
        description: "Conversations with an open waiting sequence for the coach"
      },
      onboarding: %Schema{type: :integer, minimum: 0, description: "Clients with actionable onboarding work"},
      programming: WorkbenchProgrammingCounts,
      expiring: %Schema{
        type: :integer,
        minimum: 0,
        description: "Active clients whose engagement ends within 14 days"
      },
      quiet: %Schema{
        type: :integer,
        minimum: 0,
        description: "Active clients whose latest already-due check-in is missed"
      }
    },
    required: [:check_ins, :replies, :onboarding, :programming, :expiring, :quiet]
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

defmodule EasyWeb.OpenApi.Schemas.InvitationFollowUpDueReason do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "InvitationFollowUpDueReason",
    type: :object,
    additionalProperties: false,
    properties: %{
      code: %Schema{type: :string, enum: ["invitation_follow_up_due"]},
      invitation_id: %Schema{type: :string, format: :uuid},
      sent_at: %Schema{type: :string, format: :"date-time"},
      follow_up_due_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:code, :invitation_id, :sent_at, :follow_up_due_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.IntakeOverdueReason do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "IntakeOverdueReason",
    type: :object,
    additionalProperties: false,
    properties: %{
      code: %Schema{type: :string, enum: ["intake_overdue"]},
      assignment_id: %Schema{type: :string, format: :uuid},
      due_on: %Schema{type: :string, format: :date}
    },
    required: [:code, :assignment_id, :due_on]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchOnboardingReason do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{IntakeOverdueReason, InvitationFollowUpDueReason}
  alias OpenApiSpex.{Discriminator, Schema}

  OpenApiSpex.schema(%{
    title: "WorkbenchOnboardingReason",
    oneOf: [InvitationFollowUpDueReason, IntakeOverdueReason],
    discriminator: %Discriminator{
      propertyName: "code",
      mapping: %{
        "invitation_follow_up_due" => "#/components/schemas/InvitationFollowUpDueReason",
        "intake_overdue" => "#/components/schemas/IntakeOverdueReason"
      }
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchOnboardingQueueItem do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Client, WorkbenchOnboardingReason}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkbenchOnboardingQueueItem",
    type: :object,
    additionalProperties: false,
    properties: %{
      client: Client,
      reasons: %Schema{type: :array, items: WorkbenchOnboardingReason, minItems: 1}
    },
    required: [:client, :reasons]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchOnboardingQueueResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, WorkbenchOnboardingQueueItem}

  OpenApiSpex.schema(Shared.list_response(WorkbenchOnboardingQueueItem, "WorkbenchOnboardingQueueResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ServiceNeverProgrammedReason do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.RequiredServices
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ServiceNeverProgrammedReason",
    type: :object,
    additionalProperties: false,
    properties: %{
      code: %Schema{type: :string, enum: ["service_never_programmed"]},
      service: %Schema{type: :string, enum: RequiredServices.values()}
    },
    required: [:code, :service]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ServiceCoverageMissingReason do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.RequiredServices
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ServiceCoverageMissingReason",
    type: :object,
    additionalProperties: false,
    properties: %{
      code: %Schema{type: :string, enum: ["service_coverage_missing"]},
      service: %Schema{type: :string, enum: RequiredServices.values()},
      first_uncovered_on: %Schema{type: :string, format: :date}
    },
    required: [:code, :service, :first_uncovered_on]
  })
end

defmodule EasyWeb.OpenApi.Schemas.ServiceCoverageEndingSoonReason do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.RequiredServices
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ServiceCoverageEndingSoonReason",
    type: :object,
    additionalProperties: false,
    properties: %{
      code: %Schema{type: :string, enum: ["service_coverage_ending_soon"]},
      service: %Schema{type: :string, enum: RequiredServices.values()},
      coverage_ends_on: %Schema{type: :string, format: :date},
      first_uncovered_on: %Schema{type: :string, format: :date}
    },
    required: [:code, :service, :coverage_ends_on, :first_uncovered_on]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchProgrammingReason do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{
    ServiceCoverageEndingSoonReason,
    ServiceCoverageMissingReason,
    ServiceNeverProgrammedReason
  }

  alias OpenApiSpex.{Discriminator, Schema}

  OpenApiSpex.schema(%{
    title: "WorkbenchProgrammingReason",
    oneOf: [ServiceNeverProgrammedReason, ServiceCoverageMissingReason, ServiceCoverageEndingSoonReason],
    discriminator: %Discriminator{
      propertyName: "code",
      mapping: %{
        "service_never_programmed" => "#/components/schemas/ServiceNeverProgrammedReason",
        "service_coverage_missing" => "#/components/schemas/ServiceCoverageMissingReason",
        "service_coverage_ending_soon" => "#/components/schemas/ServiceCoverageEndingSoonReason"
      }
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchProgrammingQueueItem do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Client, WorkbenchProgrammingReason}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkbenchProgrammingQueueItem",
    type: :object,
    additionalProperties: false,
    properties: %{
      client: Client,
      reasons: %Schema{type: :array, items: WorkbenchProgrammingReason, minItems: 1}
    },
    required: [:client, :reasons]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchProgrammingQueueResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Shared, WorkbenchProgrammingQueueItem}

  OpenApiSpex.schema(Shared.list_response(WorkbenchProgrammingQueueItem, "WorkbenchProgrammingQueueResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.EngagementEndingSoonReason do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "EngagementEndingSoonReason",
    type: :object,
    additionalProperties: false,
    properties: %{
      code: %Schema{type: :string, enum: ["engagement_ending_soon"]},
      ends_on: %Schema{type: :string, format: :date}
    },
    required: [:code, :ends_on]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchExpiringQueueItem do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Client, EngagementEndingSoonReason}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkbenchExpiringQueueItem",
    type: :object,
    additionalProperties: false,
    properties: %{
      client: Client,
      reasons: %Schema{type: :array, items: EngagementEndingSoonReason, minItems: 1}
    },
    required: [:client, :reasons]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchExpiringQueueResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Shared, WorkbenchExpiringQueueItem}

  OpenApiSpex.schema(Shared.list_response(WorkbenchExpiringQueueItem, "WorkbenchExpiringQueueResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.MissedCheckInReason do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "MissedCheckInReason",
    type: :object,
    additionalProperties: false,
    properties: %{
      code: %Schema{type: :string, enum: ["missed_check_in"]},
      assignment_id: %Schema{type: :string, format: :uuid},
      due_on: %Schema{type: :string, format: :date}
    },
    required: [:code, :assignment_id, :due_on]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchQuietQueueItem do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Client, MissedCheckInReason}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkbenchQuietQueueItem",
    type: :object,
    additionalProperties: false,
    properties: %{
      client: Client,
      reasons: %Schema{type: :array, items: MissedCheckInReason, minItems: 1}
    },
    required: [:client, :reasons]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchQuietQueueResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Shared, WorkbenchQuietQueueItem}

  OpenApiSpex.schema(Shared.list_response(WorkbenchQuietQueueItem, "WorkbenchQuietQueueResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.CheckInAwaitingReviewReason do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "CheckInAwaitingReviewReason",
    type: :object,
    additionalProperties: false,
    properties: %{
      code: %Schema{type: :string, enum: ["check_in_awaiting_review"]},
      submission_id: %Schema{type: :string, format: :uuid},
      submitted_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:code, :submission_id, :submitted_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchCheckInSubmission do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkbenchCheckInSubmission",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      form_assignment_id: %Schema{type: :string, format: :uuid},
      submitted_at: %Schema{type: :string, format: :"date-time"},
      reviewed_at: %Schema{type: :string, format: :"date-time", nullable: true}
    },
    required: [:id, :form_assignment_id, :submitted_at, :reviewed_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchCheckInAssignment do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkbenchCheckInAssignment",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      client_id: %Schema{type: :string, format: :uuid},
      form_template_id: %Schema{type: :string, format: :uuid},
      purpose: %Schema{type: :string, enum: ["check_in"]},
      status: %Schema{type: :string, enum: ["assigned", "in_progress", "completed", "dismissed", "missed"]},
      due_date: %Schema{type: :string, format: :date, nullable: true}
    },
    required: [:id, :client_id, :form_template_id, :purpose, :status, :due_date]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchCheckInQueueItem do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{
    CheckInAwaitingReviewReason,
    Client,
    WorkbenchCheckInAssignment,
    WorkbenchCheckInSubmission
  }

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkbenchCheckInQueueItem",
    type: :object,
    additionalProperties: false,
    properties: %{
      submission: WorkbenchCheckInSubmission,
      client: Client,
      assignment: WorkbenchCheckInAssignment,
      reasons: %Schema{type: :array, items: CheckInAwaitingReviewReason, minItems: 1}
    },
    required: [:submission, :client, :assignment, :reasons]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchCheckInQueueResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Shared, WorkbenchCheckInQueueItem}

  OpenApiSpex.schema(Shared.list_response(WorkbenchCheckInQueueItem, "WorkbenchCheckInQueueResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ReplyNeededReason do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ReplyNeededReason",
    type: :object,
    additionalProperties: false,
    properties: %{
      code: %Schema{type: :string, enum: ["reply_needed"]},
      waiting_since: %Schema{type: :string, format: :"date-time"}
    },
    required: [:code, :waiting_since]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchRepliesQueueItem do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Conversation, ReplyNeededReason}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkbenchRepliesQueueItem",
    type: :object,
    additionalProperties: false,
    properties: %{
      conversation: Conversation,
      reasons: %Schema{type: :array, items: ReplyNeededReason, minItems: 1}
    },
    required: [:conversation, :reasons]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkbenchRepliesQueueResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Shared, WorkbenchRepliesQueueItem}

  OpenApiSpex.schema(Shared.list_response(WorkbenchRepliesQueueItem, "WorkbenchRepliesQueueResponse"))
end
