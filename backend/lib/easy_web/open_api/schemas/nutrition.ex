defmodule EasyWeb.OpenApi.Schemas.RecipeIngredientRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
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
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.RecipeIngredient do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Food
  alias OpenApiSpex.Schema

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

defmodule EasyWeb.OpenApi.Schemas.RecipeImpactResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema

  @plan_ref %Schema{
    type: :object,
    properties: %{
      id: %Schema{type: :string},
      name: %Schema{type: :string},
      client_id: %Schema{type: :string, nullable: true}
    }
  }

  OpenApiSpex.schema(%{
    title: "RecipeImpactResponse",
    type: :object,
    properties: %{
      data: %Schema{
        type: :object,
        properties: %{
          templates: %Schema{type: :array, items: @plan_ref},
          active_client_plans: %Schema{type: :array, items: @plan_ref}
        }
      }
    }
  })
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

  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionMealItem",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string, nullable: true},
          weight_g: %Schema{type: :number, nullable: true},
          amount: %Schema{type: :number, nullable: true},
          unit: %Schema{type: :string, nullable: true},
          position: %Schema{type: :integer, minimum: 0},
          recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
          food_id: %Schema{type: :string, format: :uuid, nullable: true},
          nutrition_meal_id: %Schema{type: :string, format: :uuid, nullable: true},
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
          }
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
        notes: %Schema{type: :string, nullable: true}
      },
      required: [:name],
      example: %{"name" => "Breakfast"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMeal do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionMealItem, Shared}
  alias OpenApiSpex.Schema

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

defmodule EasyWeb.OpenApi.Schemas.NutritionDayMeal do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayMeal",
    type: :object,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      meal_slot: %Schema{
        type: :string,
        enum: ~w(breakfast morning_snack lunch afternoon_snack dinner evening_snack)
      },
      position: %Schema{type: :integer},
      nutrition_meal_id: %Schema{type: :string, format: :uuid},
      nutrition_plan_day_id: %Schema{type: :string, format: :uuid}
    },
    required: [:id, :meal_slot, :position, :nutrition_meal_id]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanDay do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  alias EasyWeb.OpenApi.Schemas.NutritionDayMeal

  OpenApiSpex.schema(%{
    title: "NutritionPlanDay",
    type: :object,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      position: %Schema{type: :integer},
      weekdays: %Schema{
        type: :array,
        items: %Schema{type: :string, enum: ~w(monday tuesday wednesday thursday friday saturday sunday)}
      },
      day_meals: %Schema{type: :array, items: NutritionDayMeal}
    },
    required: [:id, :name, :position, :weekdays, :day_meals]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayMealWithMeal do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionMeal
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayMealWithMeal",
    type: :object,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      meal_slot: %Schema{
        type: :string,
        enum: ~w(breakfast morning_snack lunch afternoon_snack dinner evening_snack)
      },
      position: %Schema{type: :integer},
      nutrition_meal_id: %Schema{type: :string, format: :uuid},
      nutrition_plan_day_id: %Schema{type: :string, format: :uuid},
      meal: NutritionMeal
    },
    required: [:id, :meal_slot, :position, :nutrition_meal_id, :meal]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlan do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  alias EasyWeb.OpenApi.Schemas.{
    NutritionMeal,
    NutritionPlanDay,
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
          assigned_client_count: %Schema{
            type: :integer,
            description: "Clients this template is currently assigned to (0 for a client's own plan)"
          },
          start_date: %Schema{type: :string, format: :date, nullable: true},
          end_date: %Schema{type: :string, format: :date, nullable: true},
          client_id: %Schema{type: :string, format: :uuid, nullable: true},
          client: %Schema{
            type: :object,
            nullable: true,
            additionalProperties: false,
            properties: %{
              id: %Schema{type: :string, format: :uuid},
              first_name: %Schema{type: :string, nullable: true},
              last_name: %Schema{type: :string, nullable: true}
            },
            required: [:id, :first_name, :last_name]
          },
          source_template_id: %Schema{type: :string, format: :uuid, nullable: true},
          creator_id: %Schema{type: :string, format: :uuid, nullable: true},
          meals: %Schema{type: :array, items: NutritionMeal},
          days: %Schema{type: :array, items: NutritionPlanDay},
          weekday_assignments: %Schema{
            type: :object,
            description: "Weekday name -> nutrition plan day id",
            additionalProperties: %Schema{type: :string, format: :uuid}
          }
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

defmodule EasyWeb.OpenApi.Schemas.NutritionMealItemResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionMealItem, Shared}

  OpenApiSpex.schema(Shared.data_response(NutritionMealItem, "NutritionMealItemResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanDayCreateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanDayCreateRequest",
      type: :object,
      properties: %{name: %Schema{type: :string, nullable: true}}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanDayUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanDayUpdateRequest",
      type: :object,
      properties: %{name: %Schema{type: :string}},
      required: [:name]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionScheduleRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @weekday %Schema{type: :string, format: :uuid}

  OpenApiSpex.schema(
    %{
      title: "NutritionScheduleRequest",
      type: :object,
      additionalProperties: false,
      description: "The plan's full weekday map. Every weekday must point at a day of this plan.",
      properties: %{
        monday: @weekday,
        tuesday: @weekday,
        wednesday: @weekday,
        thursday: @weekday,
        friday: @weekday,
        saturday: @weekday,
        sunday: @weekday
      },
      required: [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionScheduleResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  @weekday %Schema{type: :string, format: :uuid}

  OpenApiSpex.schema(
    Shared.data_response(
      %Schema{
        title: "NutritionSchedule",
        type: :object,
        additionalProperties: false,
        properties: %{
          monday: @weekday,
          tuesday: @weekday,
          wednesday: @weekday,
          thursday: @weekday,
          friday: @weekday,
          saturday: @weekday,
          sunday: @weekday
        },
        required: [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
      },
      "NutritionScheduleResponse"
    )
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayMealCreateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionDayMealCreateRequest",
      type: :object,
      additionalProperties: false,
      description:
        "Places a meal on a day's slot. Give exactly one of `nutrition_meal_id` (place an existing " <>
          "meal of this plan) or `name` (create a new meal in the plan and place it).",
      properties: %{
        meal_slot: %Schema{type: :string, enum: ~w(breakfast morning_snack lunch afternoon_snack dinner evening_snack)},
        nutrition_meal_id: %Schema{type: :string, format: :uuid, nullable: true},
        name: %Schema{type: :string, maxLength: 255, nullable: true}
      },
      required: [:meal_slot]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionSlotOptionMoveRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionSlotOptionMoveRequest",
      type: :object,
      additionalProperties: false,
      description: "Re-slots and/or repositions a day meal. Omitted `position` appends to the target slot.",
      properties: %{
        meal_slot: %Schema{type: :string, enum: ~w(breakfast morning_snack lunch afternoon_snack dinner evening_snack)},
        position: %Schema{type: :integer, minimum: 0}
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealItemsCreateRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionMealItemRequest
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionMealItemsCreateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        items: %Schema{type: :array, items: NutritionMealItemRequest, minItems: 1}
      },
      required: [:items],
      example: %{
        "items" => [
          %{"food_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c", "weight_g" => 120}
        ]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealItemListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionMealItem
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionMealItemListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{type: :array, items: NutritionMealItem}},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanDayResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionPlanDay, Shared}

  OpenApiSpex.schema(Shared.data_response(NutritionPlanDay, "NutritionPlanDayResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayMealResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionDayMeal, Shared}

  OpenApiSpex.schema(Shared.data_response(NutritionDayMeal, "NutritionDayMealResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayMealWithMealResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionDayMealWithMeal, Shared}

  OpenApiSpex.schema(Shared.data_response(NutritionDayMealWithMeal, "NutritionDayMealWithMealResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionSwitchOptionRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionSwitchOptionRequest",
      type: :object,
      properties: %{
        date: %Schema{type: :string, format: :date},
        meal_slot: %Schema{type: :string, enum: ~w(breakfast morning_snack lunch afternoon_snack dinner evening_snack)},
        meal_id: %Schema{type: :string}
      },
      required: [:date, :meal_slot, :meal_id]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealLogResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionMealLogResponse",
    type: :object,
    properties: %{data: %Schema{type: :object, additionalProperties: true}}
  })
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
