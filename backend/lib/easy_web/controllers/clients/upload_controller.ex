defmodule EasyWeb.Clients.UploadController do
  use EasyWeb, :controller
  use EasyWeb.TypedRoute

  alias Easy.Attachments
  alias EasyWeb.Types.Upload

  typed(:create, body: Upload.create(), ok: {201, data(Upload.t())})
  typed(:download_urls, body: Upload.download_urls(), ok: {200, data([Upload.download()])})

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    attrs = Map.update!(conn.body_params, :content_type, &to_string/1)

    with {:ok, upload} <- Attachments.create_client_upload(conn.assigns.ctx, attrs) do
      ok(conn, %{data: upload})
    end
  end

  @spec download_urls(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def download_urls(conn, _params) do
    with {:ok, downloads} <-
           Attachments.get_client_downloads(conn.assigns.ctx, conn.body_params.attachment_ids) do
      ok(conn, %{data: downloads})
    end
  end
end
