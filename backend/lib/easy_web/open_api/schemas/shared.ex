defmodule EasyWeb.OpenApi.Schemas.Shared do
  # Building blocks shared across OpenAPI schema modules. These return plain
  # maps/`%Schema{}`s that are spliced into `OpenApiSpex.schema(...)` calls, so the
  # generated spec is identical to writing the same shape inline.
  alias OpenApiSpex.Schema

  @spec timestamps() :: map()
  def timestamps do
    %{
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    }
  end

  @spec data_response(OpenApiSpex.Schema.t() | map(), String.t()) :: map()
  def data_response(inner, title) do
    %{
      title: title,
      type: :object,
      additionalProperties: false,
      properties: %{data: inner},
      required: [:data]
    }
  end
end
