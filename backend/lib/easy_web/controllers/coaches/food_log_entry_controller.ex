defmodule EasyWeb.Coaches.FoodLogEntryController do
  use EasyWeb, :controller

  alias Easy.Nutrition.MealLogs

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _} <- MealLogs.delete_entry_for_business(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
