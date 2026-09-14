defmodule EasyWeb.Types.NutritionPlanClient do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:first_name) => String.t() | nil,
          required(:last_name) => String.t() | nil
        }
end

defmodule EasyWeb.Types.NutritionWeekSchedule do
  use EasyWeb.Type

  @type t :: %{
          required(:monday) => String.t(),
          required(:tuesday) => String.t(),
          required(:wednesday) => String.t(),
          required(:thursday) => String.t(),
          required(:friday) => String.t(),
          required(:saturday) => String.t(),
          required(:sunday) => String.t()
        }
end

defmodule EasyWeb.Types.NutritionDayPatternSlot do
  use EasyWeb.Type

  @type t :: %{
          required(:meal_slot) =>
            :early_morning
            | :breakfast
            | :mid_morning
            | :lunch
            | :afternoon
            | :evening
            | :dinner
            | :pre_sleep
            | :pre_workout
            | :during_workout
            | :post_workout,
          required(:meal_ids) => [String.t()]
        }
end

defmodule EasyWeb.Types.NutritionDayPattern do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          required(:slots) => [EasyWeb.Types.NutritionDayPatternSlot.t()]
        }
end

defmodule EasyWeb.Types.Nutrition.NutritionPortion do
  use EasyWeb.Type

  @type t ::
          %{required(:kind) => :gram, required(:grams) => float()}
          | %{
              required(:kind) => :serving,
              required(:amount) => float(),
              required(:unit) => String.t(),
              required(:label) => String.t() | nil
            }
end

defmodule EasyWeb.Types.NutritionMealItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:kind) => :food | :recipe,
          optional(:name) => String.t() | nil,
          optional(:food_id) => Ecto.UUID.t() | nil,
          optional(:recipe_id) => Ecto.UUID.t() | nil,
          required(:portion) => EasyWeb.Types.Nutrition.NutritionPortion.t(),
          optional(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t()
        }
end

defmodule EasyWeb.Types.NutritionMeal do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          optional(:notes) => String.t() | nil,
          optional(:nutrients) => EasyWeb.Types.Nutrition.FoodNutrients.t(),
          required(:meal_items) => [EasyWeb.Types.NutritionMealItem.t()]
        }
end

defmodule EasyWeb.Types.NutritionMenu do
  use EasyWeb.Type

  # Array order is authoritative. Names on items and nutrient totals are
  # server-calculated: accepted on save for round trips, never trusted.
  @type t :: %{
          required(:meals) => [EasyWeb.Types.NutritionMeal.t()],
          required(:day_patterns) => [EasyWeb.Types.NutritionDayPattern.t()],
          required(:schedule) => EasyWeb.Types.NutritionWeekSchedule.t()
        }
end

defmodule EasyWeb.Types.NutritionPlan do
  use EasyWeb.Type

  alias Easy.Clients.Client

  alias Easy.Nutrition.{Menu, Plan}

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:kind) => :template | :client_plan,
          required(:name) => String.t(),
          required(:description) => String.t() | nil,
          required(:revision) => pos_integer(),
          required(:lifecycle) => :active | :incomplete | :upcoming | :current | :ended | :archived,
          required(:assigned_client_count) => non_neg_integer(),
          required(:target_calories) => float() | nil,
          required(:target_protein_g) => float() | nil,
          required(:target_carbs_g) => float() | nil,
          required(:target_fat_g) => float() | nil,
          required(:target_fiber_g) => float() | nil,
          required(:start_date) => Date.t() | nil,
          required(:end_date) => Date.t() | nil,
          required(:client_id) => Ecto.UUID.t() | nil,
          required(:client) => EasyWeb.Types.NutritionPlanClient.t() | nil,
          required(:creator_id) => Ecto.UUID.t() | nil,
          required(:source_template_id) => Ecto.UUID.t() | nil,
          required(:menu) => EasyWeb.Types.NutritionMenu.t(),
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }

  @type create :: %{
          required(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:target_calories) => float() | nil,
          optional(:target_protein_g) => float() | nil,
          optional(:target_carbs_g) => float() | nil,
          optional(:target_fat_g) => float() | nil,
          optional(:target_fiber_g) => float() | nil
        }

  @type update :: %{
          required(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:target_calories) => float() | nil,
          optional(:target_protein_g) => float() | nil,
          optional(:target_carbs_g) => float() | nil,
          optional(:target_fat_g) => float() | nil,
          optional(:target_fiber_g) => float() | nil,
          optional(:start_date) => Date.t() | nil,
          optional(:end_date) => Date.t() | nil
        }

  @type assign :: %{
          optional(:expected_revision) => pos_integer(),
          optional(:start_date) => Date.t() | nil,
          optional(:end_date) => Date.t() | nil
        }

  @type lifecycle_query :: %{optional(:expected_revision) => pos_integer()}

  @type preview_menu :: %{required(:menu) => EasyWeb.Types.NutritionMenu.t()}

  @type replace_menu :: %{
          required(:expected_revision) => pos_integer(),
          required(:menu) => EasyWeb.Types.NutritionMenu.t()
        }

  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:search) => String.t(),
          optional(:archived) => boolean()
        }

  @type client_list_query :: %{
          optional(:offset) => integer(),
          optional(:limit) => integer(),
          optional(:archived) => boolean()
        }

  @spec format(Plan.t()) :: t()
  def format(%Plan{} = plan) do
    %{
      id: plan.id,
      kind: plan.kind,
      name: plan.name,
      description: plan.description,
      revision: plan.revision,
      lifecycle: plan.lifecycle,
      assigned_client_count: plan.assigned_client_count || 0,
      target_calories: plan.target_calories,
      target_protein_g: plan.target_protein_g,
      target_carbs_g: plan.target_carbs_g,
      target_fat_g: plan.target_fat_g,
      target_fiber_g: plan.target_fiber_g,
      start_date: plan.start_date,
      end_date: plan.end_date,
      client_id: plan.client_id,
      client: format_client(plan),
      creator_id: plan.creator_id,
      source_template_id: plan.source_template_id,
      menu: Menu.format(plan.menu),
      inserted_at: plan.inserted_at,
      updated_at: plan.updated_at
    }
  end

  defp format_client(%Plan{kind: :template}), do: nil

  defp format_client(%Plan{kind: :client_plan, client: %Client{} = client}) do
    %{id: client.id, first_name: client.first_name, last_name: client.last_name}
  end
end

defmodule EasyWeb.Types.NutritionPlanIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.NutritionPlan.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.NutritionCoverage do
  use EasyWeb.Type

  @type t :: %{
          required(:date) => Date.t(),
          required(:current) => EasyWeb.Types.NutritionPlan.t() | nil,
          required(:upcoming) => [EasyWeb.Types.NutritionPlan.t()]
        }
end
