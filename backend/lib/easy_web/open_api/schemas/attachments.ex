defmodule EasyWeb.OpenApi.Schemas.AttachmentUploadRequest do
  require OpenApiSpex

  alias Easy.Attachments.Attachment
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "AttachmentUploadRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        content_type: %Schema{type: :string, enum: Attachment.content_types()},
        byte_size: %Schema{type: :integer, minimum: 1},
        duration_ms: %Schema{type: :integer, minimum: 1, maximum: 300_000, nullable: true}
      },
      required: [:content_type, :byte_size],
      example: %{
        "content_type" => "audio/mpeg",
        "byte_size" => 1_024_000,
        "duration_ms" => 30_000
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.AttachmentUpload do
  require OpenApiSpex

  alias Easy.Attachments.Attachment
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "AttachmentUpload",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      content_type: %Schema{type: :string, enum: Attachment.content_types()},
      byte_size: %Schema{type: :integer},
      duration_ms: %Schema{type: :integer, nullable: true},
      upload_url: %Schema{type: :string, format: :uri},
      upload_url_expires_at: %Schema{type: :string, format: :"date-time"},
      upload_headers: %Schema{type: :object, additionalProperties: %Schema{type: :string}}
    },
    required: [
      :id,
      :content_type,
      :byte_size,
      :duration_ms,
      :upload_url,
      :upload_url_expires_at,
      :upload_headers
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.AttachmentUploadResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{AttachmentUpload, Shared}

  OpenApiSpex.schema(Shared.data_response(AttachmentUpload, "AttachmentUploadResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.AttachmentDownloadRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "AttachmentDownloadRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        attachment_ids: %Schema{
          type: :array,
          items: %Schema{type: :string, format: :uuid},
          minItems: 1,
          maxItems: 50,
          uniqueItems: true
        }
      },
      required: [:attachment_ids]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.AttachmentDownload do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "AttachmentDownload",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      download_url: %Schema{type: :string, format: :uri},
      download_url_expires_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:id, :download_url, :download_url_expires_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.AttachmentDownloadsResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{AttachmentDownload, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    Shared.data_response(
      %Schema{type: :array, items: AttachmentDownload},
      "AttachmentDownloadsResponse"
    )
  )
end

defmodule EasyWeb.OpenApi.Schemas.Attachment do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "Attachment",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      content_type: %Schema{type: :string, enum: Easy.Attachments.Attachment.content_types()},
      byte_size: %Schema{type: :integer},
      duration_ms: %Schema{type: :integer, nullable: true}
    },
    required: [:id, :content_type, :byte_size, :duration_ms]
  })
end
