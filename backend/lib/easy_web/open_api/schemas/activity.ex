defmodule EasyWeb.OpenApi.Schemas.PerformedSetRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "PerformedSetRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        position: %Schema{type: :integer, minimum: 0},
        actual_reps: %Schema{type: :string, nullable: true},
        load_value: %Schema{type: :number, nullable: true},
        load_unit: %Schema{type: :string, enum: ["kg", "lbs", "bodyweight", "percent_1rm", "rpe", "none"]},
        intensity_felt: %Schema{type: :string, nullable: true},
        rpe: %Schema{type: :number, minimum: 1, maximum: 10, nullable: true},
        rir: %Schema{type: :integer, minimum: 0, nullable: true},
        duration_seconds: %Schema{type: :integer, minimum: 0, nullable: true},
        distance_value: %Schema{type: :number, nullable: true},
        distance_unit: %Schema{type: :string, enum: ["meters", "km", "miles", "yards", "none"]},
        tempo_actual: %Schema{type: :string, nullable: true},
        completed: %Schema{type: :boolean},
        notes: %Schema{type: :string, maxLength: 5000, nullable: true},
        exercise_id: %Schema{type: :string, format: :uuid},
        workout_element_id: %Schema{type: :string, format: :uuid, nullable: true}
      },
      required: [:position, :exercise_id],
      example: %{
        "position" => 0,
        "exercise_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "actual_reps" => "10",
        "load_value" => 80,
        "load_unit" => "kg",
        "completed" => true
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.PerformedSet do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.TrainingPlanExercise

  OpenApiSpex.schema(%{
    title: "PerformedSet",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      position: %Schema{type: :integer},
      actual_reps: %Schema{type: :string, nullable: true},
      load_value: %Schema{type: :number, nullable: true},
      load_unit: %Schema{type: :string, nullable: true},
      intensity_felt: %Schema{type: :string, nullable: true},
      rpe: %Schema{type: :number, nullable: true},
      rir: %Schema{type: :integer, nullable: true},
      duration_seconds: %Schema{type: :integer, nullable: true},
      distance_value: %Schema{type: :number, nullable: true},
      distance_unit: %Schema{type: :string, nullable: true},
      tempo_actual: %Schema{type: :string, nullable: true},
      completed: %Schema{type: :boolean},
      notes: %Schema{type: :string, nullable: true},
      exercise_id: %Schema{type: :string, format: :uuid},
      workout_element_id: %Schema{type: :string, format: :uuid, nullable: true},
      workout_session_id: %Schema{type: :string, format: :uuid, nullable: true},
      exercise: %Schema{allOf: [TrainingPlanExercise], nullable: true},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [
      :id,
      :position,
      :actual_reps,
      :load_value,
      :load_unit,
      :completed,
      :exercise_id,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutSessionRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "WorkoutSessionRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        client_id: %Schema{type: :string, format: :uuid},
        workout_id: %Schema{type: :string, format: :uuid, nullable: true},
        soreness_rating: %Schema{type: :integer, minimum: 1, maximum: 5, nullable: true},
        notes: %Schema{type: :string, maxLength: 5000, nullable: true}
      },
      example: %{
        "client_id" => "0ac4b3bc-e0b6-44ea-ae7a-f48deac42912",
        "workout_id" => "1b8248bc-4499-4a0c-986f-621fc95cbd0e"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutSessionCompleteRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "WorkoutSessionCompleteRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        soreness_rating: %Schema{type: :integer, minimum: 1, maximum: 5, nullable: true},
        notes: %Schema{type: :string, maxLength: 5000, nullable: true}
      },
      example: %{"soreness_rating" => 3, "notes" => "Felt strong."}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutSession do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.PerformedSet

  OpenApiSpex.schema(%{
    title: "WorkoutSession",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      started_at: %Schema{type: :string, format: :"date-time"},
      ended_at: %Schema{type: :string, format: :"date-time", nullable: true},
      state: %Schema{type: :string, enum: ["active", "completed", "discarded"]},
      soreness_rating: %Schema{type: :integer, nullable: true},
      notes: %Schema{type: :string, nullable: true},
      client_id: %Schema{type: :string, format: :uuid, nullable: true},
      workout_id: %Schema{type: :string, format: :uuid, nullable: true},
      planned_snapshot: %Schema{type: :object, additionalProperties: true, nullable: true},
      performed_sets: %Schema{type: :array, items: PerformedSet},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:id, :started_at, :ended_at, :state, :performed_sets, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutSessionResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.WorkoutSession

  OpenApiSpex.schema(%{
    title: "WorkoutSessionResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: WorkoutSession},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WorkoutSessionListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.WorkoutSession

  OpenApiSpex.schema(%{
    title: "WorkoutSessionListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: WorkoutSession},
      count: %Schema{type: :integer, minimum: 0}
    },
    required: [:data, :count]
  })
end

defmodule EasyWeb.OpenApi.Schemas.PerformedSetResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.PerformedSet

  OpenApiSpex.schema(%{
    title: "PerformedSetResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: PerformedSet},
    required: [:data]
  })
end
