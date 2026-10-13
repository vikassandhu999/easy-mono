defmodule EasyWeb.Types.Exercise do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          required(:kind) => :movement | :activity | :sport | :practice,
          required(:goals) => [String.t()],
          required(:places) => [String.t()],
          required(:metrics) => [String.t()],
          required(:count_label) => String.t() | nil,
          required(:grade_scale) => [String.t()],
          required(:unilateral) => boolean(),
          required(:equipment) => [String.t()],
          required(:muscles) => [String.t()],
          required(:media) => String.t() | nil,
          required(:is_builtin) => boolean()
        }
  @type create :: %{
          required(:name) => String.t(),
          required(:kind) => :movement | :activity | :sport | :practice,
          required(:goals) => [String.t()],
          required(:places) => [String.t()],
          optional(:metrics) => [String.t()],
          optional(:count_label) => String.t() | nil,
          optional(:grade_scale) => [String.t()],
          optional(:unilateral) => boolean(),
          optional(:equipment) => [String.t()],
          optional(:muscles) => [String.t()],
          optional(:media) => String.t() | nil
        }
  @type update :: %{
          optional(:name) => String.t(),
          optional(:kind) => :movement | :activity | :sport | :practice,
          optional(:goals) => [String.t()],
          optional(:places) => [String.t()],
          optional(:metrics) => [String.t()],
          optional(:count_label) => String.t() | nil,
          optional(:grade_scale) => [String.t()],
          optional(:unilateral) => boolean(),
          optional(:equipment) => [String.t()],
          optional(:muscles) => [String.t()],
          optional(:media) => String.t() | nil
        }
  @type list_query :: %{
          optional(:search) => String.t(),
          optional(:kind) => :movement | :activity | :sport | :practice,
          optional(:goal) => String.t(),
          optional(:place) => String.t(),
          optional(:equipment) => String.t(),
          optional(:muscle) => String.t(),
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer()
        }
  @spec format(Easy.Workouts.Exercise.t()) :: t()
  def format(%Easy.Workouts.Exercise{} = row),
    do:
      row
      |> Map.take([
        :id,
        :name,
        :kind,
        :goals,
        :places,
        :metrics,
        :count_label,
        :grade_scale,
        :unilateral,
        :equipment,
        :muscles,
        :media
      ])
      |> Map.put(:is_builtin, is_nil(row.business_id))

  def format(%{"id" => _} = snapshot), do: take(snapshot)
  def format(%{is_builtin: _} = exercise), do: exercise
end

defmodule EasyWeb.Types.ExerciseIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Exercise.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.WorkoutTarget do
  use EasyWeb.Type

  @type t ::
          %{required(:mode) => :exact, required(:value) => number() | String.t()}
          | %{required(:mode) => :range, required(:min) => number(), required(:max) => number()}
          | %{required(:mode) => :max}
end

defmodule EasyWeb.Types.WorkoutTargets do
  use EasyWeb.Type
  @type t :: %{optional(String.t()) => EasyWeb.Types.WorkoutTarget.t()}
end

defmodule EasyWeb.Types.WorkoutExercise do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:exercise_id) => Ecto.UUID.t(),
          required(:exercise) => EasyWeb.Types.Exercise.t(),
          required(:targets_mode) => :same_for_all | :per_round,
          required(:targets) => [EasyWeb.Types.WorkoutTargets.t()],
          required(:rest) => [EasyWeb.Types.WorkoutTarget.t() | nil]
        }
  @type create :: %{
          optional(:id) => Ecto.UUID.t(),
          required(:exercise_id) => Ecto.UUID.t(),
          optional(:targets_mode) => :same_for_all | :per_round,
          optional(:targets) => [EasyWeb.Types.WorkoutTargets.t()],
          optional(:rest) => [EasyWeb.Types.WorkoutTarget.t() | nil]
        }
  @spec format(Easy.Workouts.WorkoutExercise.t()) :: t()
  def format(%Easy.Workouts.WorkoutExercise{} = row),
    do: row |> Map.take([:id, :exercise_id, :targets_mode, :targets, :rest]) |> Map.put(:exercise, row.exercise_snapshot)

  def format(%{exercise: _} = row), do: row
end

defmodule EasyWeb.Types.ExerciseGroup do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t() | nil,
          required(:rounds) => pos_integer(),
          required(:exercises) => [EasyWeb.Types.WorkoutExercise.t()]
        }
  @type create :: %{
          optional(:id) => Ecto.UUID.t(),
          optional(:name) => String.t() | nil,
          required(:rounds) => pos_integer(),
          required(:exercises) => [EasyWeb.Types.WorkoutExercise.create()]
        }
end

defmodule EasyWeb.Types.Workout do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:client_id) => Ecto.UUID.t() | nil,
          required(:name) => String.t(),
          required(:description) => String.t() | nil,
          required(:type) => :prescribed | :video | :open,
          required(:video) => String.t() | nil,
          required(:groups) => [EasyWeb.Types.ExerciseGroup.t()]
        }
  @type create :: %{
          required(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:type) => :prescribed | :video | :open,
          optional(:video) => String.t() | nil,
          optional(:groups) => [EasyWeb.Types.ExerciseGroup.create()]
        }
  @type update :: %{
          optional(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:type) => :prescribed | :video | :open,
          optional(:video) => String.t() | nil,
          optional(:groups) => [EasyWeb.Types.ExerciseGroup.create()]
        }
  @type list_query :: %{
          optional(:search) => String.t(),
          optional(:type) => :prescribed | :video | :open,
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer()
        }
  @type mutation :: %{required(:data) => EasyWeb.Types.Workout.t(), required(:undo_token) => String.t()}
end

defmodule EasyWeb.Types.WorkoutIndex do
  use EasyWeb.Type

  @type t :: %{
          required(:data) => [EasyWeb.Types.Workout.t()],
          required(:count) => non_neg_integer(),
          required(:next_cursor) => String.t() | nil
        }
end

defmodule EasyWeb.Types.WorkoutSchedule do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:workout_id) => Ecto.UUID.t(),
          required(:client_id) => Ecto.UUID.t(),
          required(:weekdays_mask) => pos_integer(),
          required(:from_date) => Date.t(),
          required(:until_date) => Date.t() | nil,
          required(:time) => String.t() | nil,
          required(:place) => String.t() | nil,
          required(:meeting_url) => String.t() | nil,
          required(:coach_id) => Ecto.UUID.t() | nil
        }
  @type create :: %{
          optional(:workout_id) => Ecto.UUID.t(),
          optional(:library_workout_id) => Ecto.UUID.t(),
          required(:weekdays_mask) => pos_integer(),
          optional(:time) => String.t() | nil,
          optional(:place) => String.t() | nil,
          optional(:meeting_url) => String.t() | nil,
          optional(:coach_id) => Ecto.UUID.t() | nil
        }
  @type update :: %{
          optional(:weekdays_mask) => pos_integer(),
          optional(:time) => String.t() | nil,
          optional(:place) => String.t() | nil,
          optional(:meeting_url) => String.t() | nil,
          optional(:coach_id) => Ecto.UUID.t() | nil
        }
  @type mutation :: %{required(:data) => EasyWeb.Types.WorkoutSchedule.t(), required(:undo_token) => String.t()}
  @type remove_query :: %{optional(:weekday) => pos_integer()}
  @spec format(Easy.Workouts.WorkoutSchedule.t()) :: t()
  def format(%Easy.Workouts.WorkoutSchedule{} = row) do
    time = if row.time, do: row.time |> Time.to_iso8601() |> String.slice(0, 5), else: nil

    row
    |> Map.take([
      :id,
      :workout_id,
      :client_id,
      :weekdays_mask,
      :from_date,
      :until_date,
      :place,
      :meeting_url,
      :coach_id
    ])
    |> Map.put(:time, time)
  end

  def format(%{time: _} = row), do: row
end

defmodule EasyWeb.Types.WorkoutCoach do
  use EasyWeb.Type
  @type t :: %{required(:id) => Ecto.UUID.t(), required(:name) => String.t()}
end

defmodule EasyWeb.Types.WorkoutWeek do
  use EasyWeb.Type

  @type t :: %{
          required(:today) => Date.t(),
          required(:workouts) => [EasyWeb.Types.Workout.t()],
          required(:schedules) => [EasyWeb.Types.WorkoutSchedule.t()],
          required(:coaches) => [EasyWeb.Types.WorkoutCoach.t()]
        }
  @type query :: %{optional(:on) => Date.t()}
  @type mutation :: %{required(:data) => EasyWeb.Types.WorkoutWeek.t(), required(:undo_token) => String.t()}
  @type undo :: %{required(:token) => String.t()}
end
