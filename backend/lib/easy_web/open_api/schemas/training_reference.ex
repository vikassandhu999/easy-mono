defmodule EasyWeb.OpenApi.Schemas.TrainingMuscle do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(
    Shared.named_ref("TrainingMuscle", %{
      "id" => "c04c39ff-4762-4a53-b0a3-15c8688ff9d4",
      "name" => "Quadriceps",
      "description" => "Primary knee extension muscle group."
    })
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingMuscleListResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingMuscle}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: TrainingMuscle}, "TrainingMuscleListResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.TrainingEquipment do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.Shared

  OpenApiSpex.schema(
    Shared.named_ref("TrainingEquipment", %{
      "id" => "f6c9d143-42f5-42a4-9313-4c6483a610bb",
      "name" => "Barbell",
      "description" => "Straight Olympic barbell."
    })
  )
end

defmodule EasyWeb.OpenApi.Schemas.TrainingEquipmentListResponse do
  require OpenApiSpex
  alias EasyWeb.OpenApi.Schemas.{Shared, TrainingEquipment}
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(Shared.data_response(%Schema{type: :array, items: TrainingEquipment}, "TrainingEquipmentListResponse"))
end
