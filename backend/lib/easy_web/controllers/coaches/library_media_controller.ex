defmodule EasyWeb.Coaches.LibraryMediaController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.LibraryMedia

  alias EasyWeb.OpenApi.Schemas.{
    ErrorResponse,
    LibraryMediaUploadRequest,
    LibraryMediaUploadResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, json_render_error_v2: true

  tags ["coach library media"]

  operation :create,
    summary: "Create a library media upload",
    operation_id: "createCoachLibraryMediaUpload",
    security: [%{"bearerAuth" => []}],
    request_body: {"Upload request", "application/json", LibraryMediaUploadRequest, required: true},
    responses: [
      created: {"Upload created", "application/json", LibraryMediaUploadResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
      service_unavailable: {"Storage unavailable", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    with {:ok, upload} <- LibraryMedia.create_upload(conn.assigns.ctx, conn.body_params) do
      conn |> put_status(:created) |> render(:show, upload: upload)
    end
  end
end
