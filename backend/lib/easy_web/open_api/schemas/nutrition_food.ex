defmodule EasyWeb.OpenApi.Schemas.FoodServingSize do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "FoodServingSize",
    type: :object,
    additionalProperties: false,
    properties: %{
      unit: %Schema{type: :string},
      weight_g: %Schema{type: :number},
      amount: %Schema{type: :number}
    },
    required: [:unit, :weight_g, :amount]
  })
end

defmodule EasyWeb.OpenApi.Schemas.FoodRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.FoodServingSize

  OpenApiSpex.schema(
    %{
      title: "FoodRequest",
      description: "Request body for creating or updating a food.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        macros: %Schema{type: :object, additionalProperties: true},
        source: %Schema{type: :string, nullable: true},
        category: %Schema{type: :string, nullable: true},
        tags: %Schema{type: :array, items: %Schema{type: :string}},
        notes: %Schema{type: :string, nullable: true},
        image_url: %Schema{type: :string, nullable: true},
        serving_sizes: %Schema{type: :array, items: FoodServingSize}
      },
      required: [:name],
      example: %{
        "name" => "Greek Yogurt",
        "macros" => %{"calories" => 97, "protein_g" => 10, "carbs_g" => 4, "fat_g" => 5},
        "source" => "custom",
        "category" => "Dairy",
        "tags" => ["high-protein"],
        "notes" => "Plain, unsweetened.",
        "serving_sizes" => [%{"unit" => "g", "weight_g" => 100, "amount" => 100}]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.FoodUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.FoodServingSize

  OpenApiSpex.schema(
    %{
      title: "FoodUpdateRequest",
      description: "Request body for updating a coach-owned food.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        macros: %Schema{type: :object, additionalProperties: true},
        source: %Schema{type: :string, nullable: true},
        category: %Schema{type: :string, nullable: true},
        tags: %Schema{type: :array, items: %Schema{type: :string}},
        notes: %Schema{type: :string, nullable: true},
        image_url: %Schema{type: :string, nullable: true},
        serving_sizes: %Schema{type: :array, items: FoodServingSize}
      },
      example: %{
        "name" => "Plain Greek Yogurt",
        "tags" => ["high-protein", "breakfast"]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.Food do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.FoodServingSize

  OpenApiSpex.schema(%{
    title: "Food",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      macros: %Schema{type: :object, additionalProperties: true},
      source: %Schema{type: :string, nullable: true},
      category: %Schema{type: :string, nullable: true},
      tags: %Schema{type: :array, items: %Schema{type: :string}},
      notes: %Schema{type: :string, nullable: true},
      image_url: %Schema{type: :string, nullable: true},
      serving_sizes: %Schema{type: :array, items: FoodServingSize},
      creator_id: %Schema{type: :string, format: :uuid, nullable: true},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [
      :id,
      :name,
      :macros,
      :source,
      :category,
      :tags,
      :notes,
      :image_url,
      :serving_sizes,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.FoodResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Food

  OpenApiSpex.schema(%{
    title: "FoodResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: Food},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.FoodListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Food

  OpenApiSpex.schema(%{
    title: "FoodListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: Food},
      count: %Schema{type: :integer, minimum: 0}
    },
    required: [:data, :count]
  })
end
