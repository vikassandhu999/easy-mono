defmodule EasyWeb.Clients.FormAssignmentController do
  use EasyWeb, :typed_controller

  alias Easy.Forms
  alias EasyWeb.Types.FormAssignment

  typed(:index, ok: {200, data([FormAssignment.t()])})
  typed(:show, ok: {200, data(FormAssignment.t())})
  typed(:submit, body: FormAssignment.submit(), ok: {201, data(FormAssignment.submission())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    ctx = conn.assigns.ctx

    with {:ok, assignments} <- Forms.list_client_form_assignments(ctx) do
      ok(conn, %{data: assignments})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    ctx = conn.assigns.ctx

    with {:ok, assignment} <- Forms.get_client_form_assignment(ctx, id) do
      ok(conn, %{data: assignment})
    end
  end

  @spec submit(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def submit(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, submission} <- Forms.submit_client_form_assignment(ctx, id, conn.body_params) do
      ok(conn, %{data: submission})
    end
  end
end
