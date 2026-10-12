defmodule EasyWeb.Types.Review do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:client_id) => String.t(),
          required(:coach_id) => String.t(),
          required(:coach_name) => String.t(),
          required(:reviewed_at) => DateTime.t(),
          required(:reviewed_through_seq) => non_neg_integer(),
          required(:seen_at) => DateTime.t(),
          required(:assessment) => :on_track | :needs_attention | :at_risk,
          required(:private_note) => String.t() | nil,
          required(:reply) => EasyWeb.Types.ChatMessage.t() | nil
        }
  @type create :: %{
          required(:snapshot_token) => String.t(),
          required(:assessment) => :on_track | :needs_attention | :at_risk,
          optional(:private_note) => String.t() | nil,
          optional(:reply) => String.t() | nil
        }
  @type update :: %{
          optional(:assessment) => :on_track | :needs_attention | :at_risk,
          optional(:private_note) => String.t() | nil,
          optional(:reply) => String.t() | nil
        }
  @type list_query :: %{optional(:cursor) => String.t(), optional(:limit) => pos_integer()}
  @type reply_query :: %{
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer(),
          optional(:review_id) => Ecto.UUID.t()
        }
end

defmodule EasyWeb.Types.ReviewIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Review.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.ReviewChange do
  use EasyWeb.Type

  @type t :: %{
          required(:seq) => non_neg_integer(),
          required(:row_type) => String.t(),
          required(:row_id) => String.t(),
          required(:action) => :added | :changed | :removed,
          required(:old_value) => EasyWeb.TypedRoute.Types.json(),
          required(:new_value) => EasyWeb.TypedRoute.Types.json(),
          required(:changed_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.ReviewChangeGroup do
  use EasyWeb.Type

  @type t :: %{
          required(:title) => String.t(),
          required(:local_date) => Date.t() | nil,
          required(:tracker_id) => String.t() | nil,
          required(:record_type) => :workout | :tracker_entry,
          required(:record_id) => String.t(),
          required(:changes) => [EasyWeb.Types.ReviewChange.t()]
        }
end

defmodule EasyWeb.Types.ReviewPlanLink do
  use EasyWeb.Type
  @type t :: %{required(:id) => String.t(), required(:name) => String.t(), required(:domain) => :training}
end

defmodule EasyWeb.Types.ReviewScreen do
  use EasyWeb.Type

  @type t :: %{
          required(:client) => EasyWeb.Types.Client.t(),
          required(:snapshot_token) => String.t(),
          required(:seen_at) => DateTime.t(),
          required(:reviewed_through_seq) => non_neg_integer(),
          required(:from) => Date.t(),
          required(:to) => Date.t(),
          required(:last_review) => EasyWeb.Types.Review.t() | nil,
          required(:changes) => [EasyWeb.Types.ReviewChangeGroup.t()],
          required(:training) => EasyWeb.Types.TrainingOccurrences.t(),
          required(:training_counts) => %{
            required(:expected) => non_neg_integer(),
            required(:completed) => non_neg_integer(),
            required(:extra) => non_neg_integer()
          },
          required(:trackers) => [EasyWeb.Types.TrackerMetrics.t()],
          required(:requests) => [EasyWeb.Types.TrackerRequest.t()],
          required(:plans) => [EasyWeb.Types.ReviewPlanLink.t()]
        }
  @type query :: %{optional(:from) => Date.t(), optional(:to) => Date.t()}
end

defmodule EasyWeb.Types.ReviewRosterRow do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:client_id) => String.t(),
          required(:full_name) => String.t(),
          required(:preferred_name) => String.t() | nil,
          required(:email) => String.t() | nil,
          required(:phone) => String.t() | nil,
          required(:coach_name) => String.t(),
          required(:state) => :active | :ending_soon | :joined | :invited | :ended,
          required(:focus) => String.t() | nil,
          required(:review_frequency_days) => pos_integer(),
          required(:due) => boolean(),
          required(:overdue_days) => non_neg_integer(),
          required(:due_on) => Date.t() | nil,
          required(:last_reviewed_at) => DateTime.t() | nil,
          required(:assessment) => :on_track | :needs_attention | :at_risk | nil,
          required(:unread_chat) => non_neg_integer(),
          required(:waiting_since) => DateTime.t() | nil,
          required(:current_term) => EasyWeb.Types.CoachingTerm.t() | nil
        }
  @type query :: %{
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer(),
          optional(:q) => String.t(),
          optional(:sort) => :name | :due | :last_reviewed | :assessment | :unread_chat | :waiting_since,
          optional(:direction) => :asc | :desc,
          optional(:due) => :due | :not_due | :overdue | :inactive,
          optional(:assessment) => :on_track | :needs_attention | :at_risk,
          optional(:unread) => boolean(),
          optional(:waiting) => boolean(),
          optional(:last_reviewed) => :never | :reviewed,
          optional(:state) => :active | :ending_soon | :joined | :invited | :ended
        }
end

defmodule EasyWeb.Types.ReviewRoster do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.ReviewRosterRow.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.ReviewSettings do
  use EasyWeb.Type
  @type t :: %{required(:default_review_frequency_days) => pos_integer()}
  @type update :: %{
          required(:default_review_frequency_days) => pos_integer(),
          optional(:apply_to_existing) => boolean()
        }
end
