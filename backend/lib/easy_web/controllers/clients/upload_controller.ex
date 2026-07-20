defmodule EasyWeb.Clients.UploadController do
  use EasyWeb, :controller
  use OpenApiSpex.ControllerSpecs

  alias Easy.Attachments

  alias EasyWeb.OpenApi.Schemas.{
    AttachmentDownloadRequest,
    AttachmentDownloadsResponse,
    AttachmentUploadRequest,
    AttachmentUploadResponse,
    ErrorResponse
  }

  plug OpenApiSpex.Plug.CastAndValidate, json_render_error_v2: true

  tags ["client uploads"]

  operation :create,
    summary: "Create client upload",
    description: "Creates attachment metadata and a short-lived private object-storage PUT URL.",
    operation_id: "createClientUpload",
    security: [%{"bearerAuth" => []}],
    request_body: {"Upload request", "application/json", AttachmentUploadRequest, required: true},
    responses: [
      created: {"Upload created", "application/json", AttachmentUploadResponse},
      unauthorized: {"Unauthorized", "application/json", ErrorResponse},
      unprocessable_entity: {"Validation error", "application/json", ErrorResponse},
      service_unavailable: {"Storage unavailable", "application/json", ErrorResponse}
    ]

  operation :download_urls,
    summary: "Create attachment download URLs",
    operation_id: "getClientAttachmentDownloadUrls",
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
    with {:ok, upload} <- Attachments.create_client_upload(conn.assigns.ctx, conn.body_params) do
      conn
      |> put_status(:created)
      |> render(:show, upload: upload)
    end
  end

  @spec download_urls(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def download_urls(conn, _params) do
    with {:ok, downloads} <-
           Attachments.get_client_downloads(conn.assigns.ctx, conn.body_params.attachment_ids) do
      render(conn, :downloads, downloads: downloads)
    end
  end
end
