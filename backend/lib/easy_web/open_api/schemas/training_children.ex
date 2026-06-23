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
        "planned_sets" => [%{"reps" => "8-10", "load_unit" => "kg"}]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.PlanItemRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "PlanItemRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        day_of_week: %Schema{
          type: :string,
          enum: Shared.days_of_week()
        },
        training_workout_id: %Schema{type: :string, format: :uuid}
      },
      required: [:day_of_week, :training_workout_id],
      example: %{
        "day_of_week" => "monday",
        "training_workout_id" => "1b8248bc-4499-4a0c-986f-621fc95cbd0e"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanWorkout}

  OpenApiSpex.schema(Shared.data_response(TrainingPlanWorkout, "WorkoutResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanWorkout}

  OpenApiSpex.schema(Shared.list_response(TrainingPlanWorkout, "WorkoutListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutElementResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanWorkoutElement}

  OpenApiSpex.schema(Shared.data_response(TrainingPlanWorkoutElement, "WorkoutElementResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanItemResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanItem}

  OpenApiSpex.schema(Shared.data_response(TrainingPlanItem, "TrainingPlanItemResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanItemListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanItem}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: TrainingPlanItem}, "TrainingPlanItemListResponse"))
end
