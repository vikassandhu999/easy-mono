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
        end_date: %Schema{type: :string, format: :date, nullable: true},
        rest_days: %Schema{
          type: :array,
          items: %Schema{
            type: :string,
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
          },
          uniqueItems: true
        }
      },
      required: [:name],
      example: %{
        "name" => "Four Day Strength Template",
        "description" => "Upper/lower strength block.",
        "status" => "active",
        "rest_days" => ["saturday", "sunday"]
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
        end_date: %Schema{type: :string, format: :date, nullable: true},
        rest_days: %Schema{
          type: :array,
          items: %Schema{
            type: :string,
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
          },
          uniqueItems: true
        }
      },
      example: %{
        "name" => "Updated Strength Template",
        "description" => "Updated training focus.",
        "rest_days" => ["sunday"]
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
        start_date: %Schema{type: :string, format: :date},
        end_date: %Schema{type: :string, format: :date}
      },
      required: [:client_id, :start_date, :end_date],
      example: %{
        "client_id" => "0c6ee321-1fb1-41c7-93c2-b4e4649eb2eb",
        "start_date" => "2026-06-01",
        "end_date" => "2026-06-28"
      }
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
      images: %Schema{type: :array, items: %Schema{type: :string}}
    },
    required: [:id, :name, :mechanics, :force]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanPlannedSet do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanPlannedSet",
    type: :object,
    additionalProperties: false,
    properties: %{
      target_reps: %Schema{type: :string, nullable: true},
      load_value: %Schema{type: :string, nullable: true},
      load_unit: %Schema{
        type: :string,
        enum: ["kg", "lbs", "bodyweight", "percent_1rm", "rpe", "none"],
        nullable: true
      },
      intensity_target: %Schema{type: :string, nullable: true},
      tempo: %Schema{type: :string, nullable: true},
      rest_seconds: %Schema{type: :integer, minimum: 0, nullable: true},
      duration_seconds: %Schema{type: :integer, minimum: 0, nullable: true},
      distance_value: %Schema{type: :string, nullable: true},
      distance_unit: %Schema{
        type: :string,
        enum: ["meters", "km", "miles", "yards", "none"],
        nullable: true
      },
      notes: %Schema{type: :string, nullable: true}
    },
    required: [
      :target_reps,
      :load_value,
      :load_unit,
      :intensity_target,
      :tempo,
      :rest_seconds,
      :duration_seconds,
      :distance_value,
      :distance_unit,
      :notes
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanWorkoutElement do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{TrainingPlanExercise, TrainingPlanPlannedSet}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanWorkoutElement",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      position: %Schema{type: :integer, minimum: 0},
      superset_group_id: %Schema{type: :string, nullable: true},
      notes: %Schema{type: :string, nullable: true},
      exercise_id: %Schema{type: :string, format: :uuid},
      workout_id: %Schema{type: :string, format: :uuid},
      exercise: %Schema{allOf: [TrainingPlanExercise], nullable: true},
      planned_sets: %Schema{type: :array, items: TrainingPlanPlannedSet},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    },
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

  alias EasyWeb.OpenApi.Schemas.TrainingPlanWorkoutElement
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanWorkout",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      notes: %Schema{type: :string, nullable: true},
      training_plan_id: %Schema{type: :string, format: :uuid},
      workout_elements: %Schema{type: :array, items: TrainingPlanWorkoutElement},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    },
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

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanItem",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      day: %Schema{
        type: :string,
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      },
      workout_type: %Schema{type: :string, enum: ["primary", "alternative"]},
      workout_id: %Schema{type: :string, format: :uuid},
      training_plan_id: %Schema{type: :string, format: :uuid},
      creator_id: %Schema{type: :string, format: :uuid},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [
      :id,
      :day,
      :workout_type,
      :workout_id,
      :training_plan_id,
      :inserted_at,
      :updated_at
    ]
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlan do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{
    TrainingPlanClient,
    TrainingPlanItem,
    TrainingPlanWorkout
  }

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlan",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      description: %Schema{type: :string, nullable: true},
      status: %Schema{type: :string, enum: ["active", "archived"]},
      start_date: %Schema{type: :string, format: :date, nullable: true},
      end_date: %Schema{type: :string, format: :date, nullable: true},
      rest_days: %Schema{
        type: :array,
        items: %Schema{
          type: :string,
          enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        }
      },
      client_id: %Schema{type: :string, format: :uuid, nullable: true},
      client: %Schema{allOf: [TrainingPlanClient], nullable: true},
      author_id: %Schema{type: :string, format: :uuid},
      original_template_id: %Schema{type: :string, format: :uuid, nullable: true},
      workouts: %Schema{type: :array, items: TrainingPlanWorkout},
      plan_items: %Schema{type: :array, items: TrainingPlanItem},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [
      :id,
      :name,
      :description,
      :status,
      :start_date,
      :end_date,
      :rest_days,
      :client_id,
      :client,
      :author_id,
      :original_template_id,
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
      "rest_days" => ["saturday", "sunday"],
      "client_id" => nil,
      "client" => nil,
      "author_id" => "c8e8fe38-d9cc-4506-9514-8527a8b56d68",
      "original_template_id" => nil,
      "workouts" => [],
      "plan_items" => [],
      "inserted_at" => "2026-05-30T12:00:00Z",
      "updated_at" => "2026-05-30T12:00:00Z"
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientTrainingPlan do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{TrainingPlanItem, TrainingPlanWorkout}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientTrainingPlan",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      description: %Schema{type: :string, nullable: true},
      status: %Schema{type: :string, enum: ["active", "archived"]},
      start_date: %Schema{type: :string, format: :date, nullable: true},
      end_date: %Schema{type: :string, format: :date, nullable: true},
      rest_days: %Schema{
        type: :array,
        items: %Schema{
          type: :string,
          enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        }
      },
      workouts: %Schema{type: :array, items: TrainingPlanWorkout},
      plan_items: %Schema{type: :array, items: TrainingPlanItem},
      inserted_at: %Schema{type: :string, format: :"date-time"},
      updated_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [
      :id,
      :name,
      :description,
      :status,
      :start_date,
      :end_date,
      :rest_days,
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
      "rest_days" => ["saturday", "sunday"],
      "workouts" => [],
      "plan_items" => [],
      "inserted_at" => "2026-05-30T12:00:00Z",
      "updated_at" => "2026-05-30T12:00:00Z"
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingPlan
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "TrainingPlanListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: TrainingPlan},
      count: %Schema{type: :integer, minimum: 0}
    },
    required: [:data, :count],
    example: %{
      "data" => [
        %{
          "id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
          "name" => "Four Day Strength Template",
          "description" => "Upper/lower strength block.",
          "status" => "active",
          "start_date" => nil,
          "end_date" => nil,
          "rest_days" => ["saturday", "sunday"],
          "client_id" => nil,
          "client" => nil,
          "author_id" => "c8e8fe38-d9cc-4506-9514-8527a8b56d68",
          "original_template_id" => nil,
          "workouts" => [],
          "plan_items" => [],
          "inserted_at" => "2026-05-30T12:00:00Z",
          "updated_at" => "2026-05-30T12:00:00Z"
        }
      ],
      "count" => 1
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.TrainingPlanResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.TrainingPlan

  OpenApiSpex.schema(%{
    title: "TrainingPlanResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: TrainingPlan},
    required: [:data],
    example: %{
      "data" => %{
        "id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
        "name" => "Four Day Strength Template",
        "description" => "Upper/lower strength block.",
        "status" => "active",
        "start_date" => nil,
        "end_date" => nil,
        "rest_days" => ["saturday", "sunday"],
        "client_id" => nil,
        "client" => nil,
        "author_id" => "c8e8fe38-d9cc-4506-9514-8527a8b56d68",
        "original_template_id" => nil,
        "workouts" => [],
        "plan_items" => [],
        "inserted_at" => "2026-05-30T12:00:00Z",
        "updated_at" => "2026-05-30T12:00:00Z"
      }
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientTrainingPlanListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.ClientTrainingPlan
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ClientTrainingPlanListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: ClientTrainingPlan},
      count: %Schema{type: :integer, minimum: 0}
    },
    required: [:data, :count],
    example: %{
      "data" => [
        %{
          "id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
          "name" => "Four Day Strength",
          "description" => "Upper/lower strength block.",
          "status" => "active",
          "start_date" => "2026-06-01",
          "end_date" => "2026-06-28",
          "rest_days" => ["saturday", "sunday"],
          "workouts" => [],
          "plan_items" => [],
          "inserted_at" => "2026-05-30T12:00:00Z",
          "updated_at" => "2026-05-30T12:00:00Z"
        }
      ],
      "count" => 1
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ClientTrainingPlanResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.ClientTrainingPlan

  OpenApiSpex.schema(%{
    title: "ClientTrainingPlanResponse",
    type: :object,
    additionalProperties: false,
    properties: %{data: ClientTrainingPlan},
    required: [:data],
    example: %{
      "data" => %{
        "id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
        "name" => "Four Day Strength",
        "description" => "Upper/lower strength block.",
        "status" => "active",
        "start_date" => "2026-06-01",
        "end_date" => "2026-06-28",
        "rest_days" => ["saturday", "sunday"],
        "workouts" => [],
        "plan_items" => [],
        "inserted_at" => "2026-05-30T12:00:00Z",
        "updated_at" => "2026-05-30T12:00:00Z"
      }
    }
  })
end
