defmodule EasyWeb.Types.Training.Session do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:revision) => pos_integer(),
          required(:local_date) => Date.t(),
          required(:timezone) => String.t(),
          required(:started_at) => DateTime.t(),
          required(:ended_at) => DateTime.t() | nil,
          required(:state) => :active | :completed | :discarded,
          required(:notes) => String.t() | nil,
          required(:request_id) => String.t() | nil,
          required(:plan_revision_id) => String.t() | nil,
          required(:workout_id) => String.t() | nil,
          required(:schedule_entry_id) => String.t() | nil,
          required(:occurrence_date) => Date.t() | nil,
          required(:prescription) => EasyWeb.Types.TrainingWorkout.t() | nil,
          required(:performed_sets) => [EasyWeb.Types.Training.PerformedSet.t()],
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
  @type create :: %{
          optional(:notes) => String.t() | nil,
          optional(:request_id) => Ecto.UUID.t() | nil,
          optional(:plan_revision_id) => Ecto.UUID.t() | nil,
          optional(:workout_id) => Ecto.UUID.t() | nil,
          optional(:schedule_entry_id) => Ecto.UUID.t() | nil,
          optional(:occurrence_date) => Date.t() | nil
        }
  @type update :: %{
          optional(:expected_revision) => pos_integer(),
          optional(:local_date) => Date.t(),
          optional(:notes) => String.t() | nil
        }
  @type list_query :: %{
          optional(:from) => Date.t(),
          optional(:to) => Date.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:cursor) => String.t(),
          optional(:search) => String.t(),
          optional(:state) => :active | :completed | :discarded
        }
  @type coach_list_query :: %{
          optional(:from) => Date.t(),
          optional(:to) => Date.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:cursor) => String.t(),
          optional(:search) => String.t(),
          optional(:state) => :active | :completed | :discarded
        }
end

defmodule EasyWeb.Types.Training.SessionIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Training.Session.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end
