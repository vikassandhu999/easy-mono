defmodule EasyWeb.Types.FormAssignmentAnswer do
  use EasyWeb.Type

  @type t ::
          String.t()
          | number()
          | boolean()
          | [String.t()]
          | %{required(:services) => [String.t()]}
end

defmodule EasyWeb.Types.FormSnapshotQuestion do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:label) => String.t(),
          required(:type) =>
            :text
            | :number
            | :boolean
            | :date
            | :select
            | :multi_select
            | :rating
            | :weight
            | :photo
            | :service_type,
          optional(:unit) => :kg | :lbs,
          optional(:required) => boolean(),
          optional(:options) => [String.t()]
        }
end

defmodule EasyWeb.Types.FormSnapshotSection do
  use EasyWeb.Type

  @type t :: %{
          required(:questions) => [EasyWeb.Types.FormSnapshotQuestion.t()],
          optional(:title) => String.t(),
          optional(:section) => String.t()
        }
end

defmodule EasyWeb.Types.FormSubmission do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:form_assignment_id) => String.t(),
          required(:question_snapshot) => [EasyWeb.Types.FormSnapshotSection.t()],
          required(:answers) => %{String.t() => EasyWeb.Types.FormAssignmentAnswer.t()},
          required(:submitted_by_type) => :coach | :client | :system,
          required(:submitted_at) => DateTime.t(),
          required(:reviewed_at) => DateTime.t() | nil,
          required(:reviewed_by_id) => String.t() | nil,
          required(:attachments) => [
            %{
              required(:id) => String.t(),
              required(:content_type) =>
                :"image/jpeg"
                | :"image/png"
                | :"image/webp"
                | :"image/heic"
                | :"video/mp4"
                | :"video/webm"
                | :"video/quicktime"
                | :"audio/webm"
                | :"audio/mp4"
                | :"audio/mpeg",
              required(:byte_size) => pos_integer(),
              required(:duration_ms) => non_neg_integer() | nil
            }
          ],
          required(:inserted_at) => DateTime.t()
        }

  @spec format(Easy.Forms.FormSubmission.t() | map()) :: t()
  def format(
        %{
          id: _id,
          form_assignment_id: _form_assignment_id,
          question_snapshot: _question_snapshot,
          answers: _answers,
          submitted_by_type: _submitted_by_type,
          submitted_at: _submitted_at,
          reviewed_at: _reviewed_at,
          reviewed_by_id: _reviewed_by_id,
          attachments: _attachments,
          inserted_at: _inserted_at
        } = submission
      ) do
    %{
      id: submission.id,
      form_assignment_id: submission.form_assignment_id,
      question_snapshot: submission.question_snapshot,
      answers: submission.answers,
      submitted_by_type: submission.submitted_by_type,
      submitted_at: submission.submitted_at,
      reviewed_at: submission.reviewed_at,
      reviewed_by_id: submission.reviewed_by_id,
      attachments: submission.attachments,
      inserted_at: submission.inserted_at
    }
  end
end

defmodule EasyWeb.Types.FormSubmissionDetail do
  use EasyWeb.Type

  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormSubmission, as: FormSubmissionSchema
  alias EasyWeb.Types.FormSubmission, as: FormSubmissionType

  @type t :: %{
          required(:id) => String.t(),
          required(:form_assignment_id) => String.t(),
          required(:question_snapshot) => [EasyWeb.Types.FormSnapshotSection.t()],
          required(:answers) => %{String.t() => EasyWeb.Types.FormAssignmentAnswer.t()},
          required(:submitted_by_type) => :coach | :client | :system,
          required(:submitted_at) => DateTime.t(),
          required(:reviewed_at) => DateTime.t() | nil,
          required(:reviewed_by_id) => String.t() | nil,
          required(:attachments) => [
            %{
              required(:id) => String.t(),
              required(:content_type) =>
                :"image/jpeg"
                | :"image/png"
                | :"image/webp"
                | :"image/heic"
                | :"video/mp4"
                | :"video/webm"
                | :"video/quicktime"
                | :"audio/webm"
                | :"audio/mp4"
                | :"audio/mpeg",
              required(:byte_size) => pos_integer(),
              required(:duration_ms) => non_neg_integer() | nil
            }
          ],
          required(:inserted_at) => DateTime.t(),
          required(:form_assignment) => %{
            required(:id) => String.t(),
            required(:purpose) => :intake | :check_in,
            required(:form_template) => %{
              required(:id) => String.t(),
              required(:name) => String.t()
            }
          }
        }

  @spec format(FormSubmissionSchema.t()) :: t()
  def format(%FormSubmissionSchema{form_assignment: %FormAssignment{} = assignment} = submission) do
    submission
    |> FormSubmissionType.format()
    |> Map.put(:form_assignment, %{
      id: assignment.id,
      purpose: assignment.purpose,
      form_template: %{id: assignment.form_template.id, name: assignment.form_template.name}
    })
  end
end

defmodule EasyWeb.Types.FormAssignment do
  use EasyWeb.Type

  @type submission :: EasyWeb.Types.FormSubmission.t()

  @type t :: %{
          required(:id) => String.t(),
          required(:client_id) => String.t(),
          required(:form_template_id) => String.t(),
          required(:check_in_schedule_id) => String.t() | nil,
          required(:purpose) => :intake | :check_in,
          required(:priority) => :high | :normal,
          required(:status) => :assigned | :in_progress | :completed | :dismissed | :missed,
          required(:due_date) => Date.t() | nil,
          required(:completed_at) => DateTime.t() | nil,
          required(:due_reminder_sent_at) => DateTime.t() | nil,
          required(:overdue_reminder_sent_at) => DateTime.t() | nil,
          required(:latest_submission) => EasyWeb.Types.FormSubmission.t() | nil,
          required(:latest_submission_reviewed_at) => DateTime.t() | nil,
          required(:form_template) => EasyWeb.Types.FormTemplate.t(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer(),
          optional(:state) => :pending | :history,
          optional(:purpose) => :intake | :check_in
        }

  @type create :: %{required(:form_template_id) => String.t()}

  @type update :: %{
          optional(:expected_status) => :assigned | :in_progress | :completed | :dismissed | :missed,
          optional(:priority) => :high | :normal,
          optional(:status) => :assigned | :in_progress | :completed | :dismissed | :missed,
          optional(:due_date) => Date.t() | nil
        }

  @type submit :: %{
          optional(:expected_revision) => pos_integer(),
          optional(:weight_unit) => :kg | :lbs,
          required(:answers) => %{String.t() => EasyWeb.Types.FormAssignmentAnswer.t()}
        }
end

defmodule EasyWeb.Types.ClientFormAssignmentIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.FormAssignment.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.ClientFormAssignmentDetail do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => EasyWeb.Types.FormAssignment.t(),
          required(:weight_unit) => :kg | :lbs
        }
end
