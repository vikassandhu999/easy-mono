defmodule EasyWeb.Coaches.LibraryMediaJSON do
  alias Easy.LibraryMedia

  @spec show(%{upload: map()}) :: %{data: map()}
  def show(%{upload: upload}) do
    media = LibraryMedia.public_representation(upload.media)

    %{
      data:
        Map.merge(media, %{
          upload_url: upload.upload_url,
          upload_url_expires_at: upload.upload_url_expires_at,
          upload_headers: upload.upload_headers,
          public_url: upload.public_url
        })
    }
  end
end
