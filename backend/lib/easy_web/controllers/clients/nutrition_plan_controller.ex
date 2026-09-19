defmodule EasyWeb.Clients.NutritionPlanController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.PlanReader
  alias EasyWeb.Types.{NutritionPlan, NutritionPlanIndex}

  typed(:index,
    query: NutritionPlan.client_list_query(),
    ok: {200, NutritionPlanIndex.t()}
  )

  typed(:show, ok: {200, data(NutritionPlan.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    opts =
      [:archived, :offset, :limit, :cursor, :search]
      |> Enum.map(&{&1, conn.query_params[Atom.to_string(&1)]})
      |> Enum.reject(fn {_key, value} -> is_nil(value) end)

    with {:ok, page} <- PlanReader.list_client_plan_page(conn.assigns.ctx, opts) do
      ok(conn, page)
    end
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, plan} <- PlanReader.get_client_plan(conn.assigns.ctx, conn.path_params["id"]) do
      ok(conn, %{data: plan})
    end
  end
end
