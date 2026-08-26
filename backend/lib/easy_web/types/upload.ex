defmodule EasyWeb.Types.Upload do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:content_type) =>
            :"image/jpeg"
            | :"image/png"
            | :"image/webp"
            | :"image/heic"
            | :"video/mp4"
            | :"video/webm"
            | :"video/quicktime"
            | :"audio/webm"
            | :"audio/mp4"
            | :"audio/mpeg",
          required(:byte_size) => pos_integer(),
          required(:duration_ms) => pos_integer() | nil,
          required(:upload_url) => String.t(),
          required(:upload_url_expires_at) => DateTime.t(),
          required(:upload_headers) => %{String.t() => String.t()}
        }

  @type create :: %{
          required(:content_type) =>
            :"image/jpeg"
            | :"image/png"
            | :"image/webp"
            | :"image/heic"
            | :"video/mp4"
            | :"video/webm"
            | :"video/quicktime"
            | :"audio/webm"
            | :"audio/mp4"
            | :"audio/mpeg",
          required(:byte_size) => pos_integer(),
          optional(:duration_ms) => pos_integer() | nil
        }

  @type download_urls :: %{required(:attachment_ids) => [String.t()]}

  @type download :: %{
          required(:id) => String.t(),
          required(:download_url) => String.t(),
          required(:download_url_expires_at) => DateTime.t()
        }

  @spec format(map()) :: t()
  def format(%{
        attachment: attachment,
        upload_url: upload_url,
        upload_url_expires_at: upload_url_expires_at,
        upload_headers: upload_headers
      }) do
    %{
      id: attachment.id,
      content_type: attachment.content_type,
      byte_size: attachment.byte_size,
      duration_ms: attachment.duration_ms,
      upload_url: upload_url,
      upload_url_expires_at: upload_url_expires_at,
      upload_headers: upload_headers
    }
  end
end
