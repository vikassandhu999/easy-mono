defmodule EasyWeb.Coaches.FoodLogEntryController do
  use EasyWeb, :controller

  alias Easy.Nutrition.MealLogging
  alias Easy.Nutrition.Reads

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, entry} <- Reads.fetch_business_food_log_entry(business_id, id),
         {:ok, _} <- MealLogging.delete_entry(entry, business_id) do
      send_resp(conn, :no_content, "")
    end
  end
end
