defmodule EasyWeb.Coaches.CheckInReviewController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Forms
  alias EasyWeb.Types.{CheckInReview, FormSubmission}

  typed(:index, query: CheckInReview.list_query(), ok: {200, page(CheckInReview.t())})
  typed(:review, ok: {200, data(FormSubmission.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    opts = [
      offset: Map.get(params, "offset", 0),
      limit: Map.get(params, "limit", 20)
    ]

    with {:ok, page} <-
           Forms.list_unreviewed_check_in_submissions(conn.assigns.ctx, opts) do
      ok(conn, %{count: page.count, data: page.submissions})
    end
  end

  @spec review(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def review(conn, _params) do
    with {:ok, submission} <-
           Forms.review_form_submission(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: submission})
    end
  end
end
