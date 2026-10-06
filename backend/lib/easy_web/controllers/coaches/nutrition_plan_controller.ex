defmodule EasyWeb.Coaches.NutritionPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Plans.Programming
  alias Easy.Plans.Reader, as: PlanReader
  alias EasyWeb.Types.{NutritionPlan, NutritionPlanIndex, Revision}

  typed(:create, body: NutritionPlan.create(), ok: {201, data(NutritionPlan.t())})
  typed(:withdraw, path: %{revision_id: String.t()}, query: Revision.t(), ok: {200, data(NutritionPlan.t())})
  typed(:show, ok: {200, data(NutritionPlan.t())})
  typed(:update, body: NutritionPlan.update(), ok: {200, data(NutritionPlan.t())})

  typed(:delete, query: Revision.t(), ok: {204, nil})
  typed(:archive, body: Revision.t(), ok: {200, data(NutritionPlan.t())})
  typed(:restore, body: Revision.t(), ok: {200, data(NutritionPlan.t())})
  typed(:index, query: NutritionPlan.list_query(), ok: {200, NutritionPlanIndex.t()})
  typed(:duplicate, ok: {201, data(NutritionPlan.t())})
  typed(:assign, body: NutritionPlan.assign(), ok: {201, data(NutritionPlan.t())})

  @spec withdraw(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def withdraw(conn, _params) do
    with {:ok, plan} <-
           Programming.withdraw_revision(
             conn.assigns.ctx,
             :nutrition,
             conn.path_params["id"],
             conn.path_params["revision_id"],
             conn.query_params["expected_revision"]
           ) do
      ok(conn, %{data: plan})
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, plan} <- Programming.create_template(conn.assigns.ctx, :nutrition, conn.body_params) do
      ok(conn, %{data: plan})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, plan} <- PlanReader.get_plan(conn.assigns.ctx, :nutrition, conn.path_params["id"]) do
      ok(conn, %{data: plan})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    {expected_revision, attrs} = Map.pop!(conn.body_params, :expected_revision)

    with {:ok, plan} <-
           Programming.update_plan(conn.assigns.ctx, :nutrition, conn.path_params["id"], expected_revision, attrs) do
      ok(conn, %{data: plan})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    with {:ok, _plan} <-
           Programming.delete_plan(
             conn.assigns.ctx,
             :nutrition,
             conn.path_params["id"],
             conn.query_params["expected_revision"]
           ) do
      ok(conn)
    end
  end

  @spec archive(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def archive(conn, _params) do
    with {:ok, plan} <-
           Programming.archive_plan(
             conn.assigns.ctx,
             :nutrition,
             conn.path_params["id"],
             conn.body_params[:expected_revision]
           ) do
      ok(conn, %{data: plan})
    end
  end

  @spec restore(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def restore(conn, _params) do
    with {:ok, plan} <-
           Programming.restore_plan(
             conn.assigns.ctx,
             :nutrition,
             conn.path_params["id"],
             conn.body_params[:expected_revision]
           ) do
      ok(conn, %{data: plan})
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    with {:ok, page} <-
           PlanReader.list_template_page(
             conn.assigns.ctx,
             :nutrition,
             cursor: Map.get(params, "cursor"),
             search: Map.get(params, "search", ""),
             archived: Map.get(params, "archived"),
             offset: Map.get(params, "offset", 0),
             limit: Map.get(params, "limit", 20)
           ) do
      ok(conn, page)
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, _params) do
    with {:ok, plan} <- Programming.duplicate_template(conn.assigns.ctx, :nutrition, conn.path_params["id"]) do
      ok(conn, %{data: plan})
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, _params) do
    with {:ok, plan} <-
           Programming.assign_template_to_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             :nutrition,
             conn.path_params["id"],
             conn.body_params
           ) do
      ok(conn, %{data: plan})
    end
  end
end
