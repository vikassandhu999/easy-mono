defmodule EasyWeb.OpenApi.Schemas.WorkoutRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "WorkoutRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        notes: %Schema{type: :string, maxLength: 5000, nullable: true}
      },
      required: [:name],
      example: %{
        "name" => "Lower Body Strength",
        "notes" => "Main squat pattern day."
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "WorkoutUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        notes: %Schema{type: :string, maxLength: 5000, nullable: true}
      },
      example: %{
        "name" => "Updated Lower Body Strength"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutElementRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.TrainingPlanPlannedSet

  OpenApiSpex.schema(
    %{
      title: "WorkoutElementRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        position: %Schema{type: :integer, minimum: 0},
        superset_group_id: %Schema{type: :string, nullable: true},
        notes: %Schema{type: :string, maxLength: 5000, nullable: true},
        exercise_id: %Schema{type: :string, format: :uuid},
        planned_sets: %Schema{type: :array, minItems: 1, items: TrainingPlanPlannedSet}
      },
      required: [:position, :exercise_id, :planned_sets],
      example: %{
        "position" => 0,
        "exercise_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "planned_sets" => [%{"target_reps" => "8-10", "load_unit" => "kg"}]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.PlanItemRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "PlanItemRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        day: %Schema{
          type: :string,
          enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        },
        workout_type: %Schema{type: :string, enum: ["primary", "alternative"]},
        workout_id: %Schema{type: :string, format: :uuid}
      },
      required: [:day, :workout_type, :workout_id],
      example: %{
        "day" => "monday",
        "workout_type" => "primary",
        "workout_id" => "1b8248bc-4499-4a0c-986f-621fc95cbd0e"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingPlanWorkout

  OpenApiSpex.schema(%{
    title: "WorkoutResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: TrainingPlanWorkout},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingPlanWorkout
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WorkoutListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: TrainingPlanWorkout},
      count: %Schema{type: :integer, minimum: 0}
    },
    required: [:data, :count]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutElementResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingPlanWorkoutElement

  OpenApiSpex.schema(%{
    title: "WorkoutElementResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: TrainingPlanWorkoutElement},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanItemResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingPlanItem

  OpenApiSpex.schema(%{
    title: "TrainingPlanItemResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: TrainingPlanItem},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanItemListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingPlanItem
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanItemListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{type: :array, items: TrainingPlanItem}},
    required: [:data]
  })
end
