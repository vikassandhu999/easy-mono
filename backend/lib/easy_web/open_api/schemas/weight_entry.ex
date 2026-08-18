defmodule EasyWeb.OpenApi.Schemas.WeightEntryRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "WeightEntryRequest",
      type: :object,
      additionalProperties: false,
      properties: %{
        date: %Schema{type: :string, format: :date},
        value: %Schema{type: :number},
        unit: %Schema{type: :string, enum: ["kg", "lbs"]},
        note: %Schema{type: :string, nullable: true}
      },
      required: [:date, :value, :unit],
      example: %{"date" => "2026-05-31", "value" => 180.5, "unit" => "lbs"}
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.WeightEntry do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WeightEntry",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      date: %Schema{type: :string, format: :date},
      value: %Schema{type: :number},
      unit: %Schema{type: :string, enum: ["kg", "lbs"]},
      note: %Schema{type: :string, nullable: true},
      form_submission_id: %Schema{type: :string, format: :uuid, nullable: true},
      inserted_at: %Schema{type: :string, format: :"date-time"}
    },
    required: [:id, :date, :value, :unit, :note, :form_submission_id, :inserted_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.WeightEntryResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{Shared, WeightEntry}

  OpenApiSpex.schema(Shared.data_response(WeightEntry, "WeightEntryResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.WeightEntryListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.WeightEntry
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "WeightEntryListResponse",
    type: :object,
    additionalProperties: false,
    properties: %{
      entries: %Schema{type: :array, items: WeightEntry},
      goal: %Schema{type: :object, additionalProperties: true, nullable: true},
      summary: %Schema{type: :object, additionalProperties: true},
      adherence: %Schema{type: :object, additionalProperties: true, nullable: true}
    },
    required: [:entries, :goal, :summary]
  })
end
