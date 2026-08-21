defmodule EasyWeb.OpenApi.Schemas.FoodServingSize do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "FoodServingSize",
      type: :object,
      additionalProperties: false,
      properties: %{
        label: %Schema{type: :string},
        amount: %Schema{type: :number, exclusiveMinimum: true, minimum: 0},
        unit: %Schema{type: :string},
        weight_g: %Schema{type: :number, exclusiveMinimum: true, minimum: 0},
        is_default: %Schema{type: :boolean}
      },
      required: [:label, :amount, :unit, :weight_g, :is_default]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.FoodRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{FoodServingSize, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "FoodRequest",
      description: "Request body for creating or updating a food. `source` is stamped by the server, never accepted.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        brand: %Schema{type: :string, nullable: true},
        barcode: %Schema{type: :string, nullable: true},
        category: %Schema{type: :string, nullable: true},
        calories_per_100g: %Schema{type: :number, nullable: true},
        protein_g_per_100g: %Schema{type: :number, nullable: true},
        carbs_g_per_100g: %Schema{type: :number, nullable: true},
        fat_g_per_100g: %Schema{type: :number, nullable: true},
        fiber_g_per_100g: %Schema{type: :number, nullable: true},
        sugar_g_per_100g: %Schema{type: :number, nullable: true},
        allergens: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.allergens()}},
        dietary_tags: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.dietary_tags()}},
        notes: %Schema{type: :string, nullable: true},
        image_url: %Schema{type: :string, nullable: true},
        media_id: %Schema{type: :string, format: :uuid, nullable: true},
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
        "sugar_g_per_100g" => 4,
        "category" => "Dairy",
        "allergens" => ["dairy"],
        "dietary_tags" => ["high_protein"],
        "notes" => "Plain, unsweetened.",
        "serving_sizes" => [%{"label" => "100g", "unit" => "g", "weight_g" => 100, "amount" => 100, "is_default" => true}]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.FoodUpdateRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{FoodServingSize, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "FoodUpdateRequest",
      description: "Request body for updating a coach-owned food. `source` is server-owned and immutable.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        brand: %Schema{type: :string, nullable: true},
        barcode: %Schema{type: :string, nullable: true},
        category: %Schema{type: :string, nullable: true},
        calories_per_100g: %Schema{type: :number, nullable: true},
        protein_g_per_100g: %Schema{type: :number, nullable: true},
        carbs_g_per_100g: %Schema{type: :number, nullable: true},
        fat_g_per_100g: %Schema{type: :number, nullable: true},
        fiber_g_per_100g: %Schema{type: :number, nullable: true},
        sugar_g_per_100g: %Schema{type: :number, nullable: true},
        allergens: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.allergens()}},
        dietary_tags: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.dietary_tags()}},
        notes: %Schema{type: :string, nullable: true},
        image_url: %Schema{type: :string, nullable: true},
        media_id: %Schema{type: :string, format: :uuid, nullable: true},
        expected_revision: %Schema{type: :integer, minimum: 1},
        serving_sizes: %Schema{type: :array, items: FoodServingSize}
      },
      required: [:expected_revision],
      example: %{
        "expected_revision" => 1,
        "name" => "Plain Greek Yogurt",
        "dietary_tags" => ["high_protein"]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutrientTotals do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutrientTotals",
    type: :object,
    additionalProperties: false,
    properties: %{
      calories: %Schema{type: :number, nullable: true},
      protein: %Schema{type: :number, nullable: true},
      carbohydrates: %Schema{type: :number, nullable: true},
      fat: %Schema{type: :number, nullable: true},
      fiber: %Schema{type: :number, nullable: true},
      complete: %Schema{type: :boolean}
    },
    required: [:calories, :protein, :carbohydrates, :fat, :fiber, :complete]
  })
end

defmodule EasyWeb.OpenApi.Schemas.StaleRevisionError do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "StaleRevisionError",
    type: :object,
    additionalProperties: false,
    properties: %{
      error_code: %Schema{type: :string, enum: ["stale_revision"]},
      error_message: %Schema{type: :string},
      error_detail: %Schema{
        type: :object,
        additionalProperties: false,
        properties: %{current_revision: %Schema{type: :integer, minimum: 1}},
        required: [:current_revision]
      }
    },
    required: [:error_code, :error_message, :error_detail]
  })
end

defmodule EasyWeb.OpenApi.Schemas.Food do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{FoodServingSize, LibraryMedia, NutrientTotals, Shared}
  alias OpenApiSpex.Schema

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
          revision: %Schema{type: :integer, minimum: 1},
          nutrients: NutrientTotals,
          calories_per_100g: %Schema{type: :number, nullable: true},
          protein_g_per_100g: %Schema{type: :number, nullable: true},
          carbs_g_per_100g: %Schema{type: :number, nullable: true},
          fat_g_per_100g: %Schema{type: :number, nullable: true},
          fiber_g_per_100g: %Schema{type: :number, nullable: true},
          sugar_g_per_100g: %Schema{type: :number, nullable: true},
          allergens: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.allergens()}},
          dietary_tags: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.dietary_tags()}},
          notes: %Schema{type: :string, nullable: true},
          image_url: %Schema{type: :string, nullable: true},
          media: %Schema{allOf: [LibraryMedia], nullable: true},
          serving_sizes: %Schema{type: :array, items: FoodServingSize},
          creator_id: %Schema{type: :string, format: :uuid, nullable: true}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :name,
      :source,
      :revision,
      :nutrients,
      :category,
      :notes,
      :image_url,
      :media,
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

defmodule EasyWeb.OpenApi.Schemas.FoodImpactResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  @plan_ref %Schema{
    type: :object,
    properties: %{
      id: %Schema{type: :string},
      name: %Schema{type: :string},
      client_id: %Schema{type: :string, nullable: true}
    },
    required: [:id, :name, :client_id]
  }

  @recipe_ref %Schema{
    type: :object,
    properties: %{
      id: %Schema{type: :string},
      name: %Schema{type: :string}
    },
    required: [:id, :name]
  }

  OpenApiSpex.schema(%{
    title: "FoodImpactResponse",
    type: :object,
    properties: %{
      data: %Schema{
        type: :object,
        properties: %{
          recipes: %Schema{type: :array, items: @recipe_ref},
          templates: %Schema{type: :array, items: @plan_ref},
          active_client_plans: %Schema{type: :array, items: @plan_ref}
        },
        required: [:recipes, :templates, :active_client_plans]
      }
    },
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.FoodCategoryListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "FoodCategoryListResponse",
      type: :object,
      properties: %{
        data: %Schema{type: :array, items: %Schema{type: :string}}
      },
      required: [:data],
      example: %{"data" => ["Dairy", "Fruit", "Grains", "Poultry"]}
    },
    struct?: false
  )
end
