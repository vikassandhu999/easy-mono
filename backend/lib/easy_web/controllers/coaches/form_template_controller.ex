defmodule EasyWeb.Coaches.FormTemplateController do
  use EasyWeb, :typed_controller

  alias Easy.Forms.Templates
  alias EasyWeb.Types.FormTemplate

  typed(:index, ok: {200, data([FormTemplate.t()])})
  typed(:create, body: FormTemplate.create(), ok: {201, data(FormTemplate.t())})
  typed(:show, ok: {200, data(FormTemplate.t())})
  typed(:update, body: FormTemplate.update(), ok: {200, data(FormTemplate.t())})
  typed(:delete, ok: {204, nil})
  typed(:set_default_intake, ok: {200, data(FormTemplate.t())})
  typed(:clear_default_intake, ok: {200, data(FormTemplate.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    ctx = conn.assigns.ctx

    with {:ok, templates} <- Templates.list(ctx) do
      ok(conn, %{data: templates})
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

    with {:ok, _template} <- Templates.delete(ctx, id) do
      ok(conn)
    end
  end

  @spec set_default_intake(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def set_default_intake(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, template} <- Templates.set_default_intake(ctx, id) do
      ok(conn, %{data: template})
    end
  end

  @spec clear_default_intake(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def clear_default_intake(conn, _params) do
    ctx = conn.assigns.ctx
    id = conn.path_params["id"]

    with {:ok, template} <- Templates.clear_default_intake(ctx, id) do
      ok(conn, %{data: template})
    end
  end
end
