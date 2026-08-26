defmodule EasyWeb.Types.LibraryMedia do
  use EasyWeb.Type

  alias Easy.LibraryMedia, as: LibraryMediaContext

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :image | :video,
          required(:content_type) => String.t(),
          required(:byte_size) => integer(),
          required(:url) => String.t() | nil,
          required(:public_url) => String.t() | nil,
          required(:upload_url) => String.t(),
          required(:upload_url_expires_at) => DateTime.t(),
          required(:upload_headers) => %{String.t() => String.t()}
        }

  @type create :: %{
          required(:content_type) => :"image/jpeg" | :"image/png" | :"image/webp" | :"video/mp4" | :"video/webm",
          required(:byte_size) => pos_integer()
        }

  @spec format(map()) :: t()
  def format(%{
        media: media,
        upload_url: upload_url,
        upload_url_expires_at: upload_url_expires_at,
        upload_headers: upload_headers,
        public_url: public_url
      }) do
    %{id: id, kind: kind, content_type: content_type, byte_size: byte_size, url: url} =
      LibraryMediaContext.public_representation(media)

    %{
      id: id,
      kind: kind,
      content_type: content_type,
      byte_size: byte_size,
      url: url,
      public_url: public_url,
      upload_url: upload_url,
      upload_url_expires_at: upload_url_expires_at,
      upload_headers: upload_headers
    }
  end
end
