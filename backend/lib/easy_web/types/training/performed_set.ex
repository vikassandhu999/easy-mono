defmodule EasyWeb.Types.Training.PerformedSet do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:session_id) => String.t(),
          required(:position) => non_neg_integer(),
          required(:request_id) => String.t() | nil,
          required(:item_id) => String.t() | nil,
          required(:set_id) => String.t() | nil,
          required(:exercise_id) => String.t() | nil,
          required(:exercise_name) => String.t() | nil,
          required(:kind) => :warmup | :working | :drop,
          required(:outcome) => :done | :failed | :skipped,
          required(:reps) => non_neg_integer() | nil,
          required(:load_kg) => Decimal.t() | nil,
          required(:entered_load_unit) => :kg | :lb | nil,
          required(:duration_s) => non_neg_integer() | nil,
          required(:distance_m) => Decimal.t() | nil,
          required(:entered_distance_unit) => :m | :km | :mi | nil,
          required(:rpe) => Decimal.t() | nil,
          required(:rir) => non_neg_integer() | nil,
          required(:notes) => String.t() | nil,
          required(:deleted_at) => DateTime.t() | nil,
          optional(:local_date) => Date.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
  @type create :: %{
          optional(:item_id) => Ecto.UUID.t() | nil,
          optional(:set_id) => Ecto.UUID.t() | nil,
          optional(:exercise_id) => Ecto.UUID.t() | nil,
          optional(:exercise_name) => String.t() | nil,
          optional(:kind) => :warmup | :working | :drop,
          optional(:outcome) => :done | :failed | :skipped,
          optional(:reps) => non_neg_integer() | nil,
          optional(:duration_s) => non_neg_integer() | nil,
          optional(:rir) => non_neg_integer() | nil,
          optional(:notes) => String.t() | nil,
          optional(:load_value) => number() | nil,
          optional(:load_unit) => :kg | :lb | nil,
          optional(:distance_value) => number() | nil,
          optional(:distance_unit) => :m | :km | :mi | nil,
          optional(:rpe) => number() | nil,
          optional(:expected_revision) => pos_integer(),
          required(:request_id) => Ecto.UUID.t()
        }
  @type update :: %{
          optional(:item_id) => Ecto.UUID.t() | nil,
          optional(:set_id) => Ecto.UUID.t() | nil,
          optional(:exercise_id) => Ecto.UUID.t() | nil,
          optional(:exercise_name) => String.t() | nil,
          optional(:kind) => :warmup | :working | :drop,
          optional(:outcome) => :done | :failed | :skipped,
          optional(:reps) => non_neg_integer() | nil,
          optional(:duration_s) => non_neg_integer() | nil,
          optional(:rir) => non_neg_integer() | nil,
          optional(:notes) => String.t() | nil,
          optional(:load_value) => number() | nil,
          optional(:load_unit) => :kg | :lb | nil,
          optional(:distance_value) => number() | nil,
          optional(:distance_unit) => :m | :km | :mi | nil,
          optional(:rpe) => number() | nil,
          optional(:expected_revision) => pos_integer()
        }
  @type delete_query :: %{optional(:expected_revision) => pos_integer()}
end

defmodule EasyWeb.Types.Training.ExerciseBest do
  use EasyWeb.Type
  @type t :: %{required(:reps) => non_neg_integer(), required(:best_kg) => Decimal.t()}
end

defmodule EasyWeb.Types.Training.ExerciseHistory do
  use EasyWeb.Type

  @type t :: %{
          required(:bests) => [EasyWeb.Types.Training.ExerciseBest.t()],
          required(:sets) => [EasyWeb.Types.Training.PerformedSet.t()]
        }
end
