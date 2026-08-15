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

  alias EasyWeb.OpenApi.Schemas.TrainingPrescriptionPlannedSetInput
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingWorkoutExerciseRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        exercise_id: %Schema{type: :string, format: :uuid},
        planned_sets: %Schema{type: :array, minItems: 1, items: TrainingPrescriptionPlannedSetInput}
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

defmodule EasyWeb.OpenApi.Schemas.TrainingPrescriptionPlannedSetInput do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPrescriptionPlannedSetInput",
      type: :object,
      additionalProperties: false,
      properties: %{
        set_type: %Schema{type: :string, enum: ["working", "warmup", "dropset"], nullable: true},
        reps: %Schema{type: :string, nullable: true},
        load_value: %Schema{type: :string, nullable: true},
        load_unit: %Schema{
          type: :string,
          enum: ["kg", "lbs", "bodyweight", "none"],
          nullable: true
        },
        duration_seconds: %Schema{type: :integer, minimum: 0, nullable: true},
        distance_value: %Schema{type: :string, nullable: true},
        distance_unit: %Schema{
          type: :string,
          enum: ["meters", "km", "miles", "none"],
          nullable: true
        },
        rpe: %Schema{type: :number, minimum: 1, maximum: 10, nullable: true},
        rest_seconds: %Schema{type: :integer, minimum: 0, nullable: true},
        notes: %Schema{type: :string, nullable: true}
      },
      example: %{"reps" => "8-10", "rest_seconds" => 90}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPrescriptionPositionInput do
  alias OpenApiSpex.Schema

  @max_position 2_147_483_647
  @position %Schema{type: :integer, minimum: 0, maximum: @max_position}

  @spec schema() :: Schema.t()
  def schema, do: @position
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPrescriptionExerciseInput do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{TrainingPrescriptionPlannedSetInput, TrainingPrescriptionPositionInput}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPrescriptionExerciseInput",
      type: :object,
      additionalProperties: false,
      description: "A persisted Prescribed Exercise uses id; a new one uses a request-local local_ref.",
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        local_ref: %Schema{type: :string, minLength: 1, maxLength: 100},
        exercise_id: %Schema{type: :string, format: :uuid},
        position: TrainingPrescriptionPositionInput.schema(),
        prescribed_sets: %Schema{type: :array, items: TrainingPrescriptionPlannedSetInput}
      },
      required: [:exercise_id, :position, :prescribed_sets]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPrescriptionWorkoutInput do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{TrainingPrescriptionExerciseInput, TrainingPrescriptionPositionInput}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPrescriptionWorkoutInput",
      type: :object,
      additionalProperties: false,
      description: "A persisted workout uses id; a new one uses a request-local local_ref.",
      properties: %{
        id: %Schema{type: :string, format: :uuid},
        local_ref: %Schema{type: :string, minLength: 1, maxLength: 100},
        name: %Schema{type: :string, maxLength: 255},
        position: TrainingPrescriptionPositionInput.schema(),
        prescribed_exercises: %Schema{type: :array, items: TrainingPrescriptionExerciseInput}
      },
      required: [:name, :position, :prescribed_exercises]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPrescriptionScheduleEntry do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPrescriptionScheduleEntry",
      type: :object,
      additionalProperties: false,
      description: "One weekday in the complete schedule. Omit both workout fields for rest; otherwise use exactly one persisted workout_id or request-local workout_ref.",
      properties: %{
        weekday: %Schema{type: :string, enum: Shared.days_of_week()},
        workout_id: %Schema{type: :string, format: :uuid},
        workout_ref: %Schema{type: :string, minLength: 1, maxLength: 100}
      },
      required: [:weekday]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPrescriptionReplaceRequest do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{
    TrainingPrescriptionScheduleEntry,
    TrainingPrescriptionWorkoutInput
  }

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPrescriptionReplaceRequest",
      type: :object,
      additionalProperties: false,
      description: "The authoritative ordered Prescription and complete Monday-Sunday Workout Schedule. Omitted persisted nodes are deleted atomically.",
      properties: %{
        expected_revision: %Schema{type: :integer, minimum: 1},
        workouts: %Schema{type: :array, items: TrainingPrescriptionWorkoutInput},
        schedule: %Schema{
          type: :array,
          minItems: 7,
          maxItems: 7,
          items: TrainingPrescriptionScheduleEntry
        }
      },
      required: [:expected_revision, :workouts, :schedule]
    },
    struct?: false
  )
end
