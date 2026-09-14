defmodule EasyWeb.Coaches.FormTemplateController do
  use EasyWeb, :typed_controller

  alias Easy.Forms.Templates
  alias EasyWeb.Types.FormTemplate
  alias EasyWeb.Types.FormTemplateIndex
  alias EasyWeb.Types.FormTemplateManagement

  typed(:index, query: FormTemplate.list_query(), ok: {200, FormTemplateIndex.t()})
  typed(:default_intake, ok: {200, data(FormTemplate.t())})
  typed(:create, body: FormTemplate.create(), ok: {201, data(FormTemplate.t())})
  typed(:show, ok: {200, data(FormTemplate.t())})
  typed(:update, body: FormTemplate.update(), ok: {200, data(FormTemplate.t())})
  typed(:management, ok: {200, data(FormTemplateManagement.t())})
  typed(:delete, query: FormTemplate.mutation_query(), ok: {204, nil})
  typed(:set_default_intake, query: FormTemplate.mutation_query(), ok: {200, data(FormTemplate.t())})
  typed(:clear_default_intake, query: FormTemplate.mutation_query(), ok: {200, data(FormTemplate.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params
    ctx = conn.assigns.ctx

    opts = [
      cursor: params["cursor"],
      limit: params["limit"],
      search: params["search"],
      purpose: params["purpose"],
      status: params["status"]
    ]

    with {:ok, page} <- Templates.list_page(ctx, opts) do
      ok(conn, page)
    end
  end

  @spec default_intake(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def default_intake(conn, _params) do
    with {:ok, template} <- Templates.get_default_intake(conn.assigns.ctx) do
      ok(conn, %{data: template})
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    ctx = conn.assigns.ctx

    with {:ok, template} <- Templates.create(ctx, conn.body_params) do
      ok(conn, %{data: template})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    ctx = conn.assigns.ctx

    with {:ok, template} <- Templates.get(ctx, id) do
      ok(conn, %{data: template})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, template} <- Templates.update(ctx, id, conn.body_params) do
      ok(conn, %{data: template})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, _template} <- Templates.delete(ctx, id, conn.query_params) do
      ok(conn)
    end
  end

  @spec set_default_intake(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def set_default_intake(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, template} <- Templates.set_default_intake(ctx, id, conn.query_params) do
      ok(conn, %{data: template})
    end
  end

  @spec clear_default_intake(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def clear_default_intake(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, template} <- Templates.clear_default_intake(ctx, id, conn.query_params) do
      ok(conn, %{data: template})
    end
  end

  @spec management(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def management(conn, %{"id" => id}) do
    with {:ok, result} <- Templates.get_management(conn.assigns.ctx, id) do
      ok(conn, %{data: result})
    end
  end
end
