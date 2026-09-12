defmodule EasyWeb.Types.WeightProgressMeasurement do
  use EasyWeb.Type
  @type t :: %{required(:date) => Date.t(), required(:value) => Decimal.t(), required(:unit) => :kg | :lbs}
end

defmodule EasyWeb.Types.WeightProgressPoint do
  use EasyWeb.Type
  @type t :: %{required(:id) => Ecto.UUID.t(), required(:date) => Date.t(), required(:value) => float()}
end

defmodule EasyWeb.Types.WeightProgress do
  use EasyWeb.Type
  alias EasyWeb.Types.{WeightEntry, WeightProgressMeasurement, WeightProgressPoint}

  @type t :: %{
          required(:data) => [WeightEntry.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil,
          required(:from) => Date.t(),
          required(:to) => Date.t(),
          required(:unit) => :kg | :lbs,
          required(:goal) => %{required(:value) => Decimal.t(), required(:unit) => :kg | :lbs} | nil,
          required(:summary) => %{
            required(:first_entry) => WeightProgressMeasurement.t() | nil,
            required(:latest_entry) => WeightProgressMeasurement.t() | nil,
            required(:total_change) => float() | nil,
            required(:change_unit) => :kg | :lbs | nil
          },
          required(:chart) => %{
            required(:min) => float() | nil,
            required(:max) => float() | nil,
            required(:points) => [WeightProgressPoint.t()]
          }
        }

  @type list_query :: %{
          optional(:from) => Date.t(),
          optional(:to) => Date.t(),
          optional(:unit) => :kg | :lbs,
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer()
        }
end
