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
        weight_g: %Schema{type: :number, exclusiveMinimum: true, minimum: 0},
        position: %Schema{type: :integer, minimum: 0}
      },
      required: [:food_id, :weight_g]
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
      weight_g: %Schema{type: :number, exclusiveMinimum: true, minimum: 0},
      position: %Schema{type: :integer, minimum: 0}
    },
    required: [:food_id, :food, :weight_g, :position]
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
        servings_count: %Schema{type: :integer, minimum: 1},
        cooked_weight_g: %Schema{type: :number, nullable: true, exclusiveMinimum: true, minimum: 0},
        allergens: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.allergens()}},
        dietary_tags: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.dietary_tags()}},
        recipe_ingredients: %Schema{type: :array, items: RecipeIngredientRequest}
      },
      required: [:name, :servings_count],
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

defmodule EasyWeb.OpenApi.Schemas.RecipeUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  alias EasyWeb.OpenApi.Schemas.{
    RecipeIngredientRequest,
    Shared
  }

  OpenApiSpex.schema(
    %{
      title: "RecipeUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, nullable: true},
        instructions: %Schema{type: :string, nullable: true},
        servings_count: %Schema{type: :integer, minimum: 1},
        cooked_weight_g: %Schema{type: :number, nullable: true, exclusiveMinimum: true, minimum: 0},
        expected_revision: %Schema{type: :integer, minimum: 1},
        allergens: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.allergens()}},
        dietary_tags: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.dietary_tags()}},
        recipe_ingredients: %Schema{type: :array, items: RecipeIngredientRequest}
      },
      required: [:expected_revision],
      example: %{
        "expected_revision" => 1,
        "name" => "Turkey Rice Bowl",
        "servings_count" => 4
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.Recipe do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  alias EasyWeb.OpenApi.Schemas.{
    NutrientTotals,
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
          servings_count: %Schema{type: :integer, minimum: 1},
          cooked_weight_g: %Schema{type: :number, nullable: true, exclusiveMinimum: true, minimum: 0},
          revision: %Schema{type: :integer, minimum: 1},
          allergens: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.allergens()}},
          dietary_tags: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.dietary_tags()}},
          nutrients: NutrientTotals,
          recipe_ingredients: %Schema{type: :array, items: RecipeIngredient},
          creator_id: %Schema{type: :string, format: :uuid, nullable: true}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :name,
      :servings_count,
      :revision,
      :nutrients,
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
      additionalProperties: false,
      properties: %{
        date: %Schema{type: :string, format: :date},
        meal_slot: %Schema{type: :string, enum: Easy.MealSlot.names()},
        meal_id: %Schema{type: :string, format: :uuid}
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

defmodule EasyWeb.OpenApi.Schemas.NutritionDayTargets do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayTargets",
    type: :object,
    additionalProperties: false,
    properties: %{
      calories: %Schema{type: :number, nullable: true},
      protein_g: %Schema{type: :number, nullable: true},
      carbs_g: %Schema{type: :number, nullable: true},
      fat_g: %Schema{type: :number, nullable: true},
      fiber_g: %Schema{type: :number, nullable: true}
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayOptionItem do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutrientTotals, NutritionPortion}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayOptionItem",
    type: :object,
    additionalProperties: false,
    properties: %{
      meal_item_id: %Schema{type: :string, format: :uuid},
      kind: %Schema{type: :string, enum: ["food", "recipe"]},
      name: %Schema{type: :string, nullable: true},
      food_id: %Schema{type: :string, format: :uuid, nullable: true},
      recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
      position: %Schema{type: :integer},
      portion: NutritionPortion,
      nutrients: NutrientTotals
    },
    required: [:meal_item_id, :kind, :name, :position, :portion, :nutrients]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayOption do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionDayOptionItem
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayOption",
    type: :object,
    additionalProperties: false,
    properties: %{
      meal_id: %Schema{type: :string, format: :uuid, nullable: true},
      meal_name: %Schema{type: :string, nullable: true},
      position: %Schema{type: :integer},
      items: %Schema{type: :array, items: NutritionDayOptionItem}
    },
    required: [:meal_id, :items]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayEntry do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutrientTotals, NutritionPortion, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayEntry",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          kind: %Schema{type: :string, enum: ["food", "recipe"]},
          name: %Schema{type: :string},
          food_id: %Schema{type: :string, format: :uuid, nullable: true},
          recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
          portion: NutritionPortion,
          nutrients: NutrientTotals,
          notes: %Schema{type: :string, nullable: true},
          revision: %Schema{type: :integer, minimum: 1}
        },
        Shared.timestamps()
      ),
    required: [:id, :kind, :name, :portion, :nutrients, :revision, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayRow do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionDayEntry, NutritionDayOptionItem}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayRow",
    type: :object,
    additionalProperties: false,
    properties: %{
      status: %Schema{
        type: :string,
        enum: ["as_planned", "swapped", "pending", "skipped", "added", "recorded"]
      },
      planned: %Schema{allOf: [NutritionDayOptionItem], nullable: true},
      entry: %Schema{allOf: [NutritionDayEntry], nullable: true}
    },
    required: [:status]
  })
end

defmodule EasyWeb.OpenApi.Schemas.DiaryAddExtraRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionPortionInput
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "DiaryAddExtraRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        meal_slot: %Schema{type: :string, enum: Easy.Nutrition.MealSlot.names()},
        food_id: %Schema{type: :string, format: :uuid, nullable: true},
        recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
        portion: NutritionPortionInput,
        notes: %Schema{type: :string, nullable: true}
      },
      required: [:meal_slot, :portion],
      example: %{
        "meal_slot" => "breakfast",
        "food_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "portion" => %{"kind" => "gram", "grams" => 80}
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDaySlot do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionDayOption, NutritionDayRow}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDaySlot",
    type: :object,
    additionalProperties: false,
    properties: %{
      meal_slot: %Schema{type: :string, enum: Easy.Nutrition.MealSlot.names()},
      meal_id: %Schema{type: :string, format: :uuid, nullable: true},
      planned_calories: %Schema{type: :number, nullable: true},
      logged_calories: %Schema{type: :number, nullable: true},
      options: %Schema{type: :array, items: NutritionDayOption},
      rows: %Schema{type: :array, items: NutritionDayRow}
    },
    required: [:meal_slot, :options, :rows]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDay do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionDaySlot, NutritionDayTargets}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDay",
    type: :object,
    additionalProperties: false,
    properties: %{
      date: %Schema{type: :string, format: :date},
      plan_id: %Schema{type: :string, format: :uuid, nullable: true},
      write_eligible: %Schema{type: :boolean},
      targets: NutritionDayTargets,
      slots: %Schema{type: :array, items: NutritionDaySlot}
    },
    required: [:date, :write_eligible, :targets, :slots]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionDay

  OpenApiSpex.schema(%{
    title: "NutritionDayResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: NutritionDay},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionDay
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{type: :array, items: NutritionDay}},
    required: [:data]
  })
end
