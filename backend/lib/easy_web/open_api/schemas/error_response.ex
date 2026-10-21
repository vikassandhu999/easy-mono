defmodule EasyWeb.OpenApi.Schemas.ErrorResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ErrorResponse",
    type: :object,
    additionalProperties: true,
    properties: %{
      error: %Schema{type: :object, additionalProperties: true},
      errors: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}}
    }
  })
end
