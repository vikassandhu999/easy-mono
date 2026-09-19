defmodule EasyWeb.Types.WeightEntry do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:date) => Date.t(),
          required(:value) => Decimal.t(),
          required(:unit) => :kg | :lbs,
          required(:note) => String.t() | nil,
          required(:revision) => pos_integer(),
          required(:form_submission_id) => String.t() | nil,
          required(:form_assignment_id) => Ecto.UUID.t() | nil,
          required(:inserted_at) => DateTime.t()
        }

  @type create :: %{
          required(:date) => Date.t(),
          required(:value) => number(),
          required(:unit) => :kg | :lbs,
          optional(:note) => String.t() | nil,
          optional(:expected_entry) => %{required(:id) => Ecto.UUID.t(), required(:revision) => pos_integer()} | nil
        }

  @type list_query :: %{optional(:since) => Date.t()}
  @type day_query :: %{required(:date) => Date.t()}
  @type delete_query :: %{optional(:expected_revision) => pos_integer()}
end

defmodule EasyWeb.Types.WeightEntryIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:entries) => [EasyWeb.Types.WeightEntry.t()],
          required(:goal) =>
            %{
              required(:value) => Decimal.t(),
              required(:unit) => :kg | :lbs
            }
            | nil,
          required(:summary) => %{
            required(:first_entry) =>
              %{
                required(:date) => Date.t(),
                required(:value) => Decimal.t(),
                required(:unit) => :kg | :lbs
              }
              | nil,
            required(:latest_entry) =>
              %{
                required(:date) => Date.t(),
                required(:value) => Decimal.t(),
                required(:unit) => :kg | :lbs
              }
              | nil,
            required(:total_change) => float() | nil,
            required(:change_unit) => :kg | :lbs | nil
          },
          required(:adherence) => %{
            required(:logged_days) => non_neg_integer(),
            required(:window_days) => pos_integer()
          }
        }
end
