defmodule EasyWeb.BusinessController do
  use EasyWeb, :typed_controller

  alias Easy.Orgs
  alias EasyWeb.Types.Business

  typed(:create, body: Business.create(), ok: {201, data(Business.t())})
  typed(:show, ok: {200, data(Business.t())})
  typed(:timezones, ok: {200, data(Business.timezone_options())})
  typed(:update, body: Business.update(), ok: {200, data(Business.t())})

  typed(:handle_availability, query: Business.availability_query(), ok: {200, Business.availability()})
  @spec handle_availability(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def handle_availability(conn, _params) do
    with {:ok, result} <- Orgs.handle_availability(conn.assigns.ctx, conn.query_params["handle"]), do: ok(conn, result)
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, business} <- Orgs.create_business(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: business})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, business} <- Orgs.get_business(conn.assigns.ctx) do
      ok(conn, %{data: business})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, business} <- Orgs.update_business(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: business})
    end
  end

  @spec timezones(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def timezones(conn, _params) do
    with {:ok, timezones} <- Easy.LocalCalendar.timezones() do
      ok(conn, %{data: %{timezones: timezones}})
    end
  end
end
