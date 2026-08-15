defmodule EasyWeb.OpenApi.Schemas.TrainingPerformedSetCreateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPerformedSetCreateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        exercise_name: %Schema{type: :string, minLength: 1, nullable: true},
        exercise_id: %Schema{type: :string, format: :uuid, nullable: true},
        snapshot_exercise_ref: %Schema{
          type: :string,
          format: :uuid,
          nullable: true,
          description: "Stable ref of the Prescribed Exercise in this Training Session snapshot"
        },
        set_type: %Schema{type: :string, enum: ["working", "warmup", "dropset"], nullable: true},
        reps: %Schema{type: :string, nullable: true},
        load_value: %Schema{type: :number, nullable: true},
        load_unit: %Schema{type: :string, enum: ["kg", "lbs", "bodyweight", "none"], nullable: true},
        rpe: %Schema{type: :number, minimum: 1, maximum: 10, nullable: true},
        duration_seconds: %Schema{type: :integer, minimum: 0, nullable: true},
        distance_value: %Schema{type: :number, nullable: true},
        distance_unit: %Schema{type: :string, enum: ["meters", "km", "miles", "none"], nullable: true},
        notes: %Schema{type: :string, maxLength: 5000, nullable: true}
      },
      example: %{
        "exercise_id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
        "snapshot_exercise_ref" => "f9c443b8-07d3-4ee8-aa7e-a287a013ea55",
        "reps" => "10",
        "load_value" => 80,
        "load_unit" => "kg"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPerformedSetUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPerformedSetUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        set_type: %Schema{type: :string, enum: ["working", "warmup", "dropset"], nullable: true},
        reps: %Schema{type: :string, nullable: true},
        load_value: %Schema{type: :number, nullable: true},
        load_unit: %Schema{type: :string, enum: ["kg", "lbs", "bodyweight", "none"], nullable: true},
        rpe: %Schema{type: :number, minimum: 1, maximum: 10, nullable: true},
        duration_seconds: %Schema{type: :integer, minimum: 0, nullable: true},
        distance_value: %Schema{type: :number, nullable: true},
        distance_unit: %Schema{type: :string, enum: ["meters", "km", "miles", "none"], nullable: true},
        notes: %Schema{type: :string, maxLength: 5000, nullable: true}
      },
      example: %{"reps" => "8", "load_value" => 82.5, "load_unit" => "kg", "rpe" => 9}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPerformedSet do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanExercise}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPerformedSet",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          exercise_name: %Schema{type: :string},
          snapshot_exercise_ref: %Schema{type: :string, format: :uuid, nullable: true},
          set_type: %Schema{type: :string, enum: ["working", "warmup", "dropset"]},
          position: %Schema{type: :integer},
          reps: %Schema{type: :string, nullable: true},
          load_value: %Schema{type: :number, nullable: true},
          load_unit: %Schema{type: :string, nullable: true},
          rpe: %Schema{type: :number, nullable: true},
          duration_seconds: %Schema{type: :integer, nullable: true},
          distance_value: %Schema{type: :number, nullable: true},
          distance_unit: %Schema{type: :string, nullable: true},
          notes: %Schema{type: :string, nullable: true},
          exercise_id: %Schema{type: :string, format: :uuid, nullable: true},
          training_session_id: %Schema{type: :string, format: :uuid},
          exercise: %Schema{allOf: [TrainingPlanExercise], nullable: true}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :position,
      :exercise_name,
      :snapshot_exercise_ref,
      :set_type,
      :reps,
      :load_value,
      :load_unit,
      :exercise_id,
      :training_session_id,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingSessionRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingSessionRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        training_workout_id: %Schema{type: :string, format: :uuid, nullable: true},
        soreness_rating: %Schema{type: :integer, minimum: 1, maximum: 5, nullable: true},
        notes: %Schema{type: :string, maxLength: 5000, nullable: true}
      },
      example: %{
        "training_workout_id" => "1b8248bc-4499-4a0c-986f-621fc95cbd0e"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingSessionSnapshotPlan do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingSessionSnapshotPlan",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      revision: %Schema{type: :integer, minimum: 1}
    },
    required: [:id, :name, :revision]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingSessionSnapshotExercise do
  require OpenApiSpex

  alias Easy.Training.TrainingExercise
  alias EasyWeb.OpenApi.Schemas.TrainingPlanPlannedSet
  alias OpenApiSpex.Schema

  @tracking_types Enum.map(TrainingExercise.tracking_types(), &Atom.to_string/1)

  OpenApiSpex.schema(%{
    title: "TrainingSessionSnapshotExercise",
    type: :object,
    additionalProperties: false,
    properties: %{
      ref: %Schema{type: :string, format: :uuid},
      position: %Schema{type: :integer, minimum: 0},
      exercise_id: %Schema{type: :string, format: :uuid},
      exercise_name: %Schema{type: :string},
      tracking_type: %Schema{type: :string, enum: @tracking_types},
      sets: %Schema{type: :array, items: TrainingPlanPlannedSet}
    },
    required: [:ref, :position, :exercise_id, :exercise_name, :tracking_type, :sets]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingSessionSnapshotWorkout do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingSessionSnapshotExercise
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingSessionSnapshotWorkout",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      exercises: %Schema{type: :array, items: TrainingSessionSnapshotExercise}
    },
    required: [:id, :name, :exercises]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingSessionPrescriptionSnapshot do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{TrainingSessionSnapshotPlan, TrainingSessionSnapshotWorkout}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingSessionPrescriptionSnapshot",
    type: :object,
    additionalProperties: false,
    properties: %{
      version: %Schema{type: :integer, enum: [1]},
      plan: TrainingSessionSnapshotPlan,
      workout: TrainingSessionSnapshotWorkout
    },
    required: [:version, :plan, :workout]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingSessionUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingSessionUpdateRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        state: %Schema{type: :string, enum: ["completed", "discarded"]},
        ended_at: %Schema{type: :string, format: :"date-time"},
        soreness_rating: %Schema{type: :integer, minimum: 1, maximum: 5},
        notes: %Schema{type: :string}
      },
      example: %{"state" => "completed", "soreness_rating" => 3, "notes" => "Felt strong."}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingSession do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPerformedSet, TrainingSessionPrescriptionSnapshot}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingSession",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          kind: %Schema{type: :string, enum: ["planned", "freestyle"]},
          date: %Schema{type: :string, format: :date},
          started_at: %Schema{type: :string, format: :"date-time"},
          closed_at: %Schema{type: :string, format: :"date-time", nullable: true},
          ended_at: %Schema{type: :string, format: :"date-time", nullable: true},
          state: %Schema{type: :string, enum: ["active", "completed", "discarded"]},
          soreness_rating: %Schema{type: :integer, minimum: 1, maximum: 5, nullable: true},
          notes: %Schema{type: :string, nullable: true},
          client_id: %Schema{type: :string, format: :uuid, nullable: true},
          training_workout_id: %Schema{type: :string, format: :uuid, nullable: true},
          planned_snapshot: %Schema{type: :object, additionalProperties: true, nullable: true},
          snapshot_version: %Schema{type: :integer, minimum: 1, nullable: true},
          prescription_snapshot: %Schema{allOf: [TrainingSessionPrescriptionSnapshot], nullable: true},
          source_plan_id: %Schema{type: :string, format: :uuid, nullable: true},
          source_workout_id: %Schema{type: :string, format: :uuid, nullable: true},
          performed_sets: %Schema{type: :array, items: TrainingPerformedSet}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :kind,
      :date,
      :started_at,
      :closed_at,
      :ended_at,
      :state,
      :snapshot_version,
      :prescription_snapshot,
      :source_plan_id,
      :source_workout_id,
      :performed_sets,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingSessionResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingSession}

  OpenApiSpex.schema(Shared.data_response(TrainingSession, "TrainingSessionResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TrainingSessionListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingSession}

  OpenApiSpex.schema(Shared.list_response(TrainingSession, "TrainingSessionListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ActiveTrainingSessionResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingSession
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ActiveTrainingSessionResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: %Schema{allOf: [TrainingSession], nullable: true}},
    required: [:data]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPerformedSetResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPerformedSet}

  OpenApiSpex.schema(Shared.data_response(TrainingPerformedSet, "TrainingPerformedSetResponse"))
end
