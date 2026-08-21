defmodule EasyWeb.OpenApi.Schemas.NutritionPlanCreateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanCreateRequest",
      description: "Request body for creating a reusable Nutrition Template.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, maxLength: 5000, nullable: true},
        target_calories: %Schema{type: :number, minimum: 0, nullable: true},
        target_protein_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_carbs_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_fat_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_fiber_g: %Schema{type: :number, minimum: 0, nullable: true}
      },
      required: [:name],
      example: %{
        "name" => "Cut Block",
        "description" => "Reusable cutting Template.",
        "target_calories" => 2000,
        "target_protein_g" => 150
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanUpdateRequest",
      description: "Revisioned metadata and nutrient targets. Client Nutrition Plans also accept Coverage dates.",
      type: :object,
      additionalProperties: false,
      properties: %{
        expected_revision: %Schema{type: :integer, minimum: 1},
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, maxLength: 5000, nullable: true},
        target_calories: %Schema{type: :number, minimum: 0, nullable: true},
        target_protein_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_carbs_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_fat_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_fiber_g: %Schema{type: :number, minimum: 0, nullable: true},
        start_date: %Schema{type: :string, format: :date, nullable: true},
        end_date: %Schema{type: :string, format: :date, nullable: true}
      },
      required: [:expected_revision],
      example: %{
        "expected_revision" => 3,
        "name" => "Updated Cut Block",
        "target_calories" => 1800
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanRevisionRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanRevisionRequest",
      description: "Optimistic revision required by an explicit Nutrition Template or Client Plan lifecycle command.",
      type: :object,
      additionalProperties: false,
      properties: %{
        expected_revision: %Schema{type: :integer, minimum: 1}
      },
      required: [:expected_revision],
      example: %{"expected_revision" => 3}
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
      description: "Assigns an unarchived Nutrition Template to a visible client at the expected source revision.",
      type: :object,
      additionalProperties: false,
      properties: %{
        expected_revision: %Schema{type: :integer, minimum: 1},
        start_date: %Schema{type: :string, format: :date, nullable: true},
        end_date: %Schema{type: :string, format: :date, nullable: true}
      },
      required: [:expected_revision],
      example: %{"expected_revision" => 3, "start_date" => "2026-09-01", "end_date" => nil}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanClient do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionPlanClient",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      first_name: %Schema{type: :string, nullable: true},
      last_name: %Schema{type: :string, nullable: true}
    },
    required: [:id, :first_name, :last_name]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionWeekSchedule do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @weekday %Schema{type: :string, format: :uuid, nullable: true}

  OpenApiSpex.schema(%{
    title: "NutritionWeekSchedule",
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
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionWeekScheduleInput do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @weekday %Schema{
    type: :string,
    minLength: 1,
    maxLength: 100,
    description: "A persisted Day Pattern id or a request-local local_ref from this Menu."
  }

  OpenApiSpex.schema(
    %{
      title: "NutritionWeekScheduleInput",
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
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealOption do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionMealOption",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          position: %Schema{type: :integer, minimum: 0},
          nutrition_meal_id: %Schema{type: :string, format: :uuid}
        },
        Shared.timestamps()
      ),
    required: [:id, :position, :nutrition_meal_id, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayPatternSlot do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionMealOption
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayPatternSlot",
    type: :object,
    additionalProperties: false,
    properties: %{
      meal_slot: %Schema{type: :string, enum: Easy.Nutrition.MealSlot.names()},
      options: %Schema{type: :array, minItems: 1, items: NutritionMealOption}
    },
    required: [:meal_slot, :options]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayPattern do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionDayPatternSlot, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayPattern",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          position: %Schema{type: :integer, minimum: 0},
          weekdays: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.days_of_week()}},
          slots: %Schema{type: :array, items: NutritionDayPatternSlot},
          nutrition_plan_id: %Schema{type: :string, format: :uuid}
        },
        Shared.timestamps()
      ),
    required: [:id, :name, :position, :weekdays, :slots, :nutrition_plan_id, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPortion do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionPortion",
    description: "A gram or serving Portion. Food servings retain display values and resolved grams.",
    type: :object,
    additionalProperties: false,
    properties: %{
      kind: %Schema{type: :string, enum: ["gram", "serving"]},
      grams: %Schema{type: :number, exclusiveMinimum: true, minimum: 0, nullable: true},
      amount: %Schema{type: :number, exclusiveMinimum: true, minimum: 0, nullable: true},
      unit: %Schema{type: :string, nullable: true},
      label: %Schema{type: :string, nullable: true}
    },
    required: [:kind, :grams, :amount, :unit, :label]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPortionInput do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPortionInput",
      type: :object,
      additionalProperties: false,
      properties: %{
        kind: %Schema{type: :string, enum: ["gram", "serving"]},
        grams: %Schema{type: :number, exclusiveMinimum: true, minimum: 0, nullable: true},
        amount: %Schema{type: :number, exclusiveMinimum: true, minimum: 0, nullable: true},
        unit: %Schema{type: :string, nullable: true},
        label: %Schema{type: :string, nullable: true}
      },
      required: [:kind]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealItemInput do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionPortionInput
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionMealItemInput",
      description: "A persisted Menu Item uses id; a new one uses a request-local local_ref.",
      type: :object,
      additionalProperties: false,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        local_ref: %Schema{type: :string, minLength: 1, maxLength: 100},
        kind: %Schema{type: :string, enum: ["food", "recipe"]},
        food_id: %Schema{type: :string, format: :uuid, nullable: true},
        recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
        position: %Schema{type: :integer, minimum: 0, maximum: 2_147_483_647},
        portion: NutritionPortionInput
      },
      required: [:kind, :position, :portion]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealInput do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionMealItemInput
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionMealInput",
      description: "A persisted Meal uses id; a new one uses a request-local local_ref.",
      type: :object,
      additionalProperties: false,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        local_ref: %Schema{type: :string, minLength: 1, maxLength: 100},
        name: %Schema{type: :string, maxLength: 255},
        notes: %Schema{type: :string, nullable: true},
        position: %Schema{type: :integer, minimum: 0, maximum: 2_147_483_647},
        meal_items: %Schema{type: :array, items: NutritionMealItemInput}
      },
      required: [:name, :position, :meal_items]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealOptionInput do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionMealOptionInput",
      description: "A persisted Meal Option uses id; a new one uses a request-local local_ref. The Meal is a persisted id or a meal_local_ref from this Menu.",
      type: :object,
      additionalProperties: false,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        local_ref: %Schema{type: :string, minLength: 1, maxLength: 100},
        nutrition_meal_id: %Schema{type: :string, format: :uuid},
        meal_local_ref: %Schema{type: :string, minLength: 1, maxLength: 100},
        position: %Schema{type: :integer, minimum: 0, maximum: 2_147_483_647}
      },
      required: [:position]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayPatternSlotInput do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionMealOptionInput
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionDayPatternSlotInput",
      type: :object,
      additionalProperties: false,
      properties: %{
        meal_slot: %Schema{type: :string, enum: Easy.Nutrition.MealSlot.names()},
        options: %Schema{type: :array, minItems: 1, items: NutritionMealOptionInput}
      },
      required: [:meal_slot, :options]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayPatternInput do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.NutritionDayPatternSlotInput
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionDayPatternInput",
      description: "A persisted Day Pattern uses id; a new one uses a request-local local_ref. Omitted persisted patterns are deleted.",
      type: :object,
      additionalProperties: false,
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        local_ref: %Schema{type: :string, minLength: 1, maxLength: 100},
        name: %Schema{type: :string, maxLength: 255},
        position: %Schema{type: :integer, minimum: 0, maximum: 2_147_483_647},
        slots: %Schema{type: :array, items: NutritionDayPatternSlotInput}
      },
      required: [:name, :position, :slots]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMenuReplaceRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionDayPatternInput, NutritionMealInput, NutritionWeekScheduleInput}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionMenuReplaceRequest",
      description: "Authoritative Meals, Day Patterns, Meal Options, and Week Schedule for one plan revision. Omitted persisted nodes are deleted atomically.",
      type: :object,
      additionalProperties: false,
      properties: %{
        expected_revision: %Schema{type: :integer, minimum: 1},
        meals: %Schema{type: :array, items: NutritionMealInput},
        day_patterns: %Schema{type: :array, minItems: 1, items: NutritionDayPatternInput},
        schedule: NutritionWeekScheduleInput
      },
      required: [:expected_revision, :meals, :day_patterns, :schedule],
      example: %{
        "expected_revision" => 1,
        "meals" => [
          %{
            "local_ref" => "breakfast",
            "name" => "Breakfast",
            "position" => 0,
            "meal_items" => [
              %{
                "local_ref" => "yogurt",
                "kind" => "food",
                "food_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
                "position" => 0,
                "portion" => %{"kind" => "gram", "grams" => 50}
              }
            ]
          }
        ],
        "day_patterns" => [
          %{
            "local_ref" => "everyday",
            "name" => "Everyday",
            "position" => 0,
            "slots" => [
              %{
                "meal_slot" => "breakfast",
                "options" => [%{"local_ref" => "default", "meal_local_ref" => "breakfast", "position" => 0}]
              }
            ]
          }
        ],
        "schedule" => %{
          "monday" => "everyday",
          "tuesday" => "everyday",
          "wednesday" => "everyday",
          "thursday" => "everyday",
          "friday" => "everyday",
          "saturday" => "everyday",
          "sunday" => "everyday"
        }
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMealItem do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutrientTotals, NutritionPortion, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionMealItem",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          kind: %Schema{type: :string, enum: ["food", "recipe"]},
          name: %Schema{type: :string, nullable: true},
          food_id: %Schema{type: :string, format: :uuid, nullable: true},
          recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
          position: %Schema{type: :integer, minimum: 0},
          portion: NutritionPortion,
          nutrients: NutrientTotals,
          nutrition_meal_id: %Schema{type: :string, format: :uuid}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :kind,
      :name,
      :food_id,
      :recipe_id,
      :position,
      :portion,
      :nutrients,
      :nutrition_meal_id,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionMeal do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutrientTotals, NutritionMealItem, Shared}
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
          position: %Schema{type: :integer, minimum: 0},
          nutrition_plan_id: %Schema{type: :string, format: :uuid},
          nutrients: NutrientTotals,
          meal_items: %Schema{type: :array, items: NutritionMealItem}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :name,
      :notes,
      :position,
      :nutrition_plan_id,
      :nutrients,
      :meal_items,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlan do
  require OpenApiSpex

  alias Easy.Nutrition.Plan, as: DomainPlan

  alias EasyWeb.OpenApi.Schemas.{
    NutritionDayPattern,
    NutritionMeal,
    NutritionPlanClient,
    NutritionWeekSchedule,
    Shared
  }

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionPlan",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          kind: %Schema{type: :string, enum: ["template", "client_plan"]},
          name: %Schema{type: :string},
          description: %Schema{type: :string, nullable: true},
          revision: %Schema{type: :integer, minimum: 1},
          archived_at: %Schema{type: :string, format: :"date-time", nullable: true},
          status: %Schema{type: :string, enum: ["active", "archived"]},
          lifecycle: %Schema{
            type: :string,
            enum: Enum.map(DomainPlan.lifecycles(), &Atom.to_string/1),
            nullable: true
          },
          assigned_client_count: %Schema{type: :integer, minimum: 0},
          target_calories: %Schema{type: :number, nullable: true},
          target_protein_g: %Schema{type: :number, nullable: true},
          target_carbs_g: %Schema{type: :number, nullable: true},
          target_fat_g: %Schema{type: :number, nullable: true},
          target_fiber_g: %Schema{type: :number, nullable: true},
          start_date: %Schema{type: :string, format: :date, nullable: true},
          end_date: %Schema{type: :string, format: :date, nullable: true},
          client_id: %Schema{type: :string, format: :uuid, nullable: true},
          client: %Schema{allOf: [NutritionPlanClient], nullable: true},
          creator_id: %Schema{type: :string, format: :uuid, nullable: true},
          source_template_id: %Schema{type: :string, format: :uuid, nullable: true},
          meals: %Schema{type: :array, items: NutritionMeal},
          day_patterns: %Schema{type: :array, items: NutritionDayPattern},
          schedule: NutritionWeekSchedule
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :kind,
      :name,
      :description,
      :revision,
      :archived_at,
      :status,
      :lifecycle,
      :assigned_client_count,
      :target_calories,
      :target_protein_g,
      :target_carbs_g,
      :target_fat_g,
      :target_fiber_g,
      :start_date,
      :end_date,
      :client_id,
      :client,
      :creator_id,
      :source_template_id,
      :meals,
      :day_patterns,
      :schedule,
      :inserted_at,
      :updated_at
    ],
    example: %{
      "id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
      "kind" => "template",
      "name" => "Cut Block",
      "description" => "Reusable cutting Template.",
      "revision" => 1,
      "archived_at" => nil,
      "status" => "active",
      "lifecycle" => nil,
      "assigned_client_count" => 0,
      "target_calories" => 2000,
      "target_protein_g" => 150,
      "target_carbs_g" => 200,
      "target_fat_g" => 60,
      "target_fiber_g" => 30,
      "start_date" => nil,
      "end_date" => nil,
      "client_id" => nil,
      "client" => nil,
      "creator_id" => "c8e8fe38-d9cc-4506-9514-8527a8b56d68",
      "source_template_id" => nil,
      "meals" => [],
      "day_patterns" => [
        %{
          "id" => "7c1d3e4a-2b0f-4d55-9a1c-8e6f0b2c4d11",
          "name" => "Everyday",
          "position" => 0,
          "weekdays" => ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
          "slots" => [],
          "nutrition_plan_id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
          "inserted_at" => "2026-05-30T12:00:00Z",
          "updated_at" => "2026-05-30T12:00:00Z"
        }
      ],
      "schedule" => %{
        "monday" => "7c1d3e4a-2b0f-4d55-9a1c-8e6f0b2c4d11",
        "tuesday" => "7c1d3e4a-2b0f-4d55-9a1c-8e6f0b2c4d11",
        "wednesday" => "7c1d3e4a-2b0f-4d55-9a1c-8e6f0b2c4d11",
        "thursday" => "7c1d3e4a-2b0f-4d55-9a1c-8e6f0b2c4d11",
        "friday" => "7c1d3e4a-2b0f-4d55-9a1c-8e6f0b2c4d11",
        "saturday" => "7c1d3e4a-2b0f-4d55-9a1c-8e6f0b2c4d11",
        "sunday" => "7c1d3e4a-2b0f-4d55-9a1c-8e6f0b2c4d11"
      },
      "inserted_at" => "2026-05-30T12:00:00Z",
      "updated_at" => "2026-05-30T12:00:00Z"
    }
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
