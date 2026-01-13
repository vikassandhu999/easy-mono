defmodule EasyWeb.Client.ScheduleController do
  use EasyWeb, :controller

  alias Easy.Auth.Scope
  alias Easy.Scheduling

  def week(conn, params) do
    scope = conn.assigns.scope

    unless Scope.is_client?(scope) do
      {:error, Easy.Error.unauthorized("Permission denied")}
    else
      with {:ok, week_start} <- parse_week_start(params["week_start"]),
           {:ok, result} <- Scheduling.get_week_for_client(scope, week_start) do
        render(conn, :week, result: result)
      end
    end
  end

  defp parse_week_start(nil) do
    today = Date.utc_today()
    weekday = Date.day_of_week(today)
    {:ok, Date.add(today, -(weekday - 1))}
  end

  defp parse_week_start(value) when is_binary(value) do
    case Date.from_iso8601(value) do
      {:ok, date} ->
        weekday = Date.day_of_week(date)
        {:ok, Date.add(date, -(weekday - 1))}

      {:error, _} ->
        {:error, Easy.Error.unprocessable("week_start must be a valid ISO date (YYYY-MM-DD)")}
    end
  end

  defp parse_week_start(_other) do
    {:error, Easy.Error.unprocessable("week_start must be a valid ISO date (YYYY-MM-DD)")}
  end
end
