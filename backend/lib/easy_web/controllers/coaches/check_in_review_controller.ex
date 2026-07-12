defmodule EasyWeb.Coaches.CheckInReviewController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Forms
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    ClientProfileFormSubmissionResponse,
    ClientProfileReviewQueueListResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, [json_render_error_v2: true] when action in [:review]

  tags ["coach check-in reviews"]

  operation :index,
    summary: "List check-ins awaiting review",
    operation_id: "listCheckInReviewQueue",
    security: [%{"bearerAuth" => []}],
    responses: [
      ok: {"Review queue", "application/json", ClientProfileReviewQueueListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  operation :review,
    summary: "Mark a form submission reviewed",
    operation_id: "reviewFormSubmission",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Form submission id")],
    responses: [
      ok: {"Reviewed submission", "application/json", ClientProfileFormSubmissionResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, submissions} <- Forms.list_unreviewed_check_in_submissions(conn.assigns.ctx) do
      render(conn, :index, submissions: submissions)
    end
  end

  @spec review(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def review(conn, _params) do
    with {:ok, submission} <-
           Forms.review_form_submission(conn.assigns.ctx, conn.path_params["id"]) do
      render(conn, :show, submission: submission)
    end
  end
end
