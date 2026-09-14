defmodule EasyWeb.Types.Nutrition.LibraryUsageItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:read_only) => boolean()
        }
end

defmodule EasyWeb.Types.Nutrition.LibraryUsageCounts do
  use EasyWeb.Type

  @type t :: %{
          required(:recipes) => non_neg_integer(),
          required(:templates) => non_neg_integer(),
          required(:client_plans) => non_neg_integer()
        }
end

defmodule EasyWeb.Types.Nutrition.LibraryUsageReference do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:client_id) => String.t() | nil,
          required(:kind) => :recipe | :template | :client_plan,
          required(:inserted_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.Nutrition.LibraryUsage do
  use EasyWeb.Type

  @type t :: %{
          required(:item) => EasyWeb.Types.Nutrition.LibraryUsageItem.t(),
          required(:counts) => EasyWeb.Types.Nutrition.LibraryUsageCounts.t(),
          required(:delete_blocked_reason) => :shared_food | :in_use | nil,
          required(:data) => [EasyWeb.Types.Nutrition.LibraryUsageReference.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }

  @type query :: %{
          optional(:kind) => :recipes | :templates | :client_plans,
          optional(:search) => String.t(),
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer()
        }
end
