defmodule EasyWeb.OpenApi.Schemas.TrainingPlanCreateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPlanCreateRequest",
      description: "Request body for creating a reusable Training Template.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, maxLength: 5000, nullable: true}
      },
      required: [:name],
      example: %{
        "name" => "Four Day Strength Template",
        "description" => "Upper/lower strength block."
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPlanUpdateRequest",
      description: "Revisioned metadata for a Training Template, or metadata and Coverage dates for a Client Plan.",
      type: :object,
      additionalProperties: false,
      properties: %{
        expected_revision: %Schema{type: :integer, minimum: 1},
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, maxLength: 5000, nullable: true},
        start_date: %Schema{type: :string, format: :date, nullable: true},
        end_date: %Schema{type: :string, format: :date, nullable: true}
      },
      required: [:expected_revision],
      example: %{
        "expected_revision" => 3,
        "name" => "Updated Strength Template",
        "description" => "Updated training focus."
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanRevisionRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPlanRevisionRequest",
      description: "Optimistic revision required by an explicit Training Template or Client Plan lifecycle command.",
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

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanStaleRevisionError do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanStaleRevisionError",
    type: :object,
    additionalProperties: false,
    properties: %{
      error_code: %Schema{type: :string, enum: ["stale_revision"]},
      error_message: %Schema{type: :string},
      error_detail: %Schema{
        type: :object,
        additionalProperties: false,
        properties: %{current_revision: %Schema{type: :integer, minimum: 1}},
        required: [:current_revision]
      }
    },
    required: [:error_code, :error_message, :error_detail]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanAssignRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPlanAssignRequest",
      description: "Request body for assigning a template to a client.",
      type: :object,
      additionalProperties: false,
      properties: %{
        start_date: %Schema{type: :string, format: :date, nullable: true},
        end_date: %Schema{type: :string, format: :date, nullable: true}
      },
      example: %{"start_date" => "2026-09-01", "end_date" => nil}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanClient do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanClient",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      first_name: %Schema{type: :string},
      last_name: %Schema{type: :string}
    },
    required: [:id, :first_name, :last_name]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanExercise do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanExercise",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      mechanics: %Schema{type: :string, enum: ["compound", "isolation", "isometric"], nullable: true},
      force: %Schema{type: :string, enum: ["push", "pull", "static"], nullable: true},
      tracking_type: %Schema{
        type: :string,
        enum: [
          "weight_reps",
          "bodyweight_reps",
          "weighted_bodyweight",
          "assisted_bodyweight",
          "reps_only",
          "duration",
          "weight_duration",
          "distance_duration",
          "weight_distance"
        ],
        nullable: true
      },
      images: %Schema{type: :array, items: %Schema{type: :string}}
    },
    required: [:id, :name, :mechanics, :force]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanPlannedSet do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPlanPlannedSet",
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
      required: [
        :set_type,
        :reps,
        :load_value,
        :load_unit,
        :duration_seconds,
        :distance_value,
        :distance_unit,
        :rpe,
        :rest_seconds,
        :notes
      ]
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanWorkoutExercise do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanExercise, TrainingPlanPlannedSet}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanWorkoutExercise",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          position: %Schema{type: :integer, minimum: 0},
          exercise_id: %Schema{type: :string, format: :uuid},
          workout_id: %Schema{type: :string, format: :uuid},
          exercise: %Schema{allOf: [TrainingPlanExercise], nullable: true},
          planned_sets: %Schema{type: :array, items: TrainingPlanPlannedSet}
        },
        Shared.timestamps()
      ),
    required: [:id, :position, :exercise_id, :exercise, :planned_sets, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanWorkout do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanWorkoutExercise}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanWorkout",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          position: %Schema{type: :integer, minimum: 0},
          weekdays: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.days_of_week()}},
          training_plan_id: %Schema{type: :string, format: :uuid},
          workout_elements: %Schema{type: :array, items: TrainingPlanWorkoutExercise}
        },
        Shared.timestamps()
      ),
    required: [:id, :name, :position, :weekdays, :workout_elements, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlan do
  require OpenApiSpex

  alias Easy.Training.TrainingPlan, as: DomainTrainingPlan

  alias EasyWeb.OpenApi.Schemas.{
    Shared,
    TrainingPlanClient,
    TrainingSchedule,
    TrainingPlanWorkout
  }

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlan",
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
            enum: Enum.map(DomainTrainingPlan.lifecycles(), &Atom.to_string/1),
            nullable: true
          },
          start_date: %Schema{type: :string, format: :date, nullable: true},
          end_date: %Schema{type: :string, format: :date, nullable: true},
          client_id: %Schema{type: :string, format: :uuid, nullable: true},
          client: %Schema{allOf: [TrainingPlanClient], nullable: true},
          creator_id: %Schema{type: :string, format: :uuid},
          source_template_id: %Schema{type: :string, format: :uuid, nullable: true},
          workouts: %Schema{type: :array, items: TrainingPlanWorkout},
          schedule: TrainingSchedule
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
      :start_date,
      :end_date,
      :client_id,
      :client,
      :creator_id,
      :source_template_id,
      :workouts,
      :schedule,
      :inserted_at,
      :updated_at
    ],
    example: %{
      "id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
      "kind" => "template",
      "name" => "Four Day Strength Template",
      "description" => "Upper/lower strength block.",
      "revision" => 1,
      "archived_at" => nil,
      "status" => "active",
      "lifecycle" => nil,
      "start_date" => nil,
      "end_date" => nil,
      "client_id" => nil,
      "client" => nil,
      "creator_id" => "c8e8fe38-d9cc-4506-9514-8527a8b56d68",
      "source_template_id" => nil,
      "workouts" => [],
      "schedule" => %{
        "monday" => nil,
        "tuesday" => nil,
        "wednesday" => nil,
        "thursday" => nil,
        "friday" => nil,
        "saturday" => nil,
        "sunday" => nil
      },
      "inserted_at" => "2026-05-30T12:00:00Z",
      "updated_at" => "2026-05-30T12:00:00Z"
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientTrainingPlan do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanWorkout, TrainingSchedule}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientTrainingPlan",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          kind: %Schema{type: :string, enum: ["client_plan"]},
          name: %Schema{type: :string},
          description: %Schema{type: :string, nullable: true},
          revision: %Schema{type: :integer, minimum: 1},
          archived_at: %Schema{type: :string, format: :"date-time", nullable: true},
          status: %Schema{type: :string, enum: ["active", "archived"]},
          start_date: %Schema{type: :string, format: :date, nullable: true},
          end_date: %Schema{type: :string, format: :date, nullable: true},
          workouts: %Schema{type: :array, items: TrainingPlanWorkout},
          schedule: TrainingSchedule
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
      :start_date,
      :end_date,
      :workouts,
      :schedule,
      :inserted_at,
      :updated_at
    ],
    example: %{
      "id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
      "kind" => "client_plan",
      "name" => "Four Day Strength",
      "description" => "Upper/lower strength block.",
      "revision" => 1,
      "archived_at" => nil,
      "status" => "active",
      "start_date" => "2026-06-01",
      "end_date" => "2026-06-28",
      "workouts" => [],
      "schedule" => %{
        "monday" => nil,
        "tuesday" => nil,
        "wednesday" => nil,
        "thursday" => nil,
        "friday" => nil,
        "saturday" => nil,
        "sunday" => nil
      },
      "inserted_at" => "2026-05-30T12:00:00Z",
      "updated_at" => "2026-05-30T12:00:00Z"
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.CoachClientTrainingPlan do
  require OpenApiSpex

  alias Easy.Training.TrainingPlan, as: DomainTrainingPlan
  alias EasyWeb.OpenApi.Schemas.TrainingPlan
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "CoachClientTrainingPlan",
    allOf: [
      TrainingPlan,
      %Schema{
        type: :object,
        properties: %{
          kind: %Schema{type: :string, enum: ["client_plan"]},
          lifecycle: %Schema{
            type: :string,
            enum: Enum.map(DomainTrainingPlan.lifecycles(), &Atom.to_string/1)
          }
        },
        required: [:kind, :lifecycle]
      }
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlan}

  OpenApiSpex.schema(Shared.list_response(TrainingPlan, "TrainingPlanListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlan}

  OpenApiSpex.schema(Shared.data_response(TrainingPlan, "TrainingPlanResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientTrainingPlanListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientTrainingPlan, Shared}

  OpenApiSpex.schema(Shared.list_response(ClientTrainingPlan, "ClientTrainingPlanListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ClientTrainingPlanResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{ClientTrainingPlan, Shared}

  OpenApiSpex.schema(Shared.data_response(ClientTrainingPlan, "ClientTrainingPlanResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.CoachClientTrainingPlanListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{CoachClientTrainingPlan, Shared}

  OpenApiSpex.schema(Shared.list_response(CoachClientTrainingPlan, "CoachClientTrainingPlanListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.CoachClientTrainingPlanResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{CoachClientTrainingPlan, Shared}

  OpenApiSpex.schema(Shared.data_response(CoachClientTrainingPlan, "CoachClientTrainingPlanResponse"))
end
