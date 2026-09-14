defmodule EasyWeb.Types.WorkbenchProgrammingCounts do
  use EasyWeb.Type

  @type t :: %{
          required(:all) => non_neg_integer(),
          required(:training) => non_neg_integer(),
          required(:nutrition) => non_neg_integer()
        }
end

defmodule EasyWeb.Types.InvitationFollowUpDueReason do
  use EasyWeb.Type

  @type t :: %{
          required(:code) => :invitation_follow_up_due,
          required(:invitation_id) => String.t(),
          required(:sent_at) => DateTime.t(),
          required(:follow_up_due_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.IntakeOverdueReason do
  use EasyWeb.Type

  @type t :: %{
          required(:code) => :intake_overdue,
          required(:assignment_id) => String.t(),
          required(:due_on) => Date.t(),
          required(:form_title) => String.t()
        }
end

defmodule EasyWeb.Types.ServiceNeverProgrammedReason do
  use EasyWeb.Type

  @type t :: %{
          required(:code) => :service_never_programmed,
          required(:service) => :training | :nutrition
        }
end

defmodule EasyWeb.Types.ServiceCoverageMissingReason do
  use EasyWeb.Type

  @type t :: %{
          required(:code) => :service_coverage_missing,
          required(:service) => :training | :nutrition,
          required(:first_uncovered_on) => Date.t()
        }
end

defmodule EasyWeb.Types.ServiceCoverageEndingSoonReason do
  use EasyWeb.Type

  @type t :: %{
          required(:code) => :service_coverage_ending_soon,
          required(:service) => :training | :nutrition,
          required(:coverage_ends_on) => Date.t(),
          required(:first_uncovered_on) => Date.t()
        }
end

defmodule EasyWeb.Types.EngagementEndingSoonReason do
  use EasyWeb.Type

  @type t :: %{
          required(:code) => :engagement_ending_soon,
          required(:ends_on) => Date.t()
        }
end

defmodule EasyWeb.Types.MissedCheckInReason do
  use EasyWeb.Type

  @type t :: %{
          required(:code) => :missed_check_in,
          required(:assignment_id) => String.t(),
          required(:due_on) => Date.t()
        }
end

defmodule EasyWeb.Types.CheckInAwaitingReviewReason do
  use EasyWeb.Type

  @type t :: %{
          required(:code) => :check_in_awaiting_review,
          required(:submission_id) => String.t(),
          required(:submitted_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.ReplyNeededReason do
  use EasyWeb.Type

  @type t :: %{
          required(:code) => :reply_needed,
          required(:waiting_since) => DateTime.t()
        }
end

defmodule EasyWeb.Types.WorkbenchOnboardingQueueItem do
  use EasyWeb.Type

  @type t :: %{
          required(:client) => EasyWeb.Types.Client.t(),
          required(:reasons) => [
            EasyWeb.Types.InvitationFollowUpDueReason.t()
            | EasyWeb.Types.IntakeOverdueReason.t()
          ]
        }
end

defmodule EasyWeb.Types.WorkbenchProgrammingQueueItem do
  use EasyWeb.Type

  @type t :: %{
          required(:client) => EasyWeb.Types.Client.t(),
          required(:reasons) => [
            EasyWeb.Types.ServiceNeverProgrammedReason.t()
            | EasyWeb.Types.ServiceCoverageMissingReason.t()
            | EasyWeb.Types.ServiceCoverageEndingSoonReason.t()
          ]
        }
end

defmodule EasyWeb.Types.WorkbenchExpiringQueueItem do
  use EasyWeb.Type

  @type t :: %{
          required(:client) => EasyWeb.Types.Client.t(),
          required(:reasons) => [EasyWeb.Types.EngagementEndingSoonReason.t()]
        }
end

defmodule EasyWeb.Types.WorkbenchQuietQueueItem do
  use EasyWeb.Type

  @type t :: %{
          required(:client) => EasyWeb.Types.Client.t(),
          required(:reasons) => [EasyWeb.Types.MissedCheckInReason.t()]
        }
end

defmodule EasyWeb.Types.WorkbenchCheckInSubmission do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:form_assignment_id) => String.t(),
          required(:submitted_at) => DateTime.t(),
          required(:reviewed_at) => DateTime.t() | nil
        }
end

defmodule EasyWeb.Types.WorkbenchCheckInAssignment do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:client_id) => String.t(),
          required(:form_template_id) => String.t(),
          required(:purpose) => :check_in,
          required(:status) => :assigned | :in_progress | :completed | :dismissed | :missed,
          required(:due_date) => Date.t() | nil
        }
end

defmodule EasyWeb.Types.WorkbenchCheckInQueueItem do
  use EasyWeb.Type

  @type t :: %{
          required(:submission) => EasyWeb.Types.WorkbenchCheckInSubmission.t(),
          required(:client) => EasyWeb.Types.Client.t(),
          required(:assignment) => EasyWeb.Types.WorkbenchCheckInAssignment.t(),
          required(:reasons) => [EasyWeb.Types.CheckInAwaitingReviewReason.t()]
        }
end

defmodule EasyWeb.Types.WorkbenchRepliesQueueItem do
  use EasyWeb.Type

  @type t :: %{
          required(:conversation) => EasyWeb.Types.Conversation.t(),
          required(:waiting_message_count) => non_neg_integer(),
          required(:client_status) => :active | :pending | :inactive,
          required(:reasons) => [EasyWeb.Types.ReplyNeededReason.t()]
        }
end

defmodule EasyWeb.Types.Workbench do
  use EasyWeb.Type

  @type t :: %{
          required(:check_ins) => non_neg_integer(),
          required(:replies) => non_neg_integer(),
          required(:onboarding) => non_neg_integer(),
          required(:programming) => EasyWeb.Types.WorkbenchProgrammingCounts.t(),
          required(:expiring) => non_neg_integer(),
          required(:quiet) => non_neg_integer()
        }

  @type list_query :: %{
          optional(:offset) => integer(),
          optional(:cursor) => String.t(),
          optional(:search) => String.t(),
          optional(:limit) => integer()
        }

  @type programming_query :: %{
          optional(:offset) => integer(),
          optional(:cursor) => String.t(),
          optional(:search) => String.t(),
          optional(:limit) => integer(),
          optional(:service) => :all | :training | :nutrition
        }

  @type onboarding_page :: %{
          required(:data) => [EasyWeb.Types.WorkbenchOnboardingQueueItem.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }

  @type programming_page :: %{
          required(:data) => [EasyWeb.Types.WorkbenchProgrammingQueueItem.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }

  @type expiring_page :: %{
          required(:data) => [EasyWeb.Types.WorkbenchExpiringQueueItem.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }

  @type quiet_page :: %{
          required(:data) => [EasyWeb.Types.WorkbenchQuietQueueItem.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }

  @type check_in_page :: %{
          required(:data) => [EasyWeb.Types.WorkbenchCheckInQueueItem.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }

  @type replies_page :: %{
          required(:data) => [EasyWeb.Types.WorkbenchRepliesQueueItem.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }

  @type snooze :: %{
          required(:queue) => :quiet | :expiring,
          required(:snoozed_until) => Date.t()
        }
end
