defmodule EasyWeb.Coaches.FoodLogEntryController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.MealLogs
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.ErrorResponse

  tags ["coach food log entries"]

  operation :delete,
    summary: "Delete client food log entry",
    operation_id: "deleteCoachFoodLogEntry",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:id, :path, :string, "Food log entry id")],
    responses: [
      no_content: "Food log entry deleted",
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse}
    ]

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    %{business_id: business_id} = conn.assigns.claims

    with {:ok, _} <- MealLogs.delete_entry_for_business(business_id, id) do
      send_resp(conn, :no_content, "")
    end
  end
end
