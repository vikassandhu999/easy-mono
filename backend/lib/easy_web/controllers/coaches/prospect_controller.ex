defmodule EasyWeb.Coaches.ProspectController do
  use EasyWeb, :typed_controller

  alias Easy.Landing
  alias EasyWeb.Types.{Prospect, ProspectEnrollment, ProspectIndex}

  typed(:index, query: Prospect.list_query(), ok: {200, ProspectIndex.t()})
  typed(:show, ok: {200, data(Prospect.t())})
  typed(:update, body: Prospect.update(), ok: {200, data(Prospect.t())})
  typed(:enroll, body: Prospect.enroll(), ok: {201, ProspectEnrollment.t()})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    opts =
      [status: conn.query_params["status"]]
      |> maybe_put(:offset, conn.query_params["offset"])
      |> maybe_put(:limit, conn.query_params["limit"])

    with {:ok, result} <- Landing.list_prospects(conn.assigns.ctx, opts) do
      ok(conn, %{data: result.prospects, count: result.count, summary: result.summary})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {:ok, prospect} <- Landing.get_prospect(conn.assigns.ctx, id) do
      ok(conn, %{data: prospect})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, prospect} <- Landing.update_prospect(conn.assigns.ctx, id, conn.body_params) do
      ok(conn, %{data: prospect})
    end
  end

  @spec enroll(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def enroll(conn, _params) do
    id = conn.path_params["id"]

    with {:ok, result} <- Landing.enroll_prospect(conn.assigns.ctx, id, conn.body_params) do
      ok(conn, %{data: %{prospect: result.prospect, already_enrolled: result.already_enrolled}})
    end
  end

  defp maybe_put(opts, _key, nil), do: opts
  defp maybe_put(opts, key, value), do: Keyword.put(opts, key, value)
end
