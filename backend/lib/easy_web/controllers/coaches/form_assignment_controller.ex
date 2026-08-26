defmodule EasyWeb.Coaches.FormAssignmentController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Forms
  alias EasyWeb.Types.FormAssignment

  typed(:index, ok: {200, data([FormAssignment.t()])})
  typed(:create, body: FormAssignment.create(), ok: {201, data(FormAssignment.t())})
  typed(:update, body: FormAssignment.update(), ok: {200, data(FormAssignment.t())})
  typed(:submissions, ok: {200, data([FormAssignment.submission()])})
  typed(:remind, ok: {204, nil})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id}) do
    ctx = conn.assigns.ctx

    with {:ok, assignments} <- Forms.list_form_assignments_for_client(ctx, client_id) do
      ok(conn, %{data: assignments})
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    ctx = conn.assigns.ctx
    client_id = conn.path_params["client_id"]
    template_id = conn.body_params[:form_template_id]

    with {:ok, assignment} <- Forms.assign_form_template_to_client(ctx, client_id, template_id, %{}) do
      ok(conn, %{data: assignment})
    end
  end

  @spec submissions(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def submissions(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, submissions} <- Forms.list_form_submissions(ctx, id) do
      ok(conn, %{data: submissions})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, assignment} <- Forms.update_form_assignment(ctx, id, conn.body_params) do
      ok(conn, %{data: assignment})
    end
  end

  @spec remind(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def remind(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, _assignment} <- Forms.send_intake_reminder(conn.assigns.ctx, id) do
      ok(conn)
    end
  end
end
