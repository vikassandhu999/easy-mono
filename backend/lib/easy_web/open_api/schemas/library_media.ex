defmodule EasyWeb.OpenApi.Schemas.LibraryMedia do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "LibraryMedia",
    description: "Public library media referenced by an exercise or food.",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      kind: %Schema{type: :string, enum: ["image", "video"]},
      content_type: %Schema{type: :string},
      byte_size: %Schema{type: :integer},
      url: %Schema{type: :string, format: :uri, nullable: true}
    },
    required: [:id, :kind, :content_type, :byte_size, :url]
  })
end

defmodule EasyWeb.OpenApi.Schemas.LibraryMediaUploadRequest do
  require OpenApiSpex

  alias Easy.LibraryMedia.Media
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "LibraryMediaUploadRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        content_type: %Schema{type: :string, enum: Media.content_types()},
        byte_size: %Schema{type: :integer, minimum: 1}
      },
      required: [:content_type, :byte_size],
      example: %{
        "content_type" => "image/jpeg",
        "byte_size" => 1_024_000
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.LibraryMediaUpload do
  require OpenApiSpex

  alias Easy.LibraryMedia.Media
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "LibraryMediaUpload",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      kind: %Schema{type: :string, enum: ["image", "video"]},
      content_type: %Schema{type: :string, enum: Media.content_types()},
      byte_size: %Schema{type: :integer},
      url: %Schema{type: :string, format: :uri, nullable: true},
      public_url: %Schema{type: :string, format: :uri, nullable: true},
      upload_url: %Schema{type: :string, format: :uri},
      upload_url_expires_at: %Schema{type: :string, format: :"date-time"},
      upload_headers: %Schema{type: :object, additionalProperties: %Schema{type: :string}}
    },
    required: [
      :id,
      :kind,
      :content_type,
      :byte_size,
      :url,
      :public_url,
      :upload_url,
      :upload_url_expires_at,
      :upload_headers
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.LibraryMediaUploadResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{LibraryMediaUpload, Shared}

  OpenApiSpex.schema(Shared.data_response(LibraryMediaUpload, "LibraryMediaUploadResponse"))
end
