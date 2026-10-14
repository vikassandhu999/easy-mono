defmodule Easy.Workouts.ExerciseSet do
  use Ecto.Schema
  import Ecto.Changeset
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  @metric_fields [
    reps: "reps",
    weight_kg: "weight",
    duration_s: "duration",
    distance_m: "distance",
    elevation_gain_m: "elevation_gain",
    height_cm: "height",
    calories_kcal: "calories",
    speed_m_s: "speed",
    incline_pct: "incline",
    level: "level",
    power_w: "power",
    cadence_rpm: "cadence",
    heart_rate_bpm: "heart_rate",
    effort: "effort",
    reserve: "reserve",
    successes: "successes",
    attempts: "attempts",
    score: "score",
    result: "result",
    grade: "grade"
  ]
  @integers [:reps, :duration_s, :level, :cadence_rpm, :heart_rate_bpm, :successes, :attempts]
  @decimals [
    :weight_kg,
    :distance_m,
    :elevation_gain_m,
    :height_cm,
    :calories_kcal,
    :speed_m_s,
    :incline_pct,
    :power_w,
    :effort,
    :reserve,
    :score
  ]
  @units %{
    "weight" => ~w(kg lb),
    "duration" => ~w(s min h:mm:ss),
    "distance" => ~w(m km mi yd),
    "elevation_gain" => ~w(m ft),
    "height" => ~w(cm in),
    "calories" => ~w(kcal),
    "speed" => ["m/s", "km/h", "mph", "min/km", "min/mi", "min/100m"],
    "incline" => ~w(%),
    "power" => ~w(W),
    "cadence" => ~w(rpm spm),
    "heart_rate" => ~w(bpm),
    "effort" => ~w(RPE),
    "reserve" => ~w(RIR),
    "reps" => ~w(count reps),
    "level" => ~w(level),
    "successes" => ~w(count),
    "attempts" => ~w(count),
    "score" => ~w(points)
  }

  schema "exercise_sets" do
    field :round, :integer
    field :side, Ecto.Enum, values: [:left, :right]
    for key <- @integers, do: field(key, :integer)
    for key <- @decimals, do: field(key, :decimal)
    field :result, Ecto.Enum, values: [:win, :draw, :loss]
    field :grade, :string
    field :entered_units, :map, default: %{}
    field :exercise_snapshot, :map
    belongs_to :business, Easy.Orgs.Business
    belongs_to :workout_log, Easy.Workouts.WorkoutLog
    belongs_to :workout_exercise, Easy.Workouts.WorkoutExercise
    belongs_to :exercise, Easy.Workouts.Exercise
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t() | nil, String.t(), map(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, log_id, prescribed_id, exercise_id, snapshot, attrs) do
    %__MODULE__{}
    |> change(%{
      business_id: business_id,
      workout_log_id: log_id,
      workout_exercise_id: prescribed_id,
      exercise_id: exercise_id,
      exercise_snapshot: snapshot
    })
    |> update_changeset(attrs)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, [:round, :side, :entered_units] ++ Keyword.keys(@metric_fields))
    |> validate_required([:round, :business_id, :workout_log_id, :exercise_id, :exercise_snapshot])
    |> validate_number(:round, greater_than: 0, less_than_or_equal_to: 10_000)
    |> validate_metrics()
    |> validate_ranges()
    |> check_constraint(:round, name: :exercise_sets_values)
    |> check_constraint(:side, name: :exercise_sets_snapshot_valid)
    |> check_constraint(:exercise_id, name: :exercise_sets_metrics_valid)
    |> unique_constraint(:round, name: :exercise_sets_prescribed_round)
    |> foreign_key_constraint(:workout_exercise_id, name: :exercise_sets_prescribed_workout)
    |> foreign_key_constraint(:exercise_id, name: :exercise_sets_exercise_tenant)
  end

  defp validate_metrics(cs) do
    snapshot = get_field(cs, :exercise_snapshot) || %{}
    metrics = snapshot["metrics"] || []

    cs
    |> validate_selected_metrics(metrics)
    |> validate_side(snapshot)
    |> validate_grade(snapshot)
    |> validate_units(metrics)
  end

  defp validate_selected_metrics(cs, metrics) do
    Enum.reduce(@metric_fields, cs, fn {field, metric}, acc ->
      if get_field(acc, field) != nil && metric not in metrics,
        do: add_error(acc, field, "does not apply to this exercise"),
        else: acc
    end)
  end

  defp validate_side(cs, snapshot) do
    unilateral = snapshot["unilateral"] == true
    has_side = not is_nil(get_field(cs, :side))
    if unilateral == has_side, do: cs, else: add_error(cs, :side, "must match the exercise sides")
  end

  defp validate_grade(cs, snapshot) do
    grade = get_field(cs, :grade)

    if grade && grade not in (snapshot["grade_scale"] || []),
      do: add_error(cs, :grade, "choose a grade on this exercise's scale"),
      else: cs
  end

  defp validate_units(cs, metrics) do
    units = get_field(cs, :entered_units) || %{}

    if Enum.all?(units, fn {metric, unit} -> metric in metrics && unit in Map.get(@units, metric, []) end),
      do: cs,
      else: add_error(cs, :entered_units, "use a registered unit for this exercise")
  end

  defp validate_ranges(cs) do
    nonnegative = @integers ++ (@decimals -- [:weight_kg, :incline_pct, :score, :effort, :reserve])
    cs = Enum.reduce(nonnegative, cs, &validate_number(&2, &1, greater_than_or_equal_to: 0))

    cs =
      cs
      |> validate_number(:level, greater_than_or_equal_to: 1)
      |> validate_number(:effort, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
      |> validate_number(:reserve, greater_than_or_equal_to: 0, less_than_or_equal_to: 10)

    if get_field(cs, :successes) && get_field(cs, :attempts) && get_field(cs, :successes) > get_field(cs, :attempts),
      do: add_error(cs, :successes, "must not exceed attempts"),
      else: cs
  end

  @spec metric_fields() :: [atom()]
  def metric_fields, do: Keyword.keys(@metric_fields)
end
