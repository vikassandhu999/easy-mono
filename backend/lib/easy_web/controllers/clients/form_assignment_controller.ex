defmodule EasyWeb.Clients.FormAssignmentController do
  use EasyWeb, :typed_controller

  alias Easy.Forms.Assignments
  alias Easy.Forms.Submissions
  alias EasyWeb.Types.ClientFormAssignmentIndex
  alias EasyWeb.Types.FormAssignment

  typed(:index, query: FormAssignment.list_query(), ok: {200, ClientFormAssignmentIndex.t()})
  typed(:show, ok: {200, data(FormAssignment.t())})
  typed(:submit, body: FormAssignment.submit(), ok: {201, data(FormAssignment.submission())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params
    opts = [cursor: params["cursor"], limit: params["limit"], state: params["state"], purpose: params["purpose"]]

    with {:ok, page} <- Assignments.list_client_form_assignments(conn.assigns.ctx, opts) do
      ok(conn, page)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    ctx = conn.assigns.ctx

    with {:ok, assignment} <- Assignments.get_client_form_assignment(ctx, id) do
      ok(conn, %{data: assignment})
    end
  end

  @spec submit(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def submit(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, submission} <- Submissions.submit_client_assignment(ctx, id, conn.body_params) do
      ok(conn, %{data: submission})
    end
  end
end
