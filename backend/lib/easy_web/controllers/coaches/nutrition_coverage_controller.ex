defmodule EasyWeb.Coaches.NutritionCoverageController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Coverage, as: PlanReader
  alias EasyWeb.Types.NutritionCoverage

  typed(:show, ok: {200, data(NutritionCoverage.t())})

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, _params) do
    with {:ok, coverage} <- PlanReader.get_coverage_for_client(conn.assigns.ctx, conn.path_params["client_id"]) do
      ok(conn, %{data: coverage})
    end
  end
end
