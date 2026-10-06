defmodule EasyWeb.Coaches.TrackerTemplateController do
  alias Easy.Plans.Programming
  alias Easy.Plans.Reader
  alias Easy.Trackers.Assignments
  alias Easy.Trackers.Defaults
  alias EasyWeb.Types.Revision
  alias EasyWeb.Types.TrackerAssignment
  alias EasyWeb.Types.TrackerSettings
  alias EasyWeb.Types.TrackerTemplate
  alias EasyWeb.Types.TrackerTemplateIndex
  use EasyWeb, :typed_controller

  typed(:index, query: TrackerTemplate.list_query(), ok: {200, TrackerTemplateIndex.t()})
  typed(:show, ok: {200, data(TrackerTemplate.t())})
  typed(:create, body: TrackerTemplate.create(), ok: {201, data(TrackerTemplate.t())})
  typed(:update, body: TrackerTemplate.update(), ok: {200, data(TrackerTemplate.t())})
  typed(:apply, body: Revision.t(), ok: {200, data([TrackerAssignment.t()])})
  typed(:settings, ok: {200, data(TrackerSettings.t())})
  typed(:update_settings, body: TrackerSettings.update(), ok: {200, data(TrackerSettings.t())})
  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    with {:ok, result} <- Reader.list_template_page(conn.assigns.ctx, :trackers, opts(conn)) do
      ok(conn, result)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, result} <- Reader.get_template(conn.assigns.ctx, :trackers, conn.path_params["id"]) do
      ok(conn, %{data: result})
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, result} <- Programming.create_template(conn.assigns.ctx, :trackers, conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    with {:ok, result} <-
           Programming.update_plan(conn.assigns.ctx, :trackers, conn.path_params["id"], conn.body_params[:expected_revision], Map.delete(conn.body_params, :expected_revision)) do
      ok(conn, %{data: result})
    end
  end

  @spec apply(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def apply(conn, _params) do
    with {:ok, result} <- Assignments.apply_for_client(conn.assigns.ctx, conn.path_params["client_id"], conn.path_params["id"], conn.body_params[:expected_revision]) do
      ok(conn, %{data: result})
    end
  end

  @spec settings(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def settings(conn, _params) do
    with {:ok, result} <- Defaults.get_settings(conn.assigns.ctx) do
      ok(conn, %{data: result})
    end
  end

  @spec update_settings(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_settings(conn, _params) do
    with {:ok, result} <- Defaults.update_settings(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: result})
    end
  end

  @query_keys [:cursor, :offset, :limit, :search, :kind, :archived, :tracker_id, :from, :to, :previous_date]
  defp opts(conn),
    do:
      Enum.flat_map(@query_keys, fn key ->
        case Map.fetch(conn.query_params, to_string(key)) do
          {:ok, value} -> [{key, value}]
          :error -> []
        end
      end)
end
