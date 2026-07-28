defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingWorkoutRequest",
      type: :object,
      additionalProperties: false,
      properties: %{name: %Schema{type: :string, maxLength: 255}},
      required: [:name],
      example: %{"name" => "Lower Body Strength"}
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
      properties: %{name: %Schema{type: :string, maxLength: 255}},
      example: %{"name" => "Updated Lower Body Strength"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutExerciseRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingPlanPlannedSet
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingWorkoutExerciseRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        exercise_id: %Schema{type: :string, format: :uuid},
        planned_sets: %Schema{type: :array, minItems: 1, items: TrainingPlanPlannedSet}
      },
      example: %{
        "exercise_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "planned_sets" => [%{"reps" => "8-10", "load_unit" => "kg"}]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutExercisesCreateRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingWorkoutExerciseRequest
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingWorkoutExercisesCreateRequest",
      type: :object,
      additionalProperties: false,
      description: "Appends exercises to a workout in one transaction, in the order given.",
      properties: %{
        exercises: %Schema{type: :array, minItems: 1, items: TrainingWorkoutExerciseRequest}
      },
      required: [:exercises],
      example: %{
        "exercises" => [
          %{
            "exercise_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
            "planned_sets" => [%{"reps" => "8-10", "load_unit" => "kg"}]
          }
        ]
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

defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutExerciseResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanWorkoutExercise}

  OpenApiSpex.schema(Shared.data_response(TrainingPlanWorkoutExercise, "TrainingWorkoutExerciseResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutReorderRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingWorkoutReorderRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        element_ids: %Schema{
          type: :array,
          minItems: 1,
          items: %Schema{type: :string, format: :uuid},
          description: "Workout element ids in the desired order (must be exactly the workout's elements)."
        }
      },
      required: [:element_ids],
      example: %{
        "element_ids" => [
          "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
          "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d"
        ]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingWorkoutExerciseArrayResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingPlanWorkoutExercise
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingWorkoutExerciseArrayResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{type: :array, items: TrainingPlanWorkoutExercise}},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingScheduleRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @weekday %Schema{type: :string, format: :uuid, nullable: true}

  OpenApiSpex.schema(
    %{
      title: "TrainingScheduleRequest",
      type: :object,
      additionalProperties: false,
      description:
        "The plan's full Mon..Sun map. Every weekday must be present; a null means a rest day, " <>
          "and every workout id must belong to this plan.",
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

defmodule EasyWeb.OpenApi.Schemas.TrainingSchedule do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @weekday %Schema{type: :string, format: :uuid, nullable: true}

  OpenApiSpex.schema(%{
    title: "TrainingSchedule",
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

defmodule EasyWeb.OpenApi.Schemas.TrainingScheduleResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingSchedule}

  OpenApiSpex.schema(Shared.data_response(TrainingSchedule, "TrainingScheduleResponse"))
end
