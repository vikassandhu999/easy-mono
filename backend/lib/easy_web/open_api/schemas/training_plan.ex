defmodule EasyWeb.OpenApi.Schemas.TrainingPlanCreateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "TrainingPlanCreateRequest",
      description: "Request body for creating a coach training plan template.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, maxLength: 5000, nullable: true},
        status: %Schema{type: :string, enum: ["active", "archived"], nullable: true},
        start_date: %Schema{type: :string, format: :date, nullable: true},
        end_date: %Schema{type: :string, format: :date, nullable: true}
      },
      required: [:name],
      example: %{
        "name" => "Four Day Strength Template",
        "description" => "Upper/lower strength block.",
        "status" => "active"
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
      description: "Request body for updating coach-editable training plan metadata.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, maxLength: 5000, nullable: true},
        status: %Schema{type: :string, enum: ["active", "archived"], nullable: true},
        start_date: %Schema{type: :string, format: :date, nullable: true},
        end_date: %Schema{type: :string, format: :date, nullable: true}
      },
      example: %{
        "name" => "Updated Strength Template",
        "description" => "Updated training focus."
      }
    },
    struct?: false
  )
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
        client_id: %Schema{type: :string, format: :uuid},
        start_date: %Schema{type: :string, format: :date, nullable: true},
        end_date: %Schema{type: :string, format: :date, nullable: true}
      },
      required: [:client_id],
      example: %{"client_id" => "0c6ee321-1fb1-41c7-93c2-b4e4649eb2eb"}
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
          superset_group_id: %Schema{type: :string, nullable: true},
          notes: %Schema{type: :string, nullable: true},
          exercise_id: %Schema{type: :string, format: :uuid},
          workout_id: %Schema{type: :string, format: :uuid},
          exercise: %Schema{allOf: [TrainingPlanExercise], nullable: true},
          planned_sets: %Schema{type: :array, items: TrainingPlanPlannedSet}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :position,
      :superset_group_id,
      :notes,
      :exercise_id,
      :exercise,
      :planned_sets,
      :inserted_at,
      :updated_at
    ]
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
          notes: %Schema{type: :string, nullable: true},
          training_plan_id: %Schema{type: :string, format: :uuid},
          workout_elements: %Schema{type: :array, items: TrainingPlanWorkoutExercise}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :name,
      :notes,
      :workout_elements,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanItem do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanItem",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          day_of_week: %Schema{
            type: :string,
            enum: Shared.days_of_week()
          },
          training_workout_id: %Schema{type: :string, format: :uuid},
          training_plan_id: %Schema{type: :string, format: :uuid},
          creator_id: %Schema{type: :string, format: :uuid}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :day_of_week,
      :training_workout_id,
      :training_plan_id,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlan do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{
    Shared,
    TrainingPlanClient,
    TrainingPlanItem,
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
          name: %Schema{type: :string},
          description: %Schema{type: :string, nullable: true},
          status: %Schema{type: :string, enum: ["active", "archived"]},
          start_date: %Schema{type: :string, format: :date, nullable: true},
          end_date: %Schema{type: :string, format: :date, nullable: true},
          client_id: %Schema{type: :string, format: :uuid, nullable: true},
          client: %Schema{allOf: [TrainingPlanClient], nullable: true},
          creator_id: %Schema{type: :string, format: :uuid},
          source_template_id: %Schema{type: :string, format: :uuid, nullable: true},
          workouts: %Schema{type: :array, items: TrainingPlanWorkout},
          plan_items: %Schema{type: :array, items: TrainingPlanItem}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :name,
      :description,
      :status,
      :start_date,
      :end_date,
      :client_id,
      :client,
      :creator_id,
      :source_template_id,
      :workouts,
      :plan_items,
      :inserted_at,
      :updated_at
    ],
    example: %{
      "id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
      "name" => "Four Day Strength Template",
      "description" => "Upper/lower strength block.",
      "status" => "active",
      "start_date" => nil,
      "end_date" => nil,
      "client_id" => nil,
      "client" => nil,
      "creator_id" => "c8e8fe38-d9cc-4506-9514-8527a8b56d68",
      "source_template_id" => nil,
      "workouts" => [],
      "plan_items" => [],
      "inserted_at" => "2026-05-30T12:00:00Z",
      "updated_at" => "2026-05-30T12:00:00Z"
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientTrainingPlan do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingPlanItem, TrainingPlanWorkout}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientTrainingPlan",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          description: %Schema{type: :string, nullable: true},
          status: %Schema{type: :string, enum: ["active", "archived"]},
          start_date: %Schema{type: :string, format: :date, nullable: true},
          end_date: %Schema{type: :string, format: :date, nullable: true},
          workouts: %Schema{type: :array, items: TrainingPlanWorkout},
          plan_items: %Schema{type: :array, items: TrainingPlanItem}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :name,
      :description,
      :status,
      :start_date,
      :end_date,
      :workouts,
      :plan_items,
      :inserted_at,
      :updated_at
    ],
    example: %{
      "id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
      "name" => "Four Day Strength",
      "description" => "Upper/lower strength block.",
      "status" => "active",
      "start_date" => "2026-06-01",
      "end_date" => "2026-06-28",
      "workouts" => [],
      "plan_items" => [],
      "inserted_at" => "2026-05-30T12:00:00Z",
      "updated_at" => "2026-05-30T12:00:00Z"
    }
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
