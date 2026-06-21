defmodule EasyWeb.OpenApi.Schemas.FoodServingSize do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "FoodServingSize",
    type: :object,
    additionalProperties: false,
    properties: %{
      label: %Schema{type: :string},
      amount: %Schema{type: :number},
      unit: %Schema{type: :string},
      weight_g: %Schema{type: :number},
      is_default: %Schema{type: :boolean}
    },
    required: [:label, :amount, :unit, :weight_g, :is_default]
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
        brand: %Schema{type: :string, nullable: true},
        barcode: %Schema{type: :string, nullable: true},
        source: %Schema{type: :string, enum: ["system", "imported", "custom"], nullable: true},
        category: %Schema{type: :string, nullable: true},
        calories_per_100g: %Schema{type: :number, nullable: true},
        protein_g_per_100g: %Schema{type: :number, nullable: true},
        carbs_g_per_100g: %Schema{type: :number, nullable: true},
        fat_g_per_100g: %Schema{type: :number, nullable: true},
        fiber_g_per_100g: %Schema{type: :number, nullable: true},
        allergens: %Schema{type: :array, items: %Schema{type: :string}},
        dietary_tags: %Schema{type: :array, items: %Schema{type: :string}},
        notes: %Schema{type: :string, nullable: true},
        image_url: %Schema{type: :string, nullable: true},
        serving_sizes: %Schema{type: :array, items: FoodServingSize}
      },
      required: [:name],
      example: %{
        "name" => "Greek Yogurt",
        "calories_per_100g" => 97,
        "protein_g_per_100g" => 10,
        "carbs_g_per_100g" => 4,
        "fat_g_per_100g" => 5,
        "fiber_g_per_100g" => 0,
        "source" => "custom",
        "category" => "Dairy",
        "allergens" => ["milk"],
        "dietary_tags" => ["high-protein"],
        "notes" => "Plain, unsweetened.",
        "serving_sizes" => [%{"label" => "100g", "unit" => "g", "weight_g" => 100, "amount" => 100, "is_default" => true}]
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
        brand: %Schema{type: :string, nullable: true},
        barcode: %Schema{type: :string, nullable: true},
        source: %Schema{type: :string, enum: ["system", "imported", "custom"], nullable: true},
        category: %Schema{type: :string, nullable: true},
        calories_per_100g: %Schema{type: :number, nullable: true},
        protein_g_per_100g: %Schema{type: :number, nullable: true},
        carbs_g_per_100g: %Schema{type: :number, nullable: true},
        fat_g_per_100g: %Schema{type: :number, nullable: true},
        fiber_g_per_100g: %Schema{type: :number, nullable: true},
        allergens: %Schema{type: :array, items: %Schema{type: :string}},
        dietary_tags: %Schema{type: :array, items: %Schema{type: :string}},
        notes: %Schema{type: :string, nullable: true},
        image_url: %Schema{type: :string, nullable: true},
        serving_sizes: %Schema{type: :array, items: FoodServingSize}
      },
      example: %{
        "name" => "Plain Greek Yogurt",
        "dietary_tags" => ["high-protein", "breakfast"]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.Food do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{FoodServingSize, Shared}

  OpenApiSpex.schema(%{
    title: "Food",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          brand: %Schema{type: :string, nullable: true},
          barcode: %Schema{type: :string, nullable: true},
          source: %Schema{type: :string, enum: ["system", "imported", "custom"], nullable: true},
          category: %Schema{type: :string, nullable: true},
          calories_per_100g: %Schema{type: :number, nullable: true},
          protein_g_per_100g: %Schema{type: :number, nullable: true},
          carbs_g_per_100g: %Schema{type: :number, nullable: true},
          fat_g_per_100g: %Schema{type: :number, nullable: true},
          fiber_g_per_100g: %Schema{type: :number, nullable: true},
          allergens: %Schema{type: :array, items: %Schema{type: :string}},
          dietary_tags: %Schema{type: :array, items: %Schema{type: :string}},
          notes: %Schema{type: :string, nullable: true},
          image_url: %Schema{type: :string, nullable: true},
          serving_sizes: %Schema{type: :array, items: FoodServingSize},
          creator_id: %Schema{type: :string, format: :uuid, nullable: true}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :name,
      :source,
      :category,
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

  alias EasyWeb.OpenApi.Schemas.{Food, Shared}

  OpenApiSpex.schema(Shared.data_response(Food, "FoodResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.FoodListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Food, Shared}

  OpenApiSpex.schema(Shared.list_response(Food, "FoodListResponse"))
end
