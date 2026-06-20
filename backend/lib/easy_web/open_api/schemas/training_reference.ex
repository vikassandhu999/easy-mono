defmodule EasyWeb.OpenApi.Schemas.Muscle do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(
    Shared.named_ref("Muscle", %{
      "id" => "c04c39ff-4762-4a53-b0a3-15c8688ff9d4",
      "name" => "Quadriceps",
      "description" => "Primary knee extension muscle group."
    })
  )
end

defmodule EasyWeb.OpenApi.Schemas.MuscleListResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{Muscle, Shared}

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: Muscle}, "MuscleListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.Equipment do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(
    Shared.named_ref("Equipment", %{
      "id" => "f6c9d143-42f5-42a4-9313-4c6483a610bb",
      "name" => "Barbell",
      "description" => "Straight Olympic barbell."
    })
  )
end

defmodule EasyWeb.OpenApi.Schemas.EquipmentListResponse do
  require OpenApiSpex
  alias OpenApiSpex.Schema
  alias EasyWeb.OpenApi.Schemas.{Equipment, Shared}

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: Equipment}, "EquipmentListResponse"))
end
