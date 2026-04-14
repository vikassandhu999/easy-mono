defmodule EasyWeb.Coaches.FoodLogEntryController do
  use EasyWeb, :controller

  alias Easy.Nutrition.FoodLogEntry
  alias Easy.Nutrition.MealLog

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    case FoodLogEntry.get_for_business(business_id, id) do
      nil ->
        {:error, :not_found}

      entry ->
        case MealLog.delete_entry(entry) do
          {:ok, _} -> send_resp(conn, :no_content, "")
          error -> error
        end
    end
  end
end
