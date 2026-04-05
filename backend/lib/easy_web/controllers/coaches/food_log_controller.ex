defmodule EasyWeb.Coaches.FoodLogController do
  use EasyWeb, :controller

  alias Easy.Clients.Client
  alias Easy.Nutrition.FoodLog
  alias Easy.Repo

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"client_id" => client_id} = params) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- Client.accessible?(business_id, client_id) do
      date = Easy.Utils.safe_date(params["date"])
      from_date = Easy.Utils.safe_date(params["from"])
      to_date = Easy.Utils.safe_date(params["to"])

      base =
        FoodLog
        |> FoodLog.for_business(business_id)
        |> FoodLog.for_client(client_id)

      base = apply_date_filters(base, date, from_date, to_date)

      logs =
        base
        |> FoodLog.ordered()
        |> FoodLog.with_associations()
        |> Repo.all()

      render(conn, :index, food_logs: logs)
    else
      false -> {:error, :not_found}
    end
  end

  @spec summary(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def summary(conn, %{"client_id" => client_id, "from" => from_str, "to" => to_str}) do
    %{business_id: business_id} = conn.assigns.claims

    with true <- Client.accessible?(business_id, client_id),
         from_date when not is_nil(from_date) <- Easy.Utils.safe_date(from_str),
         to_date when not is_nil(to_date) <- Easy.Utils.safe_date(to_str) do
      logs =
        FoodLog
        |> FoodLog.for_business(business_id)
        |> FoodLog.for_client(client_id)
        |> FoodLog.for_date_range(from_date, to_date)
        |> FoodLog.ordered()
        |> Repo.all()

      summaries = build_daily_summaries(logs)

      render(conn, :summary, summaries: summaries)
    else
      false -> {:error, :not_found}
      nil -> {:error, :not_found}
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case FoodLog
         |> FoodLog.for_business(business_id)
         |> Repo.get(id) do
      nil ->
        {:error, :not_found}

      log ->
        case FoodLog.delete(log) do
          {:ok, _} -> send_resp(conn, :no_content, "")
          error -> error
        end
    end
  end

  defp apply_date_filters(query, date, _from, _to) when not is_nil(date) do
    FoodLog.for_date(query, date)
  end

  defp apply_date_filters(query, _, from_date, to_date)
       when not is_nil(from_date) and not is_nil(to_date) do
    FoodLog.for_date_range(query, from_date, to_date)
  end

  defp apply_date_filters(query, _, _, _), do: query

  defp build_daily_summaries(logs) do
    logs
    |> Enum.group_by(& &1.date)
    |> Enum.map(fn {date, day_logs} ->
      totals =
        Enum.reduce(day_logs, %{calories: 0.0, protein_g: 0.0, carbs_g: 0.0, fat_g: 0.0}, fn log,
                                                                                             acc ->
          macros = log.macros_snapshot || %{}
          weight = log.weight_g || 0.0

          %{
            calories:
              acc.calories + compute_macro(macros, ["calories_per_100g", "calories"], weight),
            protein_g: acc.protein_g + compute_macro(macros, ["protein_g", "protein"], weight),
            carbs_g: acc.carbs_g + compute_macro(macros, ["carbs_g", "carbs"], weight),
            fat_g: acc.fat_g + compute_macro(macros, ["fat_g", "fat"], weight)
          }
        end)

      %{
        date: date,
        total_entries: length(day_logs),
        totals: totals
      }
    end)
    |> Enum.sort_by(& &1.date, Date)
  end

  defp compute_macro(macros, keys, weight_g) when is_list(keys) do
    key = Enum.find(keys, fn k -> is_map_key(macros, k) end)
    value = if key, do: macros[key] || 0, else: 0
    Float.round(value * weight_g / 100, 1)
  end
end
