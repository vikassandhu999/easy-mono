defmodule EasyWeb.Coaches.MuscleController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Exercises
  alias OpenApiSpex.Operation
  alias EasyWeb.OpenApi.Schemas.{ErrorResponse, MuscleListResponse}

  tags ["coach muscles"]

  operation :index,
    summary: "List muscles",
    description: "Lists muscles for exercise creation, editing, and filtering.",
    operation_id: "listMuscles",
    security: [%{"bearerAuth" => []}],
    parameters: [
      Operation.parameter(:search, :query, :string, "Case-insensitive muscle name search", required: false)
    ],
    responses: [
      ok: {"Muscles", "application/json", MuscleListResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, params) do
    search = Map.get(params, "search", "")

    with {:ok, muscles} <- Exercises.list_muscles(search) do
      render(conn, :index, muscles: muscles)
    end
  end
end
