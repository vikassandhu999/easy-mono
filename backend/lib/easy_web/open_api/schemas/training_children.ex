defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingWorkoutRequest",
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

defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingWorkoutUpdateRequest",
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

defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutExerciseRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.TrainingPlanPlannedSet

  OpenApiSpex.schema(
    %{
      title: "TrainingWorkoutExerciseRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        position: %Schema{type: :integer, minimum: 0},
        superset_group_id: %Schema{type: :string, nullable: true},
        notes: %Schema{type: :string, maxLength: 5000, nullable: true},
        exercise_id: %Schema{type: :string, format: :uuid},
        planned_sets: %Schema{type: :array, minItems: 1, items: TrainingPlanPlannedSet}
      },
      example: %{
        "position" => 0,
        "exercise_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "planned_sets" => [%{"reps" => "8-10", "load_unit" => "kg"}]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanWorkout}

  OpenApiSpex.schema(Shared.data_response(TrainingPlanWorkout, "TrainingWorkoutResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanWorkout}

  OpenApiSpex.schema(Shared.list_response(TrainingPlanWorkout, "TrainingWorkoutListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutExerciseResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanWorkoutExercise}

  OpenApiSpex.schema(Shared.data_response(TrainingPlanWorkoutExercise, "TrainingWorkoutExerciseResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TrainingScheduleEntry do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  OpenApiSpex.schema(%{
    title: "TrainingScheduleEntry",
    type: :object,
    properties: %{
      id: %Schema{type: :string},
      day_of_week: %Schema{type: :string},
      training_workout_id: %Schema{type: :string, nullable: true},
      workout_name: %Schema{type: :string, nullable: true}
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingDayScheduleRequest do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  OpenApiSpex.schema(%{
    title: "TrainingDayScheduleRequest",
    type: :object,
    additionalProperties: false,
    properties: %{training_workout_id: %Schema{type: :string, nullable: true}}
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingScheduleResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.TrainingScheduleEntry
  OpenApiSpex.schema(%{
    title: "TrainingScheduleResponse",
    type: :object,
    properties: %{data: %Schema{type: :object, additionalProperties: TrainingScheduleEntry}}
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingScheduleDayResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.TrainingScheduleEntry
  OpenApiSpex.schema(%{
    title: "TrainingScheduleDayResponse",
    type: :object,
    properties: %{data: %Schema{type: :object, nullable: true, allOf: [TrainingScheduleEntry]}}
  })
end
