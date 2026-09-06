defmodule EasyWeb.Clients.NutritionDayController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Diary
  alias Easy.Utils
  alias EasyWeb.Types.Nutrition.Day
  typed(:index, query: Day.list_query(), ok: {200, page(Day.t())})
  typed(:save, path: %{date: Date.t()}, body: Day.save(), ok: {200, data(Day.t())})

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    query = conn.query_params

    with {:ok, date} <- Utils.parse_optional_date(query["date"]),
         {:ok, from_date, to_date} <- parse_range_unless_exact(query, date),
         {:ok, %{nutrition_days: days, count: count}} <-
           Diary.list_client_nutrition_days(conn.assigns.ctx,
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
    with {:ok, from_date} <- Utils.parse_optional_date(query["from"]),
         {:ok, to_date} <- Utils.parse_optional_date(query["to"]) do
      {:ok, from_date, to_date}
    end
  end

  @spec save(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def save(conn, _params) do
    with {:ok, day} <- Diary.save_client_nutrition_day(conn.assigns.ctx, conn.path_params["date"], conn.body_params) do
      ok(conn, %{data: day})
    end
  end
end
