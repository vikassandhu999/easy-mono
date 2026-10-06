defmodule EasyWeb.Coaches.NutritionDayController do
  alias Easy.Nutrition.Diary
  alias EasyWeb.Types.Nutrition.FoodMetric
  alias EasyWeb.Types.Nutrition.NutritionDay, as: Day
  use EasyWeb, :typed_controller

  typed(:index, query: Day.list_query(), ok: {200, data([Day.t()])})

  typed(:metrics, query: Day.list_query(), ok: {200, data([FoodMetric.t()])})
  @spec metrics(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def metrics(conn, _params) do
    with {:ok, rows} <-
           Diary.food_metrics_for_client(conn.assigns.ctx, conn.path_params["client_id"],
             from: conn.query_params["from"],
             to: conn.query_params["to"]
           ),
         do: ok(conn, %{data: rows})
  end

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    query = conn.query_params

    with {:ok, %{nutrition_days: days}} <-
           Diary.list_nutrition_days_for_client(conn.assigns.ctx, conn.path_params["client_id"],
             date: query["date"],
             from: query["from"],
             to: query["to"]
           ) do
      ok(conn, %{data: days})
    end
  end
end
