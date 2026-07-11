defmodule EasyWeb.OpenApi.Schemas.Shared do
  # Building blocks shared across OpenAPI schema modules. These return plain
  # maps/`%Schema{}`s that are spliced into `OpenApiSpex.schema(...)` calls, so the
  # generated spec is identical to writing the same shape inline.
  alias OpenApiSpex.Schema

  @days_of_week ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

  @allergens ["dairy", "egg", "fish", "shellfish", "tree_nuts", "peanuts", "wheat", "soy", "sesame"]

  @dietary_tags [
    "vegan",
    "vegetarian",
    "halal",
    "kosher",
    "gluten_free",
    "dairy_free",
    "low_fodmap",
    "keto",
    "high_protein"
  ]

  @spec days_of_week() :: [String.t()]
  def days_of_week, do: @days_of_week

  @spec allergens() :: [String.t()]
  def allergens, do: @allergens

  @spec dietary_tags() :: [String.t()]
  def dietary_tags, do: @dietary_tags

  @spec named_ref(String.t(), map() | nil) :: map()
  def named_ref(title, example \\ nil) do
    base = %{
      title: title,
      type: :object,
      additionalProperties: false,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        name: %Schema{type: :string},
        description: %Schema{type: :string, nullable: true}
      },
      required: [:id, :name, :description]
    }

    if example, do: Map.put(base, :example, example), else: base
  end

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

  @spec list_response(OpenApiSpex.Schema.t() | map(), String.t()) :: map()
  def list_response(inner, title) do
    %{
      title: title,
      type: :object,
      additionalProperties: false,
      properties: %{
        data: %Schema{type: :array, items: inner},
        count: %Schema{type: :integer, minimum: 0}
      },
      required: [:data, :count]
    }
  end
end
