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

defmodule EasyWeb.Types.EnteredUnits do
  use EasyWeb.Type
  @type t :: %{optional(String.t()) => String.t()}
end

defmodule EasyWeb.Types.WorkoutSwaps do
  use EasyWeb.Type
  @type t :: %{optional(String.t()) => Ecto.UUID.t()}
end

defmodule EasyWeb.Types.SwapExercises do
  use EasyWeb.Type
  @type t :: %{optional(String.t()) => EasyWeb.Types.Exercise.t()}
end

defmodule EasyWeb.Types.ExerciseSet do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:workout_exercise_id) => Ecto.UUID.t() | nil,
          required(:exercise_id) => Ecto.UUID.t(),
          required(:exercise) => EasyWeb.Types.Exercise.t(),
          required(:round) => pos_integer(),
          required(:side) => :left | :right | nil,
          required(:entered_units) => EasyWeb.Types.EnteredUnits.t(),
          required(:reps) => integer() | nil,
          required(:weight_kg) => number() | nil,
          required(:duration_s) => integer() | nil,
          required(:distance_m) => number() | nil,
          required(:elevation_gain_m) => number() | nil,
          required(:height_cm) => number() | nil,
          required(:calories_kcal) => number() | nil,
          required(:speed_m_s) => number() | nil,
          required(:incline_pct) => number() | nil,
          required(:level) => integer() | nil,
          required(:power_w) => number() | nil,
          required(:cadence_rpm) => integer() | nil,
          required(:heart_rate_bpm) => integer() | nil,
          required(:effort) => number() | nil,
          required(:reserve) => number() | nil,
          required(:successes) => integer() | nil,
          required(:attempts) => integer() | nil,
          required(:score) => number() | nil,
          required(:result) => :win | :draw | :loss | nil,
          required(:grade) => String.t() | nil
        }

  @type write :: %{
          optional(:id) => Ecto.UUID.t(),
          optional(:workout_exercise_id) => Ecto.UUID.t() | nil,
          required(:exercise_id) => Ecto.UUID.t(),
          required(:round) => pos_integer(),
          optional(:side) => :left | :right | nil,
          optional(:entered_units) => EasyWeb.Types.EnteredUnits.t(),
          optional(:reps) => integer() | nil,
          optional(:weight_kg) => number() | nil,
          optional(:duration_s) => integer() | nil,
          optional(:distance_m) => number() | nil,
          optional(:elevation_gain_m) => number() | nil,
          optional(:height_cm) => number() | nil,
          optional(:calories_kcal) => number() | nil,
          optional(:speed_m_s) => number() | nil,
          optional(:incline_pct) => number() | nil,
          optional(:level) => integer() | nil,
          optional(:power_w) => number() | nil,
          optional(:cadence_rpm) => integer() | nil,
          optional(:heart_rate_bpm) => integer() | nil,
          optional(:effort) => number() | nil,
          optional(:reserve) => number() | nil,
          optional(:successes) => integer() | nil,
          optional(:attempts) => integer() | nil,
          optional(:score) => number() | nil,
          optional(:result) => :win | :draw | :loss | nil,
          optional(:grade) => String.t() | nil
        }
end

defmodule EasyWeb.Types.WorkoutLog do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => Ecto.UUID.t(),
          required(:date) => Date.t(),
          required(:time) => String.t() | nil,
          required(:at_utc) => DateTime.t() | nil,
          required(:text) => String.t() | nil,
          required(:recorded_by) => Ecto.UUID.t(),
          required(:state) => :active | :completed | :discarded,
          required(:difficulty) => :too_easy | :just_right | :too_hard | nil,
          required(:pain) => boolean() | nil,
          required(:pain_note) => String.t() | nil,
          required(:workout_id) => Ecto.UUID.t() | nil,
          required(:schedule_id) => Ecto.UUID.t() | nil,
          required(:scheduled_date) => Date.t() | nil,
          required(:sets) => [EasyWeb.Types.ExerciseSet.t()],
          required(:swaps) => EasyWeb.Types.WorkoutSwaps.t(),
          required(:swap_exercises) => EasyWeb.Types.SwapExercises.t()
        }
  @type start :: %{
          required(:date) => Date.t(),
          optional(:time) => String.t() | nil,
          optional(:text) => String.t() | nil,
          optional(:workout_id) => Ecto.UUID.t() | nil,
          optional(:schedule_id) => Ecto.UUID.t() | nil,
          optional(:scheduled_date) => Date.t() | nil
        }
  @type update :: %{
          optional(:time) => String.t() | nil,
          optional(:text) => String.t() | nil,
          optional(:sets) => [EasyWeb.Types.ExerciseSet.write()],
          optional(:swaps) => EasyWeb.Types.WorkoutSwaps.t()
        }
  @type finish :: %{
          optional(:time) => String.t() | nil,
          optional(:text) => String.t() | nil,
          optional(:sets) => [EasyWeb.Types.ExerciseSet.write()],
          optional(:swaps) => EasyWeb.Types.WorkoutSwaps.t(),
          required(:difficulty) => :too_easy | :just_right | :too_hard,
          required(:pain) => boolean(),
          optional(:pain_note) => String.t() | nil
        }
  @type mutation :: %{required(:data) => EasyWeb.Types.WorkoutLog.t(), required(:undo_token) => String.t()}

  @spec format(Easy.Workouts.WorkoutLog.t()) :: t()
  def format(%Easy.Workouts.WorkoutLog{} = row), do: Easy.WorkoutLogs.present(row)
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
