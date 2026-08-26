defmodule EasyWeb.Types.CheckInReview do
  use EasyWeb.Type

  alias Easy.Clients.Client
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
          required(:client) => %{
            required(:id) => String.t(),
            required(:email) => String.t() | nil,
            required(:first_name) => String.t() | nil,
            required(:last_name) => String.t() | nil
          },
          required(:form_assignment) => EasyWeb.Types.FormAssignment.t()
        }

  @type list_query :: %{
          optional(:offset) => integer(),
          optional(:limit) => integer()
        }

  @spec format(FormSubmissionSchema.t()) :: t()
  def format(
        %FormSubmissionSchema{
          client: %Client{} = client,
          form_assignment: %FormAssignment{} = form_assignment
        } = submission
      ) do
    submission
    |> FormSubmissionType.format()
    |> Map.merge(%{
      client: %{
        id: client.id,
        email: client.email,
        first_name: client.first_name,
        last_name: client.last_name
      },
      form_assignment: form_assignment
    })
  end
end
