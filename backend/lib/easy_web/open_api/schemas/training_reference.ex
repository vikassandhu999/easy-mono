defmodule EasyWeb.OpenApi.Schemas.Muscle do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "Muscle",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      description: %Schema{type: :string, nullable: true}
    },
    required: [:id, :name, :description],
    example: %{
      "id" => "c04c39ff-4762-4a53-b0a3-15c8688ff9d4",
      "name" => "Quadriceps",
      "description" => "Primary knee extension muscle group."
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.MuscleListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Muscle

  OpenApiSpex.schema(%{
    title: "MuscleListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: Muscle}
    },
    required: [:data],
    example: %{
      "data" => [
        %{
          "id" => "c04c39ff-4762-4a53-b0a3-15c8688ff9d4",
          "name" => "Quadriceps",
          "description" => "Primary knee extension muscle group."
        }
      ]
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.Equipment do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "Equipment",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      name: %Schema{type: :string},
      description: %Schema{type: :string, nullable: true}
    },
    required: [:id, :name, :description],
    example: %{
      "id" => "f6c9d143-42f5-42a4-9313-4c6483a610bb",
      "name" => "Barbell",
      "description" => "Straight Olympic barbell."
    }
  })
end

defmodule EasyWeb.OpenApi.Schemas.EquipmentListResponse do
  require OpenApiSpex

  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.Equipment

  OpenApiSpex.schema(%{
    title: "EquipmentListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      data: %Schema{type: :array, items: Equipment}
    },
    required: [:data],
    example: %{
      "data" => [
        %{
          "id" => "f6c9d143-42f5-42a4-9313-4c6483a610bb",
          "name" => "Barbell",
          "description" => "Straight Olympic barbell."
        }
      ]
    }
  })
end
