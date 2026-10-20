defmodule EasyWeb.Types.LogRestore do
  use EasyWeb.Type
  @type t :: %{required(:undo_token) => String.t()}
end

defmodule EasyWeb.Types.FoodLog do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:meal_item_id) => Ecto.UUID.t() | nil,
          required(:food_id) => Ecto.UUID.t(),
          required(:amount) => number(),
          required(:unit) => String.t(),
          required(:name) => String.t(),
          required(:kind) => :food | :supplement,
          required(:basis) => :"100g" | :"100ml" | :"1unit",
          required(:unit_label) => String.t() | nil,
          required(:servings) => [EasyWeb.Types.Nutrition.FoodServing.t()],
          required(:nutrients) => EasyWeb.Types.Nutrition.NutrientMap.t()
        }

  @type write :: %{
          optional(:id) => Ecto.UUID.t(),
          optional(:meal_item_id) => Ecto.UUID.t() | nil,
          required(:food_id) => Ecto.UUID.t(),
          required(:amount) => number(),
          required(:unit) => String.t()
        }
end

defmodule EasyWeb.Types.NutritionLog do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:type) => :meal | :food | :supplement,
          required(:logged_on) => Date.t(),
          required(:logged_at) => String.t() | nil,
          required(:recorded_by) => Ecto.UUID.t(),
          required(:nutrition_schedule_id) => Ecto.UUID.t() | nil,
          required(:scheduled_date) => Date.t() | nil,
          required(:nutrition_preset_id) => Ecto.UUID.t() | nil,
          required(:meal_option_id) => Ecto.UUID.t() | nil,
          required(:food_logs) => [EasyWeb.Types.FoodLog.t()]
        }

  @type create :: %{
          required(:logged_on) => Date.t(),
          optional(:logged_at) => String.t() | nil,
          optional(:nutrition_schedule_id) => Ecto.UUID.t() | nil,
          optional(:scheduled_date) => Date.t() | nil,
          optional(:meal_option_id) => Ecto.UUID.t() | nil,
          required(:food_logs) => [EasyWeb.Types.FoodLog.write()]
        }
  @type update :: %{
          optional(:logged_on) => Date.t(),
          optional(:logged_at) => String.t() | nil,
          optional(:meal_option_id) => Ecto.UUID.t() | nil,
          optional(:food_logs) => [EasyWeb.Types.FoodLog.write()]
        }
  @type mutation :: %{required(:data) => EasyWeb.Types.NutritionLog.t(), required(:undo_token) => String.t()}

  @spec format(Easy.Nutrition.NutritionLog.t()) :: t()
  def format(%Easy.Nutrition.NutritionLog{} = row) do
    row
    |> Map.take([:id, :type, :logged_on, :recorded_by, :nutrition_schedule_id, :scheduled_date, :nutrition_preset_id, :meal_option_id, :food_logs])
    |> Map.put(:logged_at, if(row.logged_at, do: row.logged_at |> Time.to_iso8601() |> String.slice(0, 5)))
  end
end

defmodule EasyWeb.Types.ResultUnits do
  use EasyWeb.Type
  alias Easy.Workouts.ResultUnits, as: StoredUnits

  @type t() :: %{
          optional(:reps) => :count | :reps | nil,
          optional(:weight) => :kg | :lb | nil,
          optional(:duration) => :s | :min | :"h:mm:ss" | nil,
          optional(:distance) => :m | :km | :mi | :yd | nil,
          optional(:elevation_gain) => :m | :ft | nil,
          optional(:height) => :cm | :in | nil,
          optional(:calories) => :kcal | nil,
          optional(:speed) => :"m/s" | :"km/h" | :mph | :"min/km" | :"min/mi" | :"min/100m" | nil,
          optional(:incline) => :% | nil,
          optional(:level) => :level | nil,
          optional(:power) => :W | nil,
          optional(:cadence) => :rpm | :spm | nil,
          optional(:heart_rate) => :bpm | nil,
          optional(:effort) => :RPE | nil,
          optional(:reserve) => :RIR | nil,
          optional(:successes) => :count | nil,
          optional(:attempts) => :count | nil,
          optional(:score) => :points | nil
        }

  @spec format(StoredUnits.t()) :: t()
  def format(%StoredUnits{} = units) do
    units |> Map.take(StoredUnits.__schema__(:fields)) |> Map.reject(fn {_key, value} -> is_nil(value) end)
  end
end

defmodule EasyWeb.Types.Measurements do
  use EasyWeb.Type

  @type t() :: %{
          optional(:reps) => integer() | nil,
          optional(:weight_kg) => number() | nil,
          optional(:duration_s) => number() | nil,
          optional(:distance_m) => number() | nil,
          optional(:elevation_gain_m) => number() | nil,
          optional(:height_cm) => number() | nil,
          optional(:calories_kcal) => number() | nil,
          optional(:avg_speed_m_s) => number() | nil,
          optional(:incline_pct) => number() | nil,
          optional(:level) => integer() | nil,
          optional(:avg_power_w) => number() | nil,
          optional(:avg_cadence_per_min) => number() | nil,
          optional(:avg_heart_rate_bpm) => number() | nil,
          optional(:effort) => number() | nil,
          optional(:successes) => integer() | nil,
          optional(:attempts) => integer() | nil,
          optional(:score) => number() | nil,
          optional(:result) => :win | :draw | :loss | nil,
          optional(:entered_units) => EasyWeb.Types.ResultUnits.t() | nil
        }

  @spec format_numbers(map()) :: map()
  def format_numbers(values) do
    Map.new(values, fn
      {key, %Decimal{} = value} -> {key, Decimal.to_float(value)}
      pair -> pair
    end)
  end
end

defmodule EasyWeb.Types.ExerciseSet do
  use EasyWeb.Type
  alias EasyWeb.Types.Measurements

  @type t() :: %{
          required(:id) => Ecto.UUID.t(),
          required(:state) => :completed | :skipped,
          required(:round) => pos_integer(),
          required(:side) => :left | :right | nil,
          required(:reps) => integer() | nil,
          required(:weight_kg) => number() | nil,
          required(:duration_s) => number() | nil,
          required(:distance_m) => number() | nil,
          required(:elevation_gain_m) => number() | nil,
          required(:height_cm) => number() | nil,
          required(:calories_kcal) => number() | nil,
          required(:avg_speed_m_s) => number() | nil,
          required(:incline_pct) => number() | nil,
          required(:level) => integer() | nil,
          required(:avg_power_w) => number() | nil,
          required(:avg_cadence_per_min) => number() | nil,
          required(:avg_heart_rate_bpm) => number() | nil,
          required(:effort) => number() | nil,
          required(:reserve) => number() | nil,
          required(:successes) => integer() | nil,
          required(:attempts) => integer() | nil,
          required(:score) => number() | nil,
          required(:result) => :win | :draw | :loss | nil,
          required(:entered_units) => EasyWeb.Types.ResultUnits.t() | nil,
          required(:speed_m_s) => number() | nil,
          required(:power_w) => number() | nil,
          required(:cadence_rpm) => integer() | nil,
          required(:heart_rate_bpm) => integer() | nil,
          required(:grade) => String.t() | nil
        }
  @type record() :: %{
          required(:id) => Ecto.UUID.t(),
          required(:state) => :completed | :skipped,
          required(:round) => pos_integer(),
          optional(:side) => :left | :right | nil,
          optional(:reps) => integer() | nil,
          optional(:weight_kg) => number() | nil,
          optional(:duration_s) => number() | nil,
          optional(:distance_m) => number() | nil,
          optional(:elevation_gain_m) => number() | nil,
          optional(:height_cm) => number() | nil,
          optional(:calories_kcal) => number() | nil,
          optional(:avg_speed_m_s) => number() | nil,
          optional(:incline_pct) => number() | nil,
          optional(:level) => integer() | nil,
          optional(:avg_power_w) => number() | nil,
          optional(:avg_cadence_per_min) => number() | nil,
          optional(:avg_heart_rate_bpm) => number() | nil,
          optional(:effort) => number() | nil,
          optional(:reserve) => number() | nil,
          optional(:successes) => integer() | nil,
          optional(:attempts) => integer() | nil,
          optional(:score) => number() | nil,
          optional(:result) => :win | :draw | :loss | nil,
          optional(:entered_units) => EasyWeb.Types.ResultUnits.t() | nil
        }
  @type correct() :: %{
          optional(:state) => :completed | :skipped,
          optional(:reps) => integer() | nil,
          optional(:weight_kg) => number() | nil,
          optional(:duration_s) => number() | nil,
          optional(:distance_m) => number() | nil,
          optional(:elevation_gain_m) => number() | nil,
          optional(:height_cm) => number() | nil,
          optional(:calories_kcal) => number() | nil,
          optional(:avg_speed_m_s) => number() | nil,
          optional(:incline_pct) => number() | nil,
          optional(:level) => integer() | nil,
          optional(:avg_power_w) => number() | nil,
          optional(:avg_cadence_per_min) => number() | nil,
          optional(:avg_heart_rate_bpm) => number() | nil,
          optional(:effort) => number() | nil,
          optional(:reserve) => number() | nil,
          optional(:successes) => integer() | nil,
          optional(:attempts) => integer() | nil,
          optional(:score) => number() | nil,
          optional(:result) => :win | :draw | :loss | nil,
          optional(:entered_units) => EasyWeb.Types.ResultUnits.t() | nil
        }

  @spec format(Easy.Workouts.ExerciseSet.t()) :: t()
  def format(%Easy.Workouts.ExerciseSet{} = row) do
    row
    |> Map.take([
      :id,
      :state,
      :round,
      :side,
      :reps,
      :weight_kg,
      :duration_s,
      :distance_m,
      :elevation_gain_m,
      :height_cm,
      :calories_kcal,
      :avg_speed_m_s,
      :incline_pct,
      :level,
      :avg_power_w,
      :avg_cadence_per_min,
      :avg_heart_rate_bpm,
      :effort,
      :reserve,
      :successes,
      :attempts,
      :score,
      :result,
      :entered_units,
      :speed_m_s,
      :power_w,
      :cadence_rpm,
      :heart_rate_bpm,
      :grade
    ])
    |> Measurements.format_numbers()
  end
end

defmodule EasyWeb.Types.ExerciseLog do
  use EasyWeb.Type
  alias EasyWeb.Types.Measurements

  @type t() :: %{
          required(:id) => Ecto.UUID.t(),
          required(:exercise_id) => Ecto.UUID.t(),
          required(:exercise) => EasyWeb.Types.Exercise.t(),
          required(:workout_exercise_id) => Ecto.UUID.t() | nil,
          required(:state) => :active | :completed | :skipped,
          required(:position) => non_neg_integer(),
          required(:side_mode) => :combined | :per_side,
          required(:rounds) => pos_integer(),
          required(:targets_mode) => :same_for_all | :per_round,
          required(:targets) => [EasyWeb.Types.WorkoutRoundTargets.t()],
          required(:reps) => integer() | nil,
          required(:weight_kg) => number() | nil,
          required(:duration_s) => number() | nil,
          required(:distance_m) => number() | nil,
          required(:elevation_gain_m) => number() | nil,
          required(:height_cm) => number() | nil,
          required(:calories_kcal) => number() | nil,
          required(:avg_speed_m_s) => number() | nil,
          required(:incline_pct) => number() | nil,
          required(:level) => integer() | nil,
          required(:avg_power_w) => number() | nil,
          required(:avg_cadence_per_min) => number() | nil,
          required(:avg_heart_rate_bpm) => number() | nil,
          required(:effort) => number() | nil,
          required(:successes) => integer() | nil,
          required(:attempts) => integer() | nil,
          required(:score) => number() | nil,
          required(:result) => :win | :draw | :loss | nil,
          required(:entered_units) => EasyWeb.Types.ResultUnits.t() | nil,
          required(:sets) => [EasyWeb.Types.ExerciseSet.t()]
        }
  @type start() :: %{
          required(:id) => Ecto.UUID.t(),
          required(:exercise_id) => Ecto.UUID.t(),
          optional(:workout_exercise_id) => Ecto.UUID.t() | nil,
          optional(:side_mode) => :combined | :per_side
        }
  @type update() :: %{
          optional(:rounds) => pos_integer(),
          optional(:targets_mode) => :same_for_all | :per_round,
          optional(:targets) => [EasyWeb.Types.WorkoutRoundTargets.create()],
          optional(:reps) => integer() | nil,
          optional(:weight_kg) => number() | nil,
          optional(:duration_s) => number() | nil,
          optional(:distance_m) => number() | nil,
          optional(:elevation_gain_m) => number() | nil,
          optional(:height_cm) => number() | nil,
          optional(:calories_kcal) => number() | nil,
          optional(:avg_speed_m_s) => number() | nil,
          optional(:incline_pct) => number() | nil,
          optional(:level) => integer() | nil,
          optional(:avg_power_w) => number() | nil,
          optional(:avg_cadence_per_min) => number() | nil,
          optional(:avg_heart_rate_bpm) => number() | nil,
          optional(:effort) => number() | nil,
          optional(:successes) => integer() | nil,
          optional(:attempts) => integer() | nil,
          optional(:score) => number() | nil,
          optional(:result) => :win | :draw | :loss | nil,
          optional(:entered_units) => EasyWeb.Types.ResultUnits.t() | nil
        }
  @type replace() :: %{
          required(:id) => Ecto.UUID.t(),
          required(:exercise_id) => Ecto.UUID.t()
        }

  @spec format(Easy.Workouts.ExerciseLog.t()) :: t()
  def format(%Easy.Workouts.ExerciseLog{} = row) do
    row
    |> Map.take([
      :id,
      :exercise_id,
      :exercise,
      :workout_exercise_id,
      :state,
      :position,
      :side_mode,
      :rounds,
      :targets_mode,
      :targets,
      :reps,
      :weight_kg,
      :duration_s,
      :distance_m,
      :elevation_gain_m,
      :height_cm,
      :calories_kcal,
      :avg_speed_m_s,
      :incline_pct,
      :level,
      :avg_power_w,
      :avg_cadence_per_min,
      :avg_heart_rate_bpm,
      :effort,
      :successes,
      :attempts,
      :score,
      :result,
      :entered_units,
      :sets
    ])
    |> Measurements.format_numbers()
  end
end

defmodule EasyWeb.Types.WorkoutLog do
  use EasyWeb.Type

  @type t() :: %{
          required(:id) => Ecto.UUID.t(),
          required(:client_id) => Ecto.UUID.t(),
          required(:date) => Date.t(),
          required(:time) => String.t() | nil,
          required(:state) => :active | :completed | :discarded,
          required(:recorded_by) => :client | :coach,
          required(:coach_id) => Ecto.UUID.t() | nil,
          required(:recorder_name) => String.t(),
          required(:effort) => integer() | nil,
          required(:pain) => boolean() | nil,
          required(:text) => String.t() | nil,
          required(:workout_id) => Ecto.UUID.t() | nil,
          required(:schedule_id) => Ecto.UUID.t() | nil,
          required(:scheduled_date) => Date.t() | nil,
          required(:exercise_logs) => [EasyWeb.Types.ExerciseLog.t()],
          required(:inserted_at) => DateTime.t(),
          required(:updated_at) => DateTime.t()
        }
  @type list_query() :: %{
          optional(:date) => Date.t(),
          optional(:scheduled_date) => Date.t(),
          optional(:state) => :active | :completed | :discarded,
          optional(:offset) => non_neg_integer(),
          optional(:limit) => pos_integer()
        }
  @type start() :: %{
          optional(:id) => Ecto.UUID.t(),
          optional(:date) => Date.t(),
          optional(:time) => String.t() | nil,
          optional(:workout_id) => Ecto.UUID.t() | nil,
          optional(:schedule_id) => Ecto.UUID.t() | nil,
          optional(:scheduled_date) => Date.t() | nil
        }
  @type update() :: %{
          optional(:date) => Date.t(),
          optional(:time) => String.t() | nil,
          optional(:effort) => integer() | nil,
          optional(:pain) => boolean() | nil,
          optional(:text) => String.t() | nil
        }
  @type feedback() :: %{
          optional(:effort) => integer() | nil,
          optional(:pain) => boolean() | nil,
          optional(:text) => String.t() | nil
        }

  @spec format(Easy.Workouts.WorkoutLog.t()) :: t()
  def format(%Easy.Workouts.WorkoutLog{} = row) do
    row
    |> Map.take([
      :id,
      :client_id,
      :date,
      :time,
      :state,
      :recorded_by,
      :coach_id,
      :recorder_name,
      :effort,
      :pain,
      :text,
      :workout_id,
      :schedule_id,
      :scheduled_date,
      :exercise_logs,
      :inserted_at,
      :updated_at
    ])
    |> Map.put(:time, if(row.time, do: row.time |> Time.to_iso8601() |> String.slice(0, 5)))
  end
end

defmodule EasyWeb.Types.WorkoutLogIndex do
  use EasyWeb.Type
  @type t :: %{required(:count) => non_neg_integer(), required(:workout_logs) => [EasyWeb.Types.WorkoutLog.t()]}
end

defmodule EasyWeb.Types.ClientDay do
  use EasyWeb.Type

  @type t :: %{
          required(:date) => Date.t(),
          required(:today) => Date.t(),
          required(:nutrition_schedules) => [EasyWeb.Types.Nutrition.NutritionSchedule.t()],
          required(:presets) => [EasyWeb.Types.Nutrition.NutritionPreset.t()],
          required(:workout_schedules) => [EasyWeb.Types.WorkoutSchedule.t()],
          required(:workouts) => [EasyWeb.Types.Workout.t()],
          required(:coaches) => [EasyWeb.Types.WorkoutCoach.t()],
          required(:target_set) => EasyWeb.Types.Nutrition.NutritionTargets.t() | nil,
          required(:nutrients) => [EasyWeb.Types.Nutrition.Nutrient.t()],
          required(:nutrition_logs) => [EasyWeb.Types.NutritionLog.t()],
          required(:workout_logs) => [EasyWeb.Types.WorkoutLog.t()],
          required(:active_workout) => EasyWeb.Types.WorkoutLog.t() | nil
        }
end

defmodule EasyWeb.Types.WeekMarker do
  use EasyWeb.Type
  @type t :: %{required(:date) => Date.t(), required(:has_records) => boolean()}
  @type query :: %{required(:from) => Date.t()}
  @type index :: %{required(:data) => [EasyWeb.Types.WeekMarker.t()]}
end

defmodule EasyWeb.Types.ClientExerciseQuery do
  use EasyWeb.Type
  @type t :: %{optional(:search) => String.t(), optional(:cursor) => String.t(), optional(:limit) => pos_integer()}
end
