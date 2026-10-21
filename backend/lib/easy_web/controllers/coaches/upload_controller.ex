defmodule EasyWeb.Coaches.UploadController do
  use EasyWeb, :typed_controller

  alias Easy.Attachments
  alias EasyWeb.Types.Upload

  typed(:create, body: Upload.create(), ok: {201, data(Upload.t())})
  typed(:download_urls, body: Upload.download_urls(), ok: {200, data([Upload.download()])})

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    client_id = conn.path_params["client_id"]
    attrs = Map.update!(conn.body_params, :content_type, &to_string/1)

    with {:ok, upload} <- Attachments.create_upload_for_client(conn.assigns.ctx, client_id, attrs) do
      ok(conn, %{data: upload})
    end
  end

  @spec download_urls(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def download_urls(conn, _params) do
    with {:ok, downloads} <-
           Attachments.get_downloads(conn.assigns.ctx, conn.body_params.attachment_ids) do
      ok(conn, %{data: downloads})
    end
  end
end
