defmodule EasyWeb.Coaches.NutritionDayController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Diary
  alias EasyWeb.Types.Nutrition.Day

  typed(:index, query: Day.list_query(), ok: {200, page(Day.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    client_id = conn.path_params["client_id"]
    query = conn.query_params

    with {:ok, date} <- Easy.Utils.parse_optional_date(query["date"]),
         {:ok, from_date, to_date} <- parse_range_unless_exact(query, date),
         {:ok, %{nutrition_days: days, count: count}} <-
           Diary.list_nutrition_days_for_client(conn.assigns.ctx, client_id,
             date: date,
             from: from_date,
             to: to_date,
             offset: query["offset"] || 0,
             limit: query["limit"] || 20
           ) do
      ok(conn, %{data: days, count: count})
    end
  end

  defp parse_range_unless_exact(_query, %Date{}), do: {:ok, nil, nil}

  defp parse_range_unless_exact(query, nil) do
    with {:ok, from_date} <- Easy.Utils.parse_optional_date(query["from"]),
         {:ok, to_date} <- Easy.Utils.parse_optional_date(query["to"]) do
      {:ok, from_date, to_date}
    end
  end
end
