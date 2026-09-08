defmodule EasyWeb.Coaches.NutritionDayController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Diary
  alias EasyWeb.Types.Nutrition.Day

  typed(:index, query: Day.list_query(), ok: {200, data([Day.t()])})

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
