defmodule EasyWeb.Clients.UploadJSON do
  @spec show(%{upload: map()}) :: %{data: map()}
  def show(%{upload: upload}) do
    attachment = upload.attachment

    %{
      data: %{
        id: attachment.id,
        content_type: attachment.content_type,
        byte_size: attachment.byte_size,
        purpose: attachment.purpose,
        upload_url: upload.upload_url,
        upload_url_expires_at: upload.upload_url_expires_at,
        upload_headers: upload.upload_headers
      }
    }
  end
end
