defmodule EasyWeb.OpenApi.Schemas.NutritionPlanCreateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanCreateRequest",
      description: "Request body for creating a reusable Nutrition Template.",
      type: :object,
      additionalProperties: false,
      properties: %{
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, maxLength: 5000, nullable: true},
        target_calories: %Schema{type: :number, minimum: 0, nullable: true},
        target_protein_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_carbs_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_fat_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_fiber_g: %Schema{type: :number, minimum: 0, nullable: true}
      },
      required: [:name],
      example: %{
        "name" => "Cut Block",
        "description" => "Reusable cutting Template.",
        "target_calories" => 2000,
        "target_protein_g" => 150
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanUpdateRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanUpdateRequest",
      description: "Revisioned metadata and nutrient targets for a Nutrition Template or Client Nutrition Plan.",
      type: :object,
      additionalProperties: false,
      properties: %{
        expected_revision: %Schema{type: :integer, minimum: 1},
        name: %Schema{type: :string, maxLength: 255},
        description: %Schema{type: :string, maxLength: 5000, nullable: true},
        target_calories: %Schema{type: :number, minimum: 0, nullable: true},
        target_protein_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_carbs_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_fat_g: %Schema{type: :number, minimum: 0, nullable: true},
        target_fiber_g: %Schema{type: :number, minimum: 0, nullable: true},
        start_date: %Schema{type: :string, format: :date, nullable: true},
        end_date: %Schema{type: :string, format: :date, nullable: true}
      },
      required: [:expected_revision],
      example: %{
        "expected_revision" => 3,
        "name" => "Updated Cut Block",
        "target_calories" => 1800
      }
    },
    struct?: false
  )
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanRevisionRequest do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(
    %{
      title: "NutritionPlanRevisionRequest",
      description: "Optimistic revision required by an explicit Nutrition Template or Client Plan lifecycle command.",
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

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanClient do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionPlanClient",
    type: :object,
    additionalProperties: false,
    properties: %{
      id: %Schema{type: :string, format: :uuid},
      first_name: %Schema{type: :string, nullable: true},
      last_name: %Schema{type: :string, nullable: true}
    },
    required: [:id, :first_name, :last_name]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionWeekSchedule do
  require OpenApiSpex

  alias OpenApiSpex.Schema

  @weekday %Schema{type: :string, format: :uuid, nullable: true}

  OpenApiSpex.schema(%{
    title: "NutritionWeekSchedule",
    type: :object,
    additionalProperties: false,
    properties: %{
      monday: @weekday,
      tuesday: @weekday,
      wednesday: @weekday,
      thursday: @weekday,
      friday: @weekday,
      saturday: @weekday,
      sunday: @weekday
    },
    required: [:monday, :tuesday, :wednesday, :thursday, :friday, :saturday, :sunday]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionDayPattern do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.Shared
  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionDayPattern",
    type: :object,
    additionalProperties: false,
    properties:
      Map.merge(
        %{
          id: %Schema{type: :string, format: :uuid},
          name: %Schema{type: :string},
          position: %Schema{type: :integer, minimum: 0},
          weekdays: %Schema{type: :array, items: %Schema{type: :string, enum: Shared.days_of_week()}},
          nutrition_plan_id: %Schema{type: :string, format: :uuid}
        },
        Shared.timestamps()
      ),
    required: [:id, :name, :position, :weekdays, :nutrition_plan_id, :inserted_at, :updated_at]
  })
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlan do
  require OpenApiSpex

  alias Easy.Nutrition.Plan, as: DomainPlan

  alias EasyWeb.OpenApi.Schemas.{
    NutritionDayPattern,
    NutritionPlanClient,
    NutritionWeekSchedule,
    Shared
  }

  alias OpenApiSpex.Schema

  OpenApiSpex.schema(%{
    title: "NutritionPlan",
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
            enum: Enum.map(DomainPlan.lifecycles(), &Atom.to_string/1),
            nullable: true
          },
          assigned_client_count: %Schema{type: :integer, minimum: 0},
          target_calories: %Schema{type: :number, nullable: true},
          target_protein_g: %Schema{type: :number, nullable: true},
          target_carbs_g: %Schema{type: :number, nullable: true},
          target_fat_g: %Schema{type: :number, nullable: true},
          target_fiber_g: %Schema{type: :number, nullable: true},
          start_date: %Schema{type: :string, format: :date, nullable: true},
          end_date: %Schema{type: :string, format: :date, nullable: true},
          client_id: %Schema{type: :string, format: :uuid, nullable: true},
          client: %Schema{allOf: [NutritionPlanClient], nullable: true},
          creator_id: %Schema{type: :string, format: :uuid, nullable: true},
          source_template_id: %Schema{type: :string, format: :uuid, nullable: true},
          day_patterns: %Schema{type: :array, items: NutritionDayPattern},
          schedule: NutritionWeekSchedule
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
      :assigned_client_count,
      :target_calories,
      :target_protein_g,
      :target_carbs_g,
      :target_fat_g,
      :target_fiber_g,
      :start_date,
      :end_date,
      :client_id,
      :client,
      :creator_id,
      :source_template_id,
      :day_patterns,
      :schedule,
      :inserted_at,
      :updated_at
    ],
    example: %{
      "id" => "a38e6f56-f08e-4233-8f6e-96f5c05362a9",
      "kind" => "template",
      "name" => "Cut Block",
      "description" => "Reusable cutting Template.",
      "revision" => 1,
      "archived_at" => nil,
      "status" => "active",
      "lifecycle" => nil,
      "assigned_client_count" => 0,
      "target_calories" => 2000,
      "target_protein_g" => 150,
      "target_carbs_g" => 200,
      "target_fat_g" => 60,
      "target_fiber_g" => 30,
      "start_date" => nil,
      "end_date" => nil,
      "client_id" => nil,
      "client" => nil,
      "creator_id" => "c8e8fe38-d9cc-4506-9514-8527a8b56d68",
      "source_template_id" => nil,
      "day_patterns" => [],
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

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionPlan, Shared}

  OpenApiSpex.schema(Shared.data_response(NutritionPlan, "NutritionPlanResponse"))
end

defmodule EasyWeb.OpenApi.Schemas.NutritionPlanListResponse do
  require OpenApiSpex

  alias EasyWeb.OpenApi.Schemas.{NutritionPlan, Shared}

  OpenApiSpex.schema(Shared.list_response(NutritionPlan, "NutritionPlanListResponse"))
end
