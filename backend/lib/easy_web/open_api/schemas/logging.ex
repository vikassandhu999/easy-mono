defmodule EasyWeb.OpenApi.Schemas.LogPlannedItemRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "LogPlannedItemRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        date: %Schema{type: :string, format: :date},
        meal_slot: %Schema{type: :string, enum: Easy.MealSlot.names()},
        meal_id: %Schema{type: :string, format: :uuid, nullable: true},
        planned_item_id: %Schema{type: :string, format: :uuid},
        amount: %Schema{type: :number, nullable: true},
        unit: %Schema{type: :string, nullable: true},
        weight_g: %Schema{type: :number, nullable: true}
      },
      required: [:date, :meal_slot, :planned_item_id],
      example: %{
        "date" => "2026-05-31",
        "meal_slot" => "breakfast",
        "planned_item_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "weight_g" => 100
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.AddExtraRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "AddExtraRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        date: %Schema{type: :string, format: :date},
        meal_slot: %Schema{type: :string, enum: Easy.MealSlot.names()},
        meal_id: %Schema{type: :string, format: :uuid, nullable: true},
        food_id: %Schema{type: :string, format: :uuid, nullable: true},
        recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
        amount: %Schema{type: :number, nullable: true},
        unit: %Schema{type: :string, nullable: true},
        weight_g: %Schema{type: :number, nullable: true},
        notes: %Schema{type: :string, nullable: true}
      },
      required: [:date, :meal_slot],
      example: %{
        "date" => "2026-05-31",
        "meal_slot" => "breakfast",
        "food_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "weight_g" => 80
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ReplaceItemRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ReplaceItemRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        date: %Schema{type: :string, format: :date},
        meal_slot: %Schema{type: :string, enum: Easy.MealSlot.names()},
        meal_id: %Schema{type: :string, format: :uuid, nullable: true},
        planned_item_id: %Schema{type: :string, format: :uuid},
        food_id: %Schema{type: :string, format: :uuid, nullable: true},
        recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
        amount: %Schema{type: :number, nullable: true},
        unit: %Schema{type: :string, nullable: true},
        weight_g: %Schema{type: :number, nullable: true}
      },
      required: [:date, :meal_slot, :planned_item_id],
      example: %{
        "date" => "2026-05-31",
        "meal_slot" => "breakfast",
        "planned_item_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "food_id" => "a1b2c3d4-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "weight_g" => 120
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.LogMealRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "LogMealRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        date: %Schema{type: :string, format: :date},
        meal_slot: %Schema{type: :string, enum: Easy.MealSlot.names()},
        meal_id: %Schema{type: :string, format: :uuid}
      },
      required: [:date, :meal_slot, :meal_id],
      example: %{
        "date" => "2026-05-31",
        "meal_slot" => "breakfast",
        "meal_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.LogDayRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "LogDayRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        date: %Schema{type: :string, format: :date},
        plan_id: %Schema{type: :string, format: :uuid}
      },
      required: [:date, :plan_id],
      example: %{
        "date" => "2026-05-31",
        "plan_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.UpdatePortionRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "UpdatePortionRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        amount: %Schema{type: :number, nullable: true},
        unit: %Schema{type: :string, nullable: true},
        weight_g: %Schema{type: :number, nullable: true},
        notes: %Schema{type: :string, nullable: true}
      },
      example: %{"weight_g" => 150}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.FoodLogEntry do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "FoodLogEntry",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          food_name: %Schema{type: :string, nullable: true},
          amount: %Schema{type: :number, nullable: true},
          unit: %Schema{type: :string, nullable: true},
          weight_g: %Schema{type: :number, nullable: true},
          calories: %Schema{type: :number, nullable: true},
          protein_g: %Schema{type: :number, nullable: true},
          carbs_g: %Schema{type: :number, nullable: true},
          fat_g: %Schema{type: :number, nullable: true},
          fiber_g: %Schema{type: :number, nullable: true},
          notes: %Schema{type: :string, nullable: true},
          planned_item_id: %Schema{type: :string, format: :uuid, nullable: true},
          food_id: %Schema{type: :string, format: :uuid, nullable: true},
          recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
          nutrition_meal_log_id: %Schema{type: :string, format: :uuid}
        },
        Shared.timestamps()
      ),
    required: [:id, :food_name, :amount, :unit, :weight_g, :nutrition_meal_log_id, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.MealLogPlannedItem do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "MealLogPlannedItem",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid, nullable: true},
      food_id: %Schema{type: :string, format: :uuid, nullable: true},
      recipe_id: %Schema{type: :string, format: :uuid, nullable: true},
      food_name: %Schema{type: :string, nullable: true},
      amount: %Schema{type: :number, nullable: true},
      unit: %Schema{type: :string, nullable: true},
      weight_g: %Schema{type: :number, nullable: true},
      calories: %Schema{type: :number, nullable: true},
      protein_g: %Schema{type: :number, nullable: true},
      carbs_g: %Schema{type: :number, nullable: true},
      fat_g: %Schema{type: :number, nullable: true},
      fiber_g: %Schema{type: :number, nullable: true}
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.MealLogDiaryRow do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{FoodLogEntry, MealLogPlannedItem}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "MealLogDiaryRow",
    type: :object,
    additionalProperties: false,
    properties: %{
      status: %Schema{
        type: :string,
        enum: ["as_planned", "swapped", "skipped", "added"]
      },
      planned: %Schema{allOf: [MealLogPlannedItem], nullable: true},
      entry: %Schema{allOf: [FoodLogEntry], nullable: true}
    },
    required: [:status]
  })
end

defmodule EasyWeb.OpenApi.Schemas.MealLog do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{FoodLogEntry, MealLogDiaryRow, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "MealLog",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          date: %Schema{type: :string, format: :date},
          meal_slot: %Schema{type: :string},
          planned_snapshot: %Schema{type: :object, additionalProperties: true, nullable: true},
          planned_calories: %Schema{type: :number, nullable: true},
          logged_calories: %Schema{type: :number, nullable: true},
          client_id: %Schema{type: :string, format: :uuid, nullable: true},
          food_log_entries: %Schema{type: :array, items: FoodLogEntry},
          rows: %Schema{type: :array, items: MealLogDiaryRow}
        },
        Shared.timestamps()
      ),
    required: [:id, :date, :meal_slot, :food_log_entries, :rows, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.MealLogListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{MealLog, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: MealLog}, "MealLogListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.FoodLogEntryResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{FoodLogEntry, Shared}

  OpenApiSpex.schema(Shared.data_response(FoodLogEntry, "FoodLogEntryResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.FoodLogEntryListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{FoodLogEntry, Shared}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: FoodLogEntry}, "FoodLogEntryListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.WeightEntryRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "WeightEntryRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        date: %Schema{type: :string, format: :date},
        value: %Schema{type: :number},
        unit: %Schema{type: :string, enum: ["kg", "lbs"]},
        note: %Schema{type: :string, nullable: true}
      },
      required: [:date, :value, :unit],
      example: %{"date" => "2026-05-31", "value" => 180.5, "unit" => "lbs"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.WeightEntry do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WeightEntry",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      date: %Schema{type: :string, format: :date},
      value: %Schema{type: :number},
      unit: %Schema{type: :string, enum: ["kg", "lbs"]},
      note: %Schema{type: :string, nullable: true},
      form_submission_id: %Schema{type: :string, format: :uuid, nullable: true},
      inserted_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:id, :date, :value, :unit, :note, :form_submission_id, :inserted_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WeightEntryResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, WeightEntry}

  OpenApiSpex.schema(Shared.data_response(WeightEntry, "WeightEntryResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.WeightEntryListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.WeightEntry
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WeightEntryListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      entries: %Schema{type: :array, items: WeightEntry},
      goal: %Schema{type: :object, additionalProperties: true, nullable: true},
      summary: %Schema{type: :object, additionalProperties: true},
      adherence: %Schema{type: :object, additionalProperties: true, nullable: true}
    },
    required: [:entries, :goal, :summary]
  })
end
