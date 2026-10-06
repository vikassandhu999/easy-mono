defmodule EasyWeb.Types.NutritionPlanRevision do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:number) => pos_integer(),
          required(:effective_on) => Date.t() | nil,
          required(:content) => EasyWeb.Types.NutritionContent.t()
        }
end

defmodule EasyWeb.Types.NutritionPlanClient do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:full_name) => String.t(),
          required(:preferred_name) => String.t() | nil
        }
end

defmodule EasyWeb.Types.NutritionPlan do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) => :template | :client_plan,
          required(:name) => String.t(),
          required(:description) => String.t() | nil,
          required(:revision) => pos_integer(),
          required(:archived_at) => DateTime.t() | nil,
          required(:status) => :active | :archived,
          required(:lifecycle) => :incomplete | :waiting | :upcoming | :current | :ended | :archived | nil,
          required(:meal_count) => non_neg_integer(),
          required(:client) => EasyWeb.Types.NutritionPlanClient.t() | nil,
          required(:start_date) => Date.t() | nil,
          required(:end_date) => Date.t() | nil,
          required(:created_local_date) => Date.t() | nil,
          required(:client_id) => String.t() | nil,
          required(:source_template_id) => String.t() | nil,
          required(:content) => EasyWeb.Types.NutritionContent.t(),
          required(:current_revision) => EasyWeb.Types.NutritionPlanRevision.t() | nil,
          required(:scheduled_revisions) => [EasyWeb.Types.NutritionPlanRevision.t()],
          required(:stopped_on) => Date.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
  @type create :: %{
          required(:name) => String.t(),
          optional(:description) => String.t() | nil,
          required(:content) => EasyWeb.Types.NutritionContent.t()
        }
  @type update :: %{
          required(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:content) => EasyWeb.Types.NutritionContent.t(),
          optional(:start_date) => Date.t() | nil,
          optional(:end_date) => Date.t() | nil,
          optional(:effective_on) => Date.t()
        }
  @type assign :: %{
          optional(:expected_revision) => pos_integer(),
          optional(:start_date) => Date.t() | nil,
          optional(:end_date) => Date.t() | nil
        }
  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:archived) => boolean()
        }
  @type client_list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:archived) => boolean()
        }
  @type client_scoped_list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:archived) => boolean(),
          optional(:status) => :active | :archived
        }
  @type coverage_query :: %{optional(:date) => Date.t()}
  @type range_query :: %{required(:from) => Date.t(), required(:to) => Date.t()}
end

defmodule EasyWeb.Types.NutritionPlanCoverage do
  use EasyWeb.Type

  @type t :: %{
          required(:date) => Date.t(),
          required(:plan) => EasyWeb.Types.NutritionPlan.t(),
          required(:meals) => [EasyWeb.Types.NutritionMeal.t()]
        }
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
