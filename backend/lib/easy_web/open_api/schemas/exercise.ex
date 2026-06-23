defmodule EasyWeb.OpenApi.Schemas.ExerciseCreateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ExerciseCreateRequest",
      description: "Request body for creating a coach exercise.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, maxLength: 5000, nullable: true},
        instructions: %Schema{type: :string, maxLength: 10000, nullable: true},
        mechanics: %Schema{type: :string, enum: ["compound", "isolation", "isometric"], nullable: true},
        force: %Schema{type: :string, enum: ["push", "pull", "static"], nullable: true},
        images: %Schema{type: :array, items: %Schema{type: :string}},
        muscle_ids: %Schema{type: :array, items: %Schema{type: :string, format: :uuid}},
        equipment_ids: %Schema{type: :array, items: %Schema{type: :string, format: :uuid}}
      },
      required: [:name],
      example: %{
        "name" => "Barbell Back Squat",
        "description" => "Main lower-body strength movement.",
        "instructions" => "Brace, descend to depth, drive up.",
        "mechanics" => "compound",
        "force" => "push",
        "images" => ["https://cdn.example.com/exercises/back-squat.png"],
        "muscle_ids" => ["8f5db7e0-9b18-4d5f-9c2a-1f5d8f1131f0"],
        "equipment_ids" => ["7d72f2c3-8ed7-4b78-bf1f-c883df192772"]
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ExerciseDuplicateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ExerciseDuplicateRequest",
      description: "Request body for duplicating an exercise.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255}
      },
      required: [:name],
      example: %{
        "name" => "Trap Bar Deadlift"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ExerciseUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "ExerciseUpdateRequest",
      description: "Request body for updating a coach exercise.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, maxLength: 5000, nullable: true},
        instructions: %Schema{type: :string, maxLength: 10000, nullable: true},
        mechanics: %Schema{type: :string, enum: ["compound", "isolation", "isometric"], nullable: true},
        force: %Schema{type: :string, enum: ["push", "pull", "static"], nullable: true},
        images: %Schema{type: :array, items: %Schema{type: :string}},
        muscle_ids: %Schema{type: :array, items: %Schema{type: :string, format: :uuid}},
        equipment_ids: %Schema{type: :array, items: %Schema{type: :string, format: :uuid}}
      },
      example: %{
        "name" => "High-Bar Back Squat",
        "description" => "Upright squat variation.",
        "instructions" => "Stay tall and controlled.",
        "mechanics" => "compound"
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.ExerciseRelation do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(Shared.named_ref("ExerciseRelation"))
end

defmodule EasyWeb.OpenApi.Schemas.Exercise do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{ExerciseRelation, Shared}

  OpenApiSpex.schema(%{
    title: "Exercise",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          source: %Schema{type: :string, nullable: true},
          tracking_type: %Schema{type: :string, nullable: true},
          name: %Schema{type: :string},
          description: %Schema{type: :string, nullable: true},
          instructions: %Schema{type: :string, nullable: true},
          mechanics: %Schema{type: :string, enum: ["compound", "isolation", "isometric"], nullable: true},
          force: %Schema{type: :string, enum: ["push", "pull", "static"], nullable: true},
          images: %Schema{type: :array, items: %Schema{type: :string}},
          muscles: %Schema{type: :array, items: ExerciseRelation},
          equipment: %Schema{type: :array, items: ExerciseRelation}
        },
        Shared.timestamps()
      ),
    required: [
      :id,
      :source,
      :tracking_type,
      :name,
      :description,
      :instructions,
      :mechanics,
      :force,
      :images,
      :muscles,
      :equipment,
      :inserted_at,
      :updated_at
    ],
    example: %{
      "id" => "d6c7104f-74a4-4f9f-b1e9-a9bb07ab4a7c",
      "name" => "Barbell Back Squat",
      "description" => "Main lower-body strength movement.",
      "instructions" => "Brace, descend to depth, drive up.",
      "mechanics" => "compound",
      "force" => "push",
      "images" => ["https://cdn.example.com/exercises/back-squat.png"],
      "muscles" => [
        %{
          "id" => "8f5db7e0-9b18-4d5f-9c2a-1f5d8f1131f0",
          "name" => "Quadriceps",
          "description" => "Primary knee extension muscle group."
        }
      ],
      "equipment" => [
        %{
          "id" => "7d72f2c3-8ed7-4b78-bf1f-c883df192772",
          "name" => "Barbell",
          "description" => "Straight Olympic barbell."
        }
      ],
      "inserted_at" => "2026-05-30T12:00:00Z",
      "updated_at" => "2026-05-30T12:00:00Z"
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.ExerciseListResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Exercise, Shared}

  OpenApiSpex.schema(Shared.list_response(Exercise, "ExerciseListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ExerciseResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Exercise, Shared}

  OpenApiSpex.schema(Shared.data_response(Exercise, "ExerciseResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.ErrorResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "ErrorResponse",
    type: :object,
    additionalProperties: true,
    properties: %{
      error: %Schema{type: :object, additionalProperties: true},
      errors: %Schema{type: :array, items: %Schema{type: :object, additionalProperties: true}}
    }
  })
end
