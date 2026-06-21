defmodule EasyWeb.OpenApi.Schemas.RecipeIngredientRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "RecipeIngredientRequest",
    type: :object,
    additionalProperties: false,
    properties: %{
      food_id: %Schema{type: :string, format: :uuid},
      unit: %Schema{type: :string, nullable: true},
      amount: %Schema{type: :number, nullable: true},
      weight_g: %Schema{type: :number, nullable: true},
      position: %Schema{type: :integer, minimum: 0}
    },
    required: [:food_id]
  })
end

defmodule EasyWeb.OpenApi.Schemas.RecipeIngredient do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Food

  OpenApiSpex.schema(%{
    title: "RecipeIngredient",
    type: :object,
    additionalProperties: false,
    properties: %{
      food_id: %Schema{type: :string, format: :uuid},
      food: %Schema{allOf: [Food], nullable: true},
      unit: %Schema{type: :string, nullable: true},
      amount: %Schema{type: :number, nullable: true},
      weight_g: %Schema{type: :number, nullable: true},
      position: %Schema{type: :integer, minimum: 0}
    },
    required: [:food_id, :food, :unit, :amount, :weight_g]
  })
end

defmodule EasyWeb.OpenApi.Schemas.RecipeRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  alias EasyWeb.OpenApi.Schemas.{
    FoodServingSize,
    RecipeIngredientRequest,
    Shared
  }

  OpenApiSpex.schema(
    %{
      title: "RecipeRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, nullable: true},
        instructions: %Schema{type: :string, nullable: true},
        servings_count: %Schema{type: :integer, nullable: true},
        cooked_weight_g: %Schema{type: :number, nullable: true},
        allergens: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.allergens()}},
        dietary_tags: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.dietary_tags()}},
        serving_sizes: %Schema{type: :array, items: FoodServingSize},
        recipe_ingredients: %Schema{type: :array, items: RecipeIngredientRequest}
      },
      required: [:name],
      example: %{
        "name" => "Turkey Rice Bowl",
        "description" => "A high-protein meal prep bowl.",
        "servings_count" => 4,
        "recipe_ingredients" => [
          %{"food_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c", "weight_g" => 150, "position" => 0}
        ]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.Recipe do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  alias EasyWeb.OpenApi.Schemas.{
    Food,
    FoodServingSize,
    RecipeIngredient,
    Shared
  }

  OpenApiSpex.schema(%{
    title: "Recipe",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          description: %Schema{type: :string, nullable: true},
          instructions: %Schema{type: :string, nullable: true},
          servings_count: %Schema{type: :integer, nullable: true},
          cooked_weight_g: %Schema{type: :number, nullable: true},
          allergens: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.allergens()}},
          dietary_tags: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.dietary_tags()}},
          nutrition: %Schema{
            type: :object,
            nullable: true,
            properties: %{
              calories: %Schema{type: :number, nullable: true},
              protein_g: %Schema{type: :number, nullable: true},
              carbs_g: %Schema{type: :number, nullable: true},
              fat_g: %Schema{type: :number, nullable: true},
              fiber_g: %Schema{type: :number, nullable: true}
            }
          },
          serving_sizes: %Schema{type: :array, items: FoodServingSize},
          recipe_ingredients: %Schema{type: :array, items: RecipeIngredient},
          foods: %Schema{type: :array, items: Food},
          creator_id: %Schema{type: :string, format: :uuid, nullable: true}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :name,
      :instructions,
      :cooked_weight_g,
      :serving_sizes,
      :recipe_ingredients,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.RecipeResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Recipe, Shared}

  OpenApiSpex.schema(Shared.data_response(Recipe, "RecipeResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.RecipeListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Recipe, Shared}

  OpenApiSpex.schema(Shared.list_response(Recipe, "RecipeListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealItemRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionMealItemRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        weight_g: %Schema{type: :number, nullable: true},
        amount: %Schema{type: :number, nullable: true},
        unit: %Schema{type: :string, nullable: true},
        position: %Schema{type: :integer, minimum: 0},
        recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
        food_id: %Schema{type: :string, format: :uuid, nullable: true}
      },
      example: %{
        "food_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "amount" => 1,
        "unit" => "serving",
        "position" => 0
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealItem do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(%{
    title: "NutritionMealItem",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          weight_g: %Schema{type: :number, nullable: true},
          amount: %Schema{type: :number, nullable: true},
          unit: %Schema{type: :string, nullable: true},
          position: %Schema{type: :integer, minimum: 0},
          recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
          food_id: %Schema{type: :string, format: :uuid, nullable: true},
          nutrition_meal_id: %Schema{type: :string, format: :uuid, nullable: true}
        },
        Shared.timestamps()
      ),
    required: [:id, :weight_g, :amount, :unit, :position, :recipe_id, :food_id, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionMealRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        notes: %Schema{type: :string, nullable: true},
        default_meal_slot: %Schema{
          type: :string,
          enum: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"],
          nullable: true
        }
      },
      required: [:name],
      example: %{
        "name" => "Breakfast",
        "default_meal_slot" => "breakfast"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMeal do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{NutritionMealItem, Shared}

  OpenApiSpex.schema(%{
    title: "NutritionMeal",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          notes: %Schema{type: :string, nullable: true},
          default_meal_slot: %Schema{
            type: :string,
            enum: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"],
            nullable: true
          },
          nutrition: %Schema{
            type: :object,
            nullable: true,
            properties: %{
              calories: %Schema{type: :number, nullable: true},
              protein_g: %Schema{type: :number, nullable: true},
              carbs_g: %Schema{type: :number, nullable: true},
              fat_g: %Schema{type: :number, nullable: true},
              fiber_g: %Schema{type: :number, nullable: true}
            }
          },
          meal_items: %Schema{type: :array, items: NutritionMealItem},
          creator_id: %Schema{type: :string, format: :uuid, nullable: true},
          nutrition_plan_id: %Schema{type: :string, format: :uuid, nullable: true}
        },
        Shared.timestamps()
      ),
    required: [:id, :name, :meal_items, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanItemRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanItemRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        day_of_week: %Schema{
          type: :string,
          enum: Shared.days_of_week()
        },
        meal_slot: %Schema{
          type: :string,
          enum: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"]
        },
        nutrition_meal_id: %Schema{type: :string, format: :uuid}
      },
      required: [:day_of_week, :meal_slot, :nutrition_meal_id],
      example: %{
        "day_of_week" => "monday",
        "meal_slot" => "breakfast",
        "nutrition_meal_id" => "1b8248bc-4499-4a0c-986f-621fc95cbd0e"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanItemUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanItemUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        day_of_week: %Schema{
          type: :string,
          enum: Shared.days_of_week()
        },
        meal_slot: %Schema{
          type: :string,
          enum: ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"]
        }
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanItem do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(%{
    title: "NutritionPlanItem",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          day_of_week: %Schema{type: :string},
          meal_slot: %Schema{type: :string},
          nutrition_meal_id: %Schema{type: :string, format: :uuid},
          nutrition_plan_id: %Schema{type: :string, format: :uuid, nullable: true}
        },
        Shared.timestamps()
      ),
    required: [:id, :day_of_week, :meal_slot, :nutrition_meal_id, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, nullable: true},
        tags: %Schema{type: :array, items: %Schema{type: :string}},
        target_calories: %Schema{type: :number, nullable: true},
        target_protein_g: %Schema{type: :number, nullable: true},
        target_carbs_g: %Schema{type: :number, nullable: true},
        target_fat_g: %Schema{type: :number, nullable: true},
        target_fiber_g: %Schema{type: :number, nullable: true},
        status: %Schema{type: :string, enum: ["active", "archived"]},
        start_date: %Schema{type: :string, format: :date, nullable: true},
        end_date: %Schema{type: :string, format: :date, nullable: true}
      },
      required: [:name],
      example: %{
        "name" => "Fat Loss Plan",
        "target_calories" => 2200,
        "target_protein_g" => 180
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanAssignRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanAssignRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        client_id: %Schema{type: :string, format: :uuid},
        start_date: %Schema{type: :string, format: :date, nullable: true},
        end_date: %Schema{type: :string, format: :date, nullable: true}
      },
      required: [:client_id],
      example: %{"client_id" => "0ac4b3bc-e0b6-44ea-ae7a-f48deac42912"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlan do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  alias EasyWeb.OpenApi.Schemas.{
    NutritionMeal,
    NutritionPlanItem,
    Shared
  }

  OpenApiSpex.schema(%{
    title: "NutritionPlan",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          description: %Schema{type: :string, nullable: true},
          tags: %Schema{type: :array, items: %Schema{type: :string}},
          target_calories: %Schema{type: :number, nullable: true},
          target_protein_g: %Schema{type: :number, nullable: true},
          target_carbs_g: %Schema{type: :number, nullable: true},
          target_fat_g: %Schema{type: :number, nullable: true},
          target_fiber_g: %Schema{type: :number, nullable: true},
          status: %Schema{type: :string, enum: ["active", "archived"]},
          start_date: %Schema{type: :string, format: :date, nullable: true},
          end_date: %Schema{type: :string, format: :date, nullable: true},
          client_id: %Schema{type: :string, format: :uuid, nullable: true},
          client: %Schema{type: :object, additionalProperties: true, nullable: true},
          source_template_id: %Schema{type: :string, format: :uuid, nullable: true},
          creator_id: %Schema{type: :string, format: :uuid, nullable: true},
          meals: %Schema{type: :array, items: NutritionMeal},
          plan_items: %Schema{type: :array, items: NutritionPlanItem}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :name,
      :description,
      :tags,
      :status,
      :start_date,
      :end_date,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionPlan, Shared}

  OpenApiSpex.schema(Shared.data_response(NutritionPlan, "NutritionPlanResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionPlan, Shared}

  OpenApiSpex.schema(Shared.list_response(NutritionPlan, "NutritionPlanListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionMeal, Shared}

  OpenApiSpex.schema(Shared.data_response(NutritionMeal, "NutritionMealResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionMeal, Shared}

  OpenApiSpex.schema(Shared.list_response(NutritionMeal, "NutritionMealListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealItemResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionMealItem, Shared}

  OpenApiSpex.schema(Shared.data_response(NutritionMealItem, "NutritionMealItemResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealItemListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{NutritionMealItem, Shared}

  OpenApiSpex.schema(
    Shared.data_response(
      %Schema{type: :array, items: NutritionMealItem},
      "NutritionMealItemListResponse"
    )
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanItemResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionPlanItem, Shared}

  OpenApiSpex.schema(Shared.data_response(NutritionPlanItem, "NutritionPlanItemResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanItemListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{NutritionPlanItem, Shared}

  OpenApiSpex.schema(
    Shared.data_response(
      %Schema{type: :array, items: NutritionPlanItem},
      "NutritionPlanItemListResponse"
    )
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMapResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionMapResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{type: :object, additionalProperties: true}},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionArrayResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(
    Shared.data_response(
      %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}},
      "NutritionArrayResponse"
    )
  )
end
