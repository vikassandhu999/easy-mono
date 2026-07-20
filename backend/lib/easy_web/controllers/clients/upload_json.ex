defmodule EasyWeb.Clients.UploadJSON do
  alias EasyWeb.AttachmentJSON

  @spec show(%{upload: map()}) :: %{data: map()}
  def show(%{upload: upload}) do
    %{
      data:
        upload.attachment
        |> AttachmentJSON.data()
        |> Map.merge(%{
          upload_url: upload.upload_url,
          upload_url_expires_at: upload.upload_url_expires_at,
          upload_headers: upload.upload_headers
        })
    }
  end

  @spec downloads(%{downloads: [map()]}) :: %{data: [map()]}
  def downloads(%{downloads: downloads}), do: %{data: downloads}
end
