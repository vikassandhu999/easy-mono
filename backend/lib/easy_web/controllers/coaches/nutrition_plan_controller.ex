defmodule EasyWeb.Coaches.NutritionPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.{PlanReader, Programming}
  alias EasyWeb.Types.{NutritionMenu, NutritionPlan, NutritionPlanIndex}

  typed(:create, body: NutritionPlan.create(), ok: {201, data(NutritionPlan.t())})
  typed(:show, ok: {200, data(NutritionPlan.t())})
  typed(:update, body: NutritionPlan.update(), ok: {200, data(NutritionPlan.t())})
  typed(:delete, query: NutritionPlan.lifecycle_query(), ok: {204, nil})
  typed(:archive, query: NutritionPlan.lifecycle_query(), ok: {200, data(NutritionPlan.t())})
  typed(:restore, query: NutritionPlan.lifecycle_query(), ok: {200, data(NutritionPlan.t())})
  typed(:index, query: NutritionPlan.list_query(), ok: {200, NutritionPlanIndex.t()})

  typed(:replace_menu,
    body: NutritionPlan.replace_menu(),
    ok: {200, data(NutritionPlan.t())}
  )

  typed(:preview_menu, body: NutritionPlan.preview_menu(), ok: {200, data(NutritionMenu.t())})

  typed(:duplicate, ok: {201, data(NutritionPlan.t())})
  typed(:assign, body: NutritionPlan.assign(), ok: {201, data(NutritionPlan.t())})

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, plan} <- Programming.create_template(conn.assigns.ctx, conn.body_params) do
      ok(conn, %{data: plan})
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, plan} <- PlanReader.get_plan(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: plan})
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, _params) do
    {expected_revision, attrs} = Map.pop!(conn.body_params, :expected_revision)

    with {:ok, plan} <-
           Programming.update_plan(conn.assigns.ctx, conn.path_params["id"], expected_revision, attrs) do
      ok(conn, %{data: plan})
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, _params) do
    with {:ok, _plan} <-
           Programming.delete_plan(
             conn.assigns.ctx,
             conn.path_params["id"],
             Map.get(conn.query_params, "expected_revision", :any)
           ) do
      ok(conn)
    end
  end

  @spec archive(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def archive(conn, _params) do
    with {:ok, plan} <-
           Programming.archive_plan(
             conn.assigns.ctx,
             conn.path_params["id"],
             Map.get(conn.query_params, "expected_revision", :any)
           ) do
      ok(conn, %{data: plan})
    end
  end

  @spec restore(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def restore(conn, _params) do
    with {:ok, plan} <-
           Programming.restore_plan(
             conn.assigns.ctx,
             conn.path_params["id"],
             Map.get(conn.query_params, "expected_revision", :any)
           ) do
      ok(conn, %{data: plan})
    end
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    params = conn.query_params

    if Map.has_key?(params, "cursor") do
      with {:ok, page} <-
             PlanReader.list_template_page(conn.assigns.ctx,
               cursor: params["cursor"],
               search: Map.get(params, "search", ""),
               archived: Map.get(params, "archived"),
               limit: Map.get(params, "limit", 20)
             ) do
        ok(conn, page)
      end
    else
      with {:ok, %{templates: plans, count: count}} <-
             PlanReader.list_templates(conn.assigns.ctx,
               search: Map.get(params, "search", ""),
               archived: Map.get(params, "archived"),
               offset: Map.get(params, "offset", 0),
               limit: Map.get(params, "limit", 20)
             ) do
        ok(conn, %{data: plans, count: count, next_cursor: nil})
      end
    end
  end

  @spec preview_menu(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def preview_menu(conn, _params) do
    with {:ok, menu} <- Programming.preview_menu(conn.assigns.ctx, conn.body_params.menu) do
      ok(conn, %{data: menu})
    end
  end

  @spec replace_menu(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def replace_menu(conn, _params) do
    with {:ok, plan} <-
           Programming.replace_menu(
             conn.assigns.ctx,
             conn.path_params["id"],
             conn.body_params.expected_revision,
             conn.body_params.menu
           ) do
      ok(conn, %{data: plan})
    end
  end

  @spec duplicate(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def duplicate(conn, _params) do
    with {:ok, plan} <-
           Programming.duplicate_template(
             conn.assigns.ctx,
             conn.path_params["id"]
           ) do
      ok(conn, %{data: plan})
    end
  end

  @spec assign(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def assign(conn, _params) do
    with {:ok, plan} <-
           Programming.assign_template_to_client(
             conn.assigns.ctx,
             conn.path_params["client_id"],
             conn.path_params["id"],
             conn.body_params
           ) do
      ok(conn, %{data: plan})
    end
  end
end
