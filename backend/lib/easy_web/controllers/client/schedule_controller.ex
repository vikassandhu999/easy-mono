defmodule EasyWeb.Client.ScheduleController do
  @moduledoc """
  Client-facing schedule endpoints (computed on read for MVP).

  Endpoints:
  - GET /api/client/schedule/next
    Returns the next actionable item for the client (prefers "today" if due).

  - GET /api/client/schedule/week?week_start=YYYY-MM-DD
    Returns a computed schedule for the requested week (Mon..Sun).

  Notes:
  - Controllers stay thin; all business logic is delegated to context modules.
  - All tenant-sensitive queries must be scoped by `business_id`.
  - For MVP, this can return training + nutrition sections; either can be empty.
  """

  use EasyWeb, :controller

  alias Easy.Auth.Scope
  alias Easy.Scheduling

  @doc """
  GET /api/client/schedule/next

  Returns the next actionable schedule item for the authenticated client.
  """
  def next(conn, _params) do
    scope = conn.assigns.scope

    unless Scope.is_client?(scope) do
      {:error, Easy.Error.unauthorized("This endpoint is only for clients")}
    else
      with {:ok, result} <- Scheduling.get_next_for_client(scope) do
        render(conn, :next, result: result)
      end
    end
  end

  @doc """
  GET /api/client/schedule/week?week_start=YYYY-MM-DD

  Returns the schedule for a week starting at `week_start` (ISO date).
  If absent, defaults to the current week start (Monday, UTC).
  """
  def week(conn, params) do
    scope = conn.assigns.scope

    unless Scope.is_client?(scope) do
      {:error, Easy.Error.unauthorized("This endpoint is only for clients")}
    else
      with {:ok, week_start} <- parse_week_start(params["week_start"]),
           {:ok, result} <- Scheduling.get_week_for_client(scope, week_start) do
        render(conn, :week, result: result)
      end
    end
  end

  # ===========================================================================
  # Private helpers
  # ===========================================================================

  defp parse_week_start(nil) do
    # Default: compute current week start (Monday) in UTC for MVP.
    today = Date.utc_today()
    # 1..7 (Mon..Sun)
    weekday = Date.day_of_week(today)
    {:ok, Date.add(today, -(weekday - 1))}
  end

  defp parse_week_start(value) when is_binary(value) do
    case Date.from_iso8601(value) do
      {:ok, date} ->
        # Normalize to Monday week start even if caller passes mid-week date
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
