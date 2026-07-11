defmodule EasyWeb.Clients.UploadController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Attachments
  alias EasyWeb.OpenApi.Schemas.{ClientUploadRequest, ClientUploadResponse, ErrorResponse}

  plug OpenApiSpex.Plug.CastAndValidate, json_render_error_v2: true

  tags ["client uploads"]

  operation :create,
    summary: "Create client upload",
    description: "Creates attachment metadata and a short-lived private object-storage PUT URL.",
    operation_id: "createClientUpload",
    security: [%{"bearerAuth" => []}],
    request_body: {"Upload request", "application/json", ClientUploadRequest, required: true},
    responses: [
      created: {"Upload created", "application/json", ClientUploadResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
      service_unavailable: {"Storage unavailable", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, upload} <- Attachments.create_client_upload(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, upload: upload)
    end
  end
end
