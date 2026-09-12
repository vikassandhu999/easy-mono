defmodule EasyWeb.Coaches.CheckInReviewController do
  use EasyWeb, :typed_controller

  alias Easy.Forms.Submissions
  alias EasyWeb.Types.{CheckInReview, CheckInSubmissionIndex, FormSubmission}

  typed(:index, query: CheckInReview.list_query(), ok: {200, page(CheckInReview.t())})
  typed(:review, ok: {200, data(FormSubmission.t())})
  typed(:history, query: CheckInReview.history_query(), ok: {200, CheckInSubmissionIndex.t()})
  typed(:show, path: %{id: Ecto.UUID.t()}, ok: {200, data(CheckInReview.t())})

  @spec history(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def history(conn, _params) do
    params = conn.query_params

    opts = [
      cursor: params["cursor"],
      limit: params["limit"],
      client_id: params["client_id"],
      reviewed: params["reviewed"],
      search: params["search"]
    ]

    with {:ok, page} <- Submissions.list_check_in_submissions(conn.assigns.ctx, opts) do
      ok(conn, page)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, submission} <- Submissions.get_check_in_submission(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: submission})
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    opts = [
      offset: Map.get(params, "offset", 0),
      limit: Map.get(params, "limit", 20)
    ]

    with {:ok, page} <-
           Submissions.list_unreviewed_check_ins(conn.assigns.ctx, opts) do
      ok(conn, %{count: page.count, data: page.submissions})
    end
  end

  @spec review(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def review(conn, _params) do
    with {:ok, submission} <-
           Submissions.review(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: submission})
    end
  end
end
