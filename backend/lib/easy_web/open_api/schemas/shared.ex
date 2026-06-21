defmodule EasyWeb.OpenApi.Schemas.Shared do
  @moduledoc false
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

  @doc "Day-of-week enum values, in order."
  def days_of_week, do: @days_of_week

  @doc "Allergen enum values, mirroring `Easy.Nutrition.Food`/`Recipe`."
  def allergens, do: @allergens

  @doc "Dietary-tag enum values, mirroring `Easy.Nutrition.Food`/`Recipe`."
  def dietary_tags, do: @dietary_tags

  @doc ~S(A `{id, name, description}` reference object. Pass `example` to attach one.)
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

  @doc "`inserted_at`/`updated_at` date-time property pair."
  def timestamps do
    %{
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    }
  end

  @doc ~S(Single-resource wrapper: `%{data: inner}`, required `:data`.)
  def data_response(inner, title) do
    %{
      title: title,
      type: :object,
      additionalProperties: false,
      properties: %{data: inner},
      required: [:data]
    }
  end

  @doc ~S(List wrapper: `%{data: [inner], count: integer}`, required `:data`/`:count`.)
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
