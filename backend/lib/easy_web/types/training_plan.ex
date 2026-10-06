defmodule EasyWeb.Types.TrainingReps do
  use EasyWeb.Type

  @type t :: %{
          required(:type) => :exact | :range | :amrap,
          optional(:value) => non_neg_integer() | nil,
          optional(:min) => non_neg_integer() | nil,
          optional(:max) => non_neg_integer() | nil
        }
end

defmodule EasyWeb.Types.TrainingLoad do
  use EasyWeb.Type
  @type t :: %{required(:kg) => number(), required(:entered_unit) => :kg | :lb}
end

defmodule EasyWeb.Types.TrainingDistance do
  use EasyWeb.Type
  @type t :: %{required(:m) => number(), required(:entered_unit) => :m | :km | :mi}
end

defmodule EasyWeb.Types.TrainingPrescribedSet do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:kind) => :warmup | :working | :drop,
          optional(:reps) => EasyWeb.Types.TrainingReps.t() | nil,
          optional(:load) => EasyWeb.Types.TrainingLoad.t() | nil,
          optional(:rpe) => number() | nil,
          optional(:rir) => non_neg_integer() | nil,
          optional(:tempo) => String.t() | nil,
          optional(:duration_s) => non_neg_integer() | nil,
          optional(:distance) => EasyWeb.Types.TrainingDistance.t() | nil,
          optional(:rest_s) => non_neg_integer() | nil,
          optional(:notes) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrainingItem do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:exercise_id) => Ecto.UUID.t(),
          optional(:exercise_name) => String.t() | nil,
          optional(:notes) => String.t() | nil,
          required(:sets) => [EasyWeb.Types.TrainingPrescribedSet.t()]
        }
end

defmodule EasyWeb.Types.TrainingBlock do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:format) => :straight | :superset | :circuit,
          optional(:rounds) => non_neg_integer() | nil,
          optional(:rest_s) => non_neg_integer() | nil,
          optional(:notes) => String.t() | nil,
          required(:items) => [EasyWeb.Types.TrainingItem.t()]
        }
end

defmodule EasyWeb.Types.TrainingWorkout do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          optional(:notes) => String.t() | nil,
          required(:blocks) => [EasyWeb.Types.TrainingBlock.t()]
        }
end

defmodule EasyWeb.Types.TrainingScheduleEntry do
  use EasyWeb.Type
  @type t :: %{required(:id) => Ecto.UUID.t(), required(:day) => non_neg_integer(), required(:ref) => Ecto.UUID.t()}
end

defmodule EasyWeb.Types.TrainingSchedule do
  use EasyWeb.Type
  @type t :: %{required(:cycle_weeks) => pos_integer(), required(:entries) => [EasyWeb.Types.TrainingScheduleEntry.t()]}
end

defmodule EasyWeb.Types.TrainingContent do
  use EasyWeb.Type

  @type t :: %{
          required(:workouts) => [EasyWeb.Types.TrainingWorkout.t()],
          required(:schedule) => EasyWeb.Types.TrainingSchedule.t()
        }
end

defmodule EasyWeb.Types.TrainingPlanRevision do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:number) => pos_integer(),
          required(:effective_on) => Date.t() | nil,
          required(:content) => EasyWeb.Types.TrainingContent.t()
        }
end

defmodule EasyWeb.Types.TrainingPlanClient do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:full_name) => String.t(),
          required(:preferred_name) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrainingPlan do
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
          required(:workout_count) => non_neg_integer(),
          required(:client) => EasyWeb.Types.TrainingPlanClient.t() | nil,
          required(:start_date) => Date.t() | nil,
          required(:end_date) => Date.t() | nil,
          required(:created_local_date) => Date.t() | nil,
          required(:client_id) => String.t() | nil,
          required(:source_template_id) => String.t() | nil,
          required(:content) => EasyWeb.Types.TrainingContent.t(),
          required(:current_revision) => EasyWeb.Types.TrainingPlanRevision.t() | nil,
          required(:scheduled_revisions) => [EasyWeb.Types.TrainingPlanRevision.t()],
          required(:stopped_on) => Date.t() | nil,
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
  @type create :: %{
          required(:name) => String.t(),
          optional(:description) => String.t() | nil,
          required(:content) => EasyWeb.Types.TrainingContent.t()
        }
  @type update :: %{
          required(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:content) => EasyWeb.Types.TrainingContent.t(),
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

defmodule EasyWeb.Types.TrainingPlanCoverage do
  use EasyWeb.Type

  @type t :: %{
          required(:date) => Date.t(),
          required(:plan) => EasyWeb.Types.TrainingPlan.t(),
          required(:workouts) => [EasyWeb.Types.TrainingWorkout.t()]
        }
end

defmodule EasyWeb.Types.TrainingPlanIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.TrainingPlan.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrainingOccurrence do
  use EasyWeb.Type

  @type t :: %{
          required(:plan_id) => String.t(),
          required(:plan_revision_id) => String.t(),
          required(:schedule_entry_id) => String.t(),
          required(:occurrence_date) => Date.t(),
          required(:workout_id) => String.t(),
          required(:workout_name) => String.t(),
          required(:session_id) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrainingOccurrences do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.TrainingOccurrence.t()],
          required(:extra_sessions) => [EasyWeb.Types.Training.Session.t()]
        }
end
