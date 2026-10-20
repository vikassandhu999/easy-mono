defmodule EasyWeb.Types.Exercise do
  use EasyWeb.Type

  @type metric_key ::
          :reps
          | :weight
          | :duration
          | :distance
          | :elevation_gain
          | :height
          | :calories
          | :speed
          | :incline
          | :level
          | :power
          | :cadence
          | :heart_rate
          | :effort
          | :reserve
          | :successes
          | :attempts
          | :score
          | :result
          | :tempo
  @type metric :: %{required(:key) => metric_key(), required(:label) => String.t() | nil}
  @type metric_input :: %{required(:key) => metric_key(), optional(:label) => String.t() | nil}
  @type media :: %{required(:id) => Ecto.UUID.t(), required(:url) => String.t(), required(:caption) => String.t() | nil}
  @type media_input :: %{
          optional(:id) => Ecto.UUID.t(),
          required(:url) => String.t(),
          optional(:caption) => String.t() | nil
        }
  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:name) => String.t(),
          required(:instructions) => String.t() | nil,
          required(:kind) => :movement | :activity | :sport | :practice,
          required(:goals) => [String.t()],
          required(:places) => [String.t()],
          required(:metrics) => [metric()],
          required(:equipment) => String.t() | nil,
          required(:muscles) => [String.t()],
          required(:media) => [media()],
          required(:archived_at) => DateTime.t() | nil,
          required(:is_builtin) => boolean()
        }
  @type create :: %{
          required(:name) => String.t(),
          required(:kind) => :movement | :activity | :sport | :practice,
          optional(:instructions) => String.t() | nil,
          optional(:goals) => [String.t()],
          optional(:places) => [String.t()],
          optional(:metrics) => [metric_input()],
          optional(:equipment) => String.t() | nil,
          optional(:muscles) => [String.t()],
          optional(:media) => [media_input()]
        }
  @type update :: %{
          optional(:name) => String.t(),
          optional(:kind) => :movement | :activity | :sport | :practice,
          optional(:instructions) => String.t() | nil,
          optional(:goals) => [String.t()],
          optional(:places) => [String.t()],
          optional(:metrics) => [metric_input()],
          optional(:equipment) => String.t() | nil,
          optional(:muscles) => [String.t()],
          optional(:media) => [media_input()]
        }
  @type list_query :: %{
          optional(:search) => String.t(),
          optional(:kind) => :movement | :activity | :sport | :practice,
          optional(:goal) => String.t(),
          optional(:place) => String.t(),
          optional(:equipment) => String.t(),
          optional(:muscle) => String.t(),
          optional(:archived) => boolean(),
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer()
        }

  @spec format(Easy.Workouts.Exercise.t()) :: t()
  def format(%Easy.Workouts.Exercise{} = row) do
    row
    |> Map.take([:id, :name, :instructions, :kind, :goals, :places, :equipment, :muscles, :archived_at])
    |> Map.put(:goals, Enum.map(row.goals, &to_string/1))
    |> Map.put(:places, Enum.map(row.places, &to_string/1))
    |> Map.put(:metrics, Enum.map(row.metrics, &Map.take(&1, [:key, :label])))
    |> Map.put(:media, Enum.map(row.media, &%{id: &1.id, url: &1.attachment.external_url, caption: &1.caption}))
    |> Map.put(:is_builtin, is_nil(row.business_id))
  end

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

  @type t :: %{
          required(:mode) => :client_chooses | :exact | :range | :max,
          optional(:value) => number() | String.t(),
          optional(:min) => number(),
          optional(:max) => number()
        }
end

defmodule EasyWeb.Types.WorkoutRestTarget do
  use EasyWeb.Type

  @type t :: %{
          required(:mode) => :client_chooses | :none | :exact | :range,
          optional(:value_s) => number(),
          optional(:min_s) => number(),
          optional(:max_s) => number()
        }
end

defmodule EasyWeb.Types.WorkoutRoundTargets do
  use EasyWeb.Type

  @type t :: %{
          optional(:reps) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:weight) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:duration) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:distance) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:elevation_gain) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:height) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:calories) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:speed) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:incline) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:level) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:power) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:cadence) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:heart_rate) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:effort) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:reserve) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:successes) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:attempts) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:score) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:result) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:grade) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:tempo) => EasyWeb.Types.WorkoutTarget.t() | nil,
          required(:rest) => EasyWeb.Types.WorkoutRestTarget.t()
        }
  @type create :: %{
          optional(:reps) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:weight) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:duration) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:distance) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:elevation_gain) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:height) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:calories) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:speed) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:incline) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:level) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:power) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:cadence) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:heart_rate) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:effort) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:reserve) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:successes) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:attempts) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:score) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:result) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:grade) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:tempo) => EasyWeb.Types.WorkoutTarget.t() | nil,
          optional(:rest) => EasyWeb.Types.WorkoutRestTarget.t() | nil
        }
  @spec format(Easy.Workouts.RoundTargets.t()) :: t()
  def format(%Easy.Workouts.RoundTargets{} = round) do
    round.__struct__.__schema__(:embeds)
    |> Enum.flat_map(fn field ->
      case Map.fetch!(round, field) do
        nil ->
          []

        target ->
          [
            {field,
             target
             |> Map.take(target.__struct__.__schema__(:fields))
             |> Enum.reject(fn {_key, value} -> is_nil(value) end)
             |> Map.new(fn {key, value} -> {key, numeric_value(value)} end)}
          ]
      end
    end)
    |> Map.new()
  end

  def format(%{rest: _} = round), do: round

  defp numeric_value(%Decimal{} = value), do: Decimal.to_float(value)
  defp numeric_value(value), do: value
end

defmodule EasyWeb.Types.WorkoutExercise do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:exercise_id) => Ecto.UUID.t(),
          required(:exercise) => EasyWeb.Types.Exercise.t(),
          required(:side_mode) => :combined | :per_side,
          required(:targets_mode) => :same_for_all | :per_round,
          required(:targets) => [EasyWeb.Types.WorkoutRoundTargets.t()]
        }
  @type create :: %{
          optional(:id) => Ecto.UUID.t(),
          required(:exercise_id) => Ecto.UUID.t(),
          optional(:side_mode) => :combined | :per_side,
          optional(:targets_mode) => :same_for_all | :per_round,
          optional(:targets) => [EasyWeb.Types.WorkoutRoundTargets.create()]
        }
  @spec format(Easy.Workouts.WorkoutExercise.t()) :: t()
  def format(%Easy.Workouts.WorkoutExercise{} = row), do: take(row)
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

  alias EasyWeb.Types.ExerciseGroup

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:client_id) => Ecto.UUID.t() | nil,
          required(:name) => String.t(),
          required(:description) => String.t() | nil,
          required(:type) => :prescribed | :video | :open,
          required(:video) => %{required(:id) => Ecto.UUID.t(), required(:url) => String.t()} | nil,
          required(:groups) => [ExerciseGroup.t()]
        }
  @type create :: %{
          required(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:type) => :prescribed | :video | :open,
          optional(:video_url) => String.t() | nil,
          optional(:groups) => [ExerciseGroup.create()]
        }
  @type update :: %{
          optional(:name) => String.t(),
          optional(:description) => String.t() | nil,
          optional(:type) => :prescribed | :video | :open,
          optional(:video_url) => String.t() | nil,
          optional(:groups) => [ExerciseGroup.create()]
        }
  @type list_query :: %{
          optional(:search) => String.t(),
          optional(:type) => :prescribed | :video | :open,
          optional(:cursor) => String.t(),
          optional(:limit) => pos_integer()
        }
  @type mutation :: %{required(:data) => EasyWeb.Types.Workout.t(), required(:undo_token) => String.t()}
  @spec format(Easy.Workouts.Workout.t()) :: t()
  def format(%Easy.Workouts.Workout{} = row) do
    %{
      id: row.id,
      client_id: row.client_id,
      name: row.name,
      description: row.description,
      type: row.type,
      groups: Enum.map(row.groups, &ExerciseGroup.take/1),
      video: if(row.video_id, do: %{id: row.video_id, url: row.video.external_url}, else: nil)
    }
  end
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
          optional(:from_date) => Date.t(),
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
