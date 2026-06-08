defmodule EasyWeb.HealthController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias EasyWeb.OpenApi.Schemas.HealthResponse

  tags ["health"]

  operation :index,
    summary: "Health check",
    description: "Returns basic service health metadata.",
    operation_id: "healthCheck",
    responses: [
      ok: {"Health", "application/json", HealthResponse}
    ]

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    conn
    |> put_status(:ok)
    |> json(%{
      status: "ok",
      service: "easy-backend",
      timestamp: DateTime.utc_now() |> DateTime.to_iso8601(),
      version: "1.0.0"
    })
  end
end
