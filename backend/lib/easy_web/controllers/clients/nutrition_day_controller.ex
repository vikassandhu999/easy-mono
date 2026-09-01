defmodule EasyWeb.Clients.NutritionDayController do
  use EasyWeb, :typed_controller

  alias Easy.Nutrition.Diary
  alias Easy.Utils
  alias EasyWeb.Types.Nutrition.Day
  alias EasyWeb.Types.Revision

  plug EasyWeb.Plugs.Idempotency
       when action in [
              :add_extra,
              :log_planned_item,
              :log_planned_option,
              :log_planned_day,
              :switch_option,
              :replace_planned_item,
              :update_entry,
              :delete_entry
            ]

  typed(:index, query: Day.list_query(), ok: {200, page(Day.t())})
  typed(:add_extra, path: %{date: Date.t()}, body: Day.add_extra(), ok: {201, data(Day.t())})

  typed(:log_planned_item,
    path: %{date: Date.t()},
    body: Day.log_planned_item(),
    ok: {201, data(Day.t())}
  )

  typed(:log_planned_option,
    path: %{date: Date.t()},
    body: Day.log_planned_option(),
    ok: {201, data(Day.t())}
  )

  typed(:log_planned_day, path: %{date: Date.t()}, ok: {201, data(Day.t())})

  typed(:switch_option,
    path: %{date: Date.t()},
    body: Day.switch_option(),
    ok: {200, data(Day.t())}
  )

  typed(:replace_planned_item,
    path: %{date: Date.t()},
    body: Day.replace_planned_item(),
    ok: {200, data(Day.t())}
  )

  typed(:update_entry,
    path: %{date: Date.t()},
    body: Day.update_entry(),
    ok: {200, data(Day.t())}
  )

  typed(:delete_entry,
    path: %{date: Date.t()},
    body: Revision.t(),
    ok: {200, data(Day.t())}
  )

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

  @spec add_extra(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def add_extra(conn, _params) do
    with {:ok, day} <-
           Diary.add_client_extra(
             conn.assigns.ctx,
             conn.path_params["date"],
             conn.body_params,
             conn.assigns.idempotency_key
           ) do
      ok(conn, %{data: day})
    end
  end

  @spec log_planned_item(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_planned_item(conn, _params) do
    with {:ok, day} <-
           Diary.log_client_planned_item(
             conn.assigns.ctx,
             conn.path_params["date"],
             conn.body_params,
             conn.assigns.idempotency_key
           ) do
      ok(conn, %{data: day})
    end
  end

  @spec log_planned_option(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_planned_option(conn, _params) do
    with {:ok, day} <-
           Diary.log_client_planned_option(
             conn.assigns.ctx,
             conn.path_params["date"],
             conn.body_params,
             conn.assigns.idempotency_key
           ) do
      ok(conn, %{data: day})
    end
  end

  @spec log_planned_day(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def log_planned_day(conn, _params) do
    with {:ok, day} <-
           Diary.log_client_planned_day(
             conn.assigns.ctx,
             conn.path_params["date"],
             conn.assigns.idempotency_key
           ) do
      ok(conn, %{data: day})
    end
  end

  @spec switch_option(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def switch_option(conn, _params) do
    with {:ok, day} <-
           Diary.switch_client_option(
             conn.assigns.ctx,
             conn.path_params["date"],
             conn.body_params,
             conn.assigns.idempotency_key
           ) do
      ok(conn, %{data: day})
    end
  end

  @spec replace_planned_item(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def replace_planned_item(conn, _params) do
    with {:ok, day} <-
           Diary.replace_client_planned_item(
             conn.assigns.ctx,
             conn.path_params["date"],
             conn.body_params,
             conn.assigns.idempotency_key
           ) do
      ok(conn, %{data: day})
    end
  end

  @spec update_entry(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update_entry(conn, _params) do
    with {:ok, day} <-
           Diary.update_client_entry(
             conn.assigns.ctx,
             conn.path_params["date"],
             conn.path_params["id"],
             conn.body_params,
             conn.assigns.idempotency_key
           ) do
      ok(conn, %{data: day})
    end
  end

  @spec delete_entry(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete_entry(conn, _params) do
    with {:ok, day} <-
           Diary.delete_client_entry(
             conn.assigns.ctx,
             conn.path_params["date"],
             conn.path_params["id"],
             conn.body_params,
             conn.assigns.idempotency_key
           ) do
      ok(conn, %{data: day})
    end
  end
end
