defmodule EasyWeb.Coaches.EquipmentController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Exercises
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{EquipmentListResponse, ErrorResponse}

  tags ["coach equipment"]

  operation :index,
    summary: "List equipment",
    description: "Lists equipment for exercise creation, editing, and filtering.",
    operation_id: "listEquipment",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:search, :query, :string, "Case-insensitive equipment name search", required: false)
    ],
    responses: [
      ok: {"Equipment", "application/json", EquipmentListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    search = Map.get(params, "search", "")

    with {:ok, equipment} <- Exercises.list_equipment(search) do
      render(conn, :index, equipment: equipment)
    end
  end
end
