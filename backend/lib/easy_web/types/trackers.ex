defmodule EasyWeb.Types.TrackerUnit do
  use EasyWeb.Type

  @type t :: %{
          required(:unit) => String.t(),
          required(:to_base_factor) => number()
        }
end

defmodule EasyWeb.Types.Tracker do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:kind) => :number | :rating | :yes_no | :text | :photo | :document,
          required(:base_unit) => String.t() | nil,
          required(:scale_max) => pos_integer() | nil,
          required(:archived_at) => DateTime.t() | nil,
          required(:built_in) => boolean(),
          required(:entry_count) => non_neg_integer(),
          required(:units) => [EasyWeb.Types.TrackerUnit.t()]
        }
  @type create :: %{
          required(:name) => String.t(),
          required(:kind) => :number | :rating | :yes_no | :text | :photo | :document,
          optional(:base_unit) => String.t() | nil,
          optional(:scale_max) => pos_integer() | nil
        }
  @type update :: %{
          required(:name) => String.t()
        }
  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:kind) => :number | :rating | :yes_no | :text | :photo | :document,
          optional(:archived) => boolean()
        }
end

defmodule EasyWeb.Types.TrackerIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Tracker.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrackerEntryIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.TrackerEntry.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrackerTemplateIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.TrackerTemplate.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.TrackerAssignment do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:tracker) => EasyWeb.Types.Tracker.t(),
          required(:timing) => :daily | :weekly | :after_workout | :after_meal,
          required(:weekday) => non_neg_integer() | nil,
          required(:starts_on) => Date.t(),
          required(:ends_on) => Date.t() | nil
        }
  @type create :: %{
          required(:tracker_id) => String.t(),
          required(:timing) => :daily | :weekly | :after_workout | :after_meal,
          optional(:weekday) => non_neg_integer() | nil
        }
  @type update :: %{
          required(:timing) => :daily | :weekly | :after_workout | :after_meal,
          optional(:weekday) => non_neg_integer() | nil
        }
end

defmodule EasyWeb.Types.TrackerAttachment do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:content_type) => String.t(),
          required(:byte_size) => pos_integer(),
          required(:captured_on) => Date.t() | nil,
          required(:position) => non_neg_integer()
        }
end

defmodule EasyWeb.Types.TrackerEntry do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:tracker) => EasyWeb.Types.Tracker.t(),
          required(:local_date) => Date.t(),
          required(:timezone) => String.t(),
          required(:recorded_by_type) => :client | :coach,
          required(:recorded_by_id) => String.t(),
          required(:revision) => pos_integer(),
          required(:request_id) => String.t(),
          required(:number_value) => number() | nil,
          required(:entered_unit) => String.t() | nil,
          required(:rating_value) => pos_integer() | nil,
          required(:yes_no_value) => boolean() | nil,
          required(:text_value) => String.t() | nil,
          required(:about_session_id) => String.t() | nil,
          required(:about_meal_id) => String.t() | nil,
          required(:attachments) => [EasyWeb.Types.TrackerAttachment.t()],
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
  @type create :: %{
          required(:tracker_id) => String.t(),
          required(:request_id) => String.t(),
          required(:local_date) => Date.t(),
          optional(:number_value) => number() | nil,
          optional(:entered_unit) => String.t() | nil,
          optional(:rating_value) => pos_integer() | nil,
          optional(:yes_no_value) => boolean() | nil,
          optional(:text_value) => String.t() | nil,
          optional(:about_session_id) => String.t() | nil,
          optional(:about_meal_id) => String.t() | nil,
          optional(:attachment_ids) => [String.t()]
        }
  @type update :: %{
          required(:expected_revision) => pos_integer(),
          required(:request_id) => String.t(),
          required(:local_date) => Date.t(),
          optional(:number_value) => number() | nil,
          optional(:entered_unit) => String.t() | nil,
          optional(:rating_value) => pos_integer() | nil,
          optional(:yes_no_value) => boolean() | nil,
          optional(:text_value) => String.t() | nil,
          optional(:about_session_id) => String.t() | nil,
          optional(:about_meal_id) => String.t() | nil,
          optional(:attachment_ids) => [String.t()]
        }
  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:tracker_id) => String.t(),
          optional(:from) => Date.t(),
          optional(:to) => Date.t()
        }
end

defmodule EasyWeb.Types.TrackerRequest do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:tracker) => EasyWeb.Types.Tracker.t(),
          required(:requested_by) => String.t(),
          required(:requested_at) => DateTime.t(),
          required(:cancelled_at) => DateTime.t() | nil
        }
  @type create :: %{
          required(:tracker_id) => String.t()
        }
end

defmodule EasyWeb.Types.TrackerTemplateItem do
  use EasyWeb.Type

  @type t :: %{
          required(:tracker_id) => String.t(),
          required(:timing) => :daily | :weekly | :after_workout | :after_meal,
          optional(:weekday) => non_neg_integer() | nil
        }
end

defmodule EasyWeb.Types.TrackerTemplateContent do
  use EasyWeb.Type

  @type t :: %{
          required(:items) => [EasyWeb.Types.TrackerTemplateItem.t()]
        }
end

defmodule EasyWeb.Types.TrackerTemplate do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:name) => String.t(),
          required(:description) => String.t() | nil,
          required(:revision) => pos_integer(),
          required(:archived_at) => DateTime.t() | nil,
          required(:content) => EasyWeb.Types.TrackerTemplateContent.t()
        }
  @type create :: %{
          required(:name) => String.t(),
          optional(:description) => String.t() | nil,
          required(:content) => EasyWeb.Types.TrackerTemplateContent.t()
        }
  @type update :: %{
          required(:expected_revision) => pos_integer(),
          optional(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:content) => EasyWeb.Types.TrackerTemplateContent.t()
        }
  @type list_query :: %{
          optional(:cursor) => String.t(),
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer(),
          optional(:search) => String.t(),
          optional(:archived) => boolean()
        }
end

defmodule EasyWeb.Types.TrackerSettings do
  use EasyWeb.Type

  @type t :: %{
          required(:default_tracker_template_id) => String.t() | nil
        }
  @type update :: %{
          required(:default_tracker_template_id) => String.t() | nil,
          optional(:apply_to_existing) => boolean()
        }
end

defmodule EasyWeb.Types.TrackerToday do
  use EasyWeb.Type

  @type t :: %{
          required(:date) => Date.t(),
          required(:due) => [EasyWeb.Types.TrackerAssignment.t()],
          required(:requests) => [EasyWeb.Types.TrackerRequest.t()]
        }
  @type prompt_query :: %{
          optional(:about_session_id) => String.t(),
          optional(:about_meal_id) => String.t()
        }
end

defmodule EasyWeb.Types.TrackerSeriesPoint do
  use EasyWeb.Type

  @type t :: %{
          required(:date) => Date.t(),
          required(:value) => number(),
          required(:entry_id) => String.t()
        }
end

defmodule EasyWeb.Types.TrackerCoverage do
  use EasyWeb.Type

  @type t :: %{
          required(:recorded) => non_neg_integer(),
          required(:total) => non_neg_integer()
        }
end

defmodule EasyWeb.Types.TrackerMetrics do
  use EasyWeb.Type

  @type t :: %{
          required(:tracker) => EasyWeb.Types.Tracker.t(),
          required(:count) => non_neg_integer(),
          required(:latest) => EasyWeb.Types.TrackerEntry.t() | nil,
          required(:previous) => EasyWeb.Types.TrackerEntry.t() | nil,
          required(:first) => EasyWeb.Types.TrackerEntry.t() | nil,
          required(:change) => number() | nil,
          required(:min) => number() | nil,
          required(:max) => number() | nil,
          required(:average) => number() | nil,
          required(:series) => [EasyWeb.Types.TrackerSeriesPoint.t()],
          required(:workout_coverage) => EasyWeb.Types.TrackerCoverage.t(),
          required(:meal_coverage) => EasyWeb.Types.TrackerCoverage.t()
        }
  @type query :: %{
          optional(:from) => Date.t(),
          optional(:to) => Date.t(),
          optional(:previous_date) => Date.t()
        }
end
