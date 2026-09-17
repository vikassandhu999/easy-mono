defmodule EasyWeb.Types.WorkbenchClient do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:first_name) => String.t() | nil,
          required(:last_name) => String.t() | nil,
          required(:email) => String.t() | nil,
          required(:status) => :active | :pending | :inactive
        }
end

defmodule EasyWeb.Types.IntakeAwaitingReviewReason do
  use EasyWeb.Type

  @type t :: %{
          required(:code) => :intake_awaiting_review,
          required(:submission_id) => String.t(),
          required(:submitted_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.WorkbenchReplyItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :reply,
          required(:client) => EasyWeb.Types.WorkbenchClient.t(),
          required(:target) => %{required(:conversation_id) => String.t()},
          required(:reasons) => [EasyWeb.Types.ReplyNeededReason.t()],
          required(:waiting_since) => DateTime.t() | nil,
          required(:due_on) => Date.t() | nil,
          required(:preview) => String.t() | nil
        }
end

defmodule EasyWeb.Types.WorkbenchReviewItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :review,
          required(:client) => EasyWeb.Types.WorkbenchClient.t(),
          required(:target) => %{
            required(:submission_id) => String.t(),
            required(:assignment_id) => String.t(),
            required(:purpose) => :intake | :check_in
          },
          required(:reasons) => [
            EasyWeb.Types.IntakeAwaitingReviewReason.t() | EasyWeb.Types.CheckInAwaitingReviewReason.t()
          ],
          required(:waiting_since) => DateTime.t() | nil,
          required(:due_on) => Date.t() | nil,
          required(:preview) => String.t() | nil
        }
end

defmodule EasyWeb.Types.WorkbenchPreparePlanItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :prepare_plan,
          required(:client) => EasyWeb.Types.WorkbenchClient.t(),
          required(:target) => %{required(:service) => :training | :nutrition},
          required(:reasons) => [
            EasyWeb.Types.ServiceNeverProgrammedReason.t()
            | EasyWeb.Types.ServiceCoverageMissingReason.t()
            | EasyWeb.Types.ServiceCoverageEndingSoonReason.t()
          ],
          required(:waiting_since) => DateTime.t() | nil,
          required(:due_on) => Date.t() | nil,
          required(:preview) => String.t() | nil
        }
end

defmodule EasyWeb.Types.WorkbenchInvitationFollowUpItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :invitation_follow_up,
          required(:client) => EasyWeb.Types.WorkbenchClient.t(),
          required(:target) => %{required(:invitation_id) => String.t()},
          required(:reasons) => [EasyWeb.Types.InvitationFollowUpDueReason.t()],
          required(:waiting_since) => DateTime.t() | nil,
          required(:due_on) => Date.t() | nil,
          required(:preview) => String.t() | nil
        }
end

defmodule EasyWeb.Types.WorkbenchIntakeFollowUpItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :intake_follow_up,
          required(:client) => EasyWeb.Types.WorkbenchClient.t(),
          required(:target) => %{required(:assignment_id) => String.t()},
          required(:reasons) => [EasyWeb.Types.IntakeOverdueReason.t()],
          required(:waiting_since) => DateTime.t() | nil,
          required(:due_on) => Date.t() | nil,
          required(:preview) => String.t() | nil
        }
end

defmodule EasyWeb.Types.WorkbenchMissedCheckInItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :missed_check_in,
          required(:client) => EasyWeb.Types.WorkbenchClient.t(),
          required(:target) => %{required(:assignment_id) => String.t()},
          required(:reasons) => [EasyWeb.Types.MissedCheckInReason.t()],
          required(:waiting_since) => DateTime.t() | nil,
          required(:due_on) => Date.t() | nil,
          required(:preview) => String.t() | nil
        }
end

defmodule EasyWeb.Types.WorkbenchEndingEngagementItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :ending_engagement,
          required(:client) => EasyWeb.Types.WorkbenchClient.t(),
          required(:target) => %{required(:client_id) => String.t()},
          required(:reasons) => [EasyWeb.Types.EngagementEndingSoonReason.t()],
          required(:waiting_since) => DateTime.t() | nil,
          required(:due_on) => Date.t() | nil,
          required(:preview) => String.t() | nil
        }
end

defmodule EasyWeb.Types.WorkbenchItem do
  use EasyWeb.Type

  @type t ::
          EasyWeb.Types.WorkbenchReplyItem.t()
          | EasyWeb.Types.WorkbenchReviewItem.t()
          | EasyWeb.Types.WorkbenchPreparePlanItem.t()
          | EasyWeb.Types.WorkbenchInvitationFollowUpItem.t()
          | EasyWeb.Types.WorkbenchIntakeFollowUpItem.t()
          | EasyWeb.Types.WorkbenchMissedCheckInItem.t()
          | EasyWeb.Types.WorkbenchEndingEngagementItem.t()
end

defmodule EasyWeb.Types.WorkbenchItems do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.WorkbenchItem.t()],
          required(:count) => non_neg_integer() | nil,
          required(:next_cursor) => String.t() | nil
        }
  @type query :: %{
          optional(:view) => :awaiting | :"follow-ups",
          optional(:search) => String.t(),
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer(),
          optional(:include_count) => boolean()
        }
end
