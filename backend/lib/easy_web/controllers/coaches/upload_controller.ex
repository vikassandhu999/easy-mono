defmodule EasyWeb.Coaches.UploadController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Attachments
  alias OpenApiSpex.Operation

  alias EasyWeb.OpenApi.Schemas.{
    AttachmentDownloadRequest,
    AttachmentDownloadsResponse,
    AttachmentUploadRequest,
    AttachmentUploadResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, json_render_error_v2: true

  tags ["coach attachments"]

  operation :create,
    summary: "Create an upload for a client",
    operation_id: "createCoachClientUpload",
    security: [%{"bearerAuth" => []}],
    parameters: [Operation.parameter(:client_id, :path, :string, "Client id")],
    request_body: {"Upload request", "application/json", AttachmentUploadRequest, required: true},
    responses: [
      created: {"Upload created", "application/json", AttachmentUploadResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
      service_unavailable: {"Storage unavailable", "application/json", ErrorResponse}
    ]

  operation :download_urls,
    summary: "Create attachment download URLs",
    operation_id: "getCoachAttachmentDownloadUrls",
    security: [%{"bearerAuth" => []}],
    request_body: {"Attachment ids", "application/json", AttachmentDownloadRequest, required: true},
    responses: [
      ok: {"Attachment downloads", "application/json", AttachmentDownloadsResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      not_found: {"Not found", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
      service_unavailable: {"Storage unavailable", "application/json", ErrorResponse}
    ]

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    client_id = conn.path_params["client_id"]

    with {:ok, upload} <-
           Attachments.create_upload_for_client(conn.assigns.ctx, client_id, conn.body_params) do
      conn |> put_status(:created) |> render(:show, upload: upload)
    end
  end

  @spec download_urls(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def download_urls(conn, _params) do
    with {:ok, downloads} <-
           Attachments.get_downloads(conn.assigns.ctx, conn.body_params.attachment_ids) do
      render(conn, :downloads, downloads: downloads)
    end
  end
end
