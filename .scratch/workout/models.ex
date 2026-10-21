# Review draft: repeating workout week and client logging.
# Exercise, ExerciseMetric, ExerciseGroup, WorkoutExercise and targets have draft changesets.
# Workout, WorkoutSchedule and WorkoutLog have structural changesets; persistence is pending.
# ExerciseSwap validation and WorkoutLog lifecycle changesets are included.
# W78-W83 define WorkoutLog -> ExerciseLog -> ExerciseSet with on-demand activity logs.
# Both result schemas have typed measurement blocks and shared validation (ADR 0015).
# Recording commands cover instructions, child outcomes, replacements, and lifecycle.
# Old direct set links and swaps remain for review; new commands reject mixed usage.
# Authorization, database constraints, locking, migrations, and runtime wiring are pending.
# This file is outside the application's compilation paths.
# Attachment ownership/access rules remain deferred; see
# docs/adr/0003-shared-attachments-and-feature-media.md.
# WorkoutExercise.side_mode is defined by ADR 0004; it is prescription-specific.
# Ordered metric labels and grade deferral are defined by ADR 0005.
# Equipment descriptions and free-text muscle names are defined by ADR 0006.
# Exercise archiving preserves existing uses under ADR 0007.
# Target validation is defined by ADR 0008; persistence writers remain pending.
# Schedule dates, local time, and ownership are defined by ADR 0010.
# Optional session feedback is defined by ADR 0012.
# Exercise swaps preserve recorded sets under ADR 0013.
# WorkoutLog metadata and lifecycle validation are defined by ADR 0014.

defmodule Easy.Attachments.Attachment do
  use Ecto.Schema

  # Assigned before requesting an upload URL; links also receive an ID on creation.
  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id

  schema "attachments" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:client, Easy.Clients.Client)

    field(:uploaded_by_type, Ecto.Enum, values: [:coach, :client, :system])
    field(:uploaded_by_id, :binary_id)

    field(:source, Ecto.Enum, values: [:upload, :external_link])
    field(:storage_key, :string)
    field(:external_url, :string)

    field(:content_type, :string)
    field(:byte_size, :integer)
    field(:duration_ms, :integer)
    field(:captured_on, :date)

    timestamps(type: :utc_datetime)
  end

  # Proposed constraints, not implemented by this declaration:
  # - source is required. Exactly one of storage_key and external_url is present.
  # - upload requires storage_key, content_type and positive byte_size.
  # - external_link requires an HTTP(S) URL with a host; upload fields are absent.
  # Existing ownership/uploader fields are retained. Their nullability, access and
  # public/private delivery rules need the deferred access decision. No visibility
  # field is introduced by this draft. Captions and positions belong to each use.
end

defmodule Easy.Workouts.ExerciseMetric do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @type t :: %__MODULE__{}

  @metrics [
    :reps,
    :weight,
    :duration,
    :distance,
    :elevation_gain,
    :height,
    :calories,
    :speed,
    :incline,
    :level,
    :power,
    :cadence,
    :heart_rate,
    :effort,
    :reserve,
    :successes,
    :attempts,
    :score,
    :result,
    :tempo
  ]

  embedded_schema do
    field(:key, Ecto.Enum, values: @metrics)
    # Null uses the catalogue label. A label never changes the key's units or type.
    field(:label, :string)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(metric, attrs) do
    metric
    |> cast(attrs, [:key, :label], empty_values: [])
    |> update_change(:label, &optional_label/1)
    |> validate_required([:key])
  end

  defp optional_label(nil), do: nil

  defp optional_label(value) do
    case String.trim(value) do
      "" -> nil
      label -> label
    end
  end
end

defmodule Easy.Workouts.Exercise do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.ExerciseMetric

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  @kinds [:movement, :activity, :sport, :practice]
  @goals [:strength, :endurance, :power, :mobility, :balance, :skill, :recovery]
  @places [:gym, :home, :outdoor, :pool, :"court/field", :studio]
  @lists [:goals, :places, :muscles]
  @editable [
    :name,
    :instructions,
    :kind,
    :goals,
    :places,
    :equipment,
    :muscles
  ]

  schema "exercises" do
    # Null business_id means built-in; the trusted caller sets ownership on insert.
    belongs_to(:business, Easy.Orgs.Business)

    field(:name, :string)
    # Optional plain-text directions for the exercise; line breaks are preserved.
    field(:instructions, :string)
    field(:kind, Ecto.Enum, values: @kinds)

    # Optional selections; empty lists are valid.
    field(:goals, {:array, Ecto.Enum}, values: @goals, default: [])
    field(:places, {:array, Ecto.Enum}, values: @places, default: [])

    # JSONB array order controls display order; each catalogue key occurs once.
    embeds_many(:metrics, ExerciseMetric, on_replace: :delete)

    # Optional description, including alternatives and optional equipment.
    field(:equipment, :string)
    # One free-text muscle name per entry. Empty means not classified.
    field(:muscles, {:array, :string}, default: [])
    # No rows means no demonstration. Gallery writes use ExerciseMedia separately.
    has_many(:media, Easy.Workouts.ExerciseMedia, preload_order: [asc: :position])

    # Archive/Restore actions own this field; ordinary edit params cannot set it.
    # Exclude archived exercises from pickers, not from existing workout lookups.
    field(:archived_at, :utc_datetime)

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t() | nil, map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> change(business_id: business_id)
    |> cast(attrs, @editable, empty_values: [])
    |> default_metrics()
    |> cast_embed(:metrics)
    |> validate()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(exercise, attrs) do
    exercise
    |> cast(attrs, @editable, empty_values: [])
    |> cast_embed(:metrics)
    |> validate()
  end

  # The context must authorize archive/restore using the existing ownership rules.
  @spec archive_changeset(t()) :: Ecto.Changeset.t()
  def archive_changeset(exercise) do
    archived_at = exercise.archived_at || DateTime.truncate(DateTime.utc_now(), :second)
    change(exercise, archived_at: archived_at)
  end

  @spec restore_changeset(t()) :: Ecto.Changeset.t()
  def restore_changeset(exercise), do: change(exercise, archived_at: nil)

  # Only an omitted selection on creation receives the kind's default metrics.
  defp default_metrics(changeset) do
    if Map.has_key?(changeset.params || %{}, "metrics") do
      changeset
    else
      keys =
        case get_field(changeset, :kind) do
          :movement -> [:reps, :weight]
          :activity -> [:distance, :duration]
          :sport -> [:duration, :result, :score]
          :practice -> [:duration]
          _ -> []
        end

      put_embed(changeset, :metrics, Enum.map(keys, &%ExerciseMetric{key: &1}))
    end
  end

  defp validate(changeset) do
    changeset
    |> update_change(:name, &trim_text/1)
    |> update_change(:instructions, &optional_text/1)
    |> update_change(:equipment, &optional_text/1)
    |> trim_muscles()
    |> validate_required([:name, :kind])
    |> validate_length(:name, min: 1, max: 200)
    |> validate_lists()
    |> validate_unique_metrics()
    |> database_constraints()
  end

  defp trim_text(nil), do: nil
  defp trim_text(value), do: String.trim(value)

  defp optional_text(value) do
    case trim_text(value) do
      "" -> nil
      text -> text
    end
  end

  defp trim_muscles(changeset) do
    update_change(changeset, :muscles, fn
      values when is_list(values) ->
        Enum.map(values, fn value ->
          if is_binary(value), do: String.trim(value), else: value
        end)

      value ->
        value
    end)
  end

  defp validate_lists(changeset) do
    Enum.reduce(@lists, changeset, fn field, acc ->
      case get_field(acc, field) do
        values when is_list(values) ->
          if Enum.uniq(values) == values and Enum.all?(values, &nonempty_element?/1),
            do: acc,
            else: add_error(acc, field, "use unique, nonempty entries")

        _ ->
          add_error(acc, field, "must be a list; use [] when no entries apply")
      end
    end)
  end

  defp nonempty_element?(value) when is_atom(value), do: not is_nil(value)
  defp nonempty_element?(value) when is_binary(value), do: String.trim(value) != ""
  defp nonempty_element?(_), do: false

  defp validate_unique_metrics(changeset) do
    keys = Enum.map(get_field(changeset, :metrics), & &1.key)

    if Enum.uniq(keys) == keys,
      do: changeset,
      else: add_error(changeset, :metrics, "select each metric only once")
  end

  # These checks are proposed for the later migration; they are not applied yet.
  # Only name and kind are required user inputs. Collection columns are NOT NULL
  # arrays that allow []. Nonempty tag/facet arrays are one-dimensional and start
  # at index 1. Entries are unique and non-null; goals/places use catalogue values.
  # Free-text entries are trimmed/nonblank.
  # Instructions are optional plain text: null or trimmed/nonblank.
  # Equipment is optional text: null or trimmed/nonblank. It is not a tag array.
  # metrics is a JSONB array (possibly empty) of {key, label} objects with unique catalogue
  # keys; label is null or trimmed/nonblank text. Name is trimmed/nonblank, max 200.
  # Media rules belong to Attachment and ExerciseMedia under ADR 0003.
  # business_id keeps its FK and tenant-leading index; only system writers use null.
  defp database_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> check_constraint(:name, name: :exercises_name_valid)
    |> check_constraint(:instructions, name: :exercises_instructions_valid)
    |> check_constraint(:kind, name: :exercises_kind_valid)
    |> check_constraint(:goals, name: :exercises_goals_valid)
    |> check_constraint(:places, name: :exercises_places_valid)
    |> check_constraint(:metrics, name: :exercises_metrics_valid)
    |> check_constraint(:equipment, name: :exercises_equipment_valid)
    |> check_constraint(:muscles, name: :exercises_muscles_valid)
  end
end

defmodule Easy.Workouts.ExerciseMedia do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "exercise_media" do
    belongs_to(:exercise, Easy.Workouts.Exercise)
    belongs_to(:attachment, Easy.Attachments.Attachment)

    field(:caption, :string)
    field(:position, :integer)

    timestamps(type: :utc_datetime)
  end

  # Proposed constraints and write rules, not implemented by this declaration:
  # - exercise_id, attachment_id and position are NOT NULL.
  # - exercise_id FK uses ON DELETE CASCADE; attachment_id FK uses ON DELETE RESTRICT.
  # - position >= 0; gaps are allowed. UNIQUE(exercise_id, position) is DEFERRABLE.
  # - caption is optional plain text: trim outer whitespace and store blanks as null.
  # Reorder in one transaction with the position constraint deferred; preserve IDs.
  # Removing a gallery row never deletes its attachment or stored file. The exercise
  # accepts image/video demonstrations and external links, not client form reviews.
end

defmodule Easy.Workouts.TargetRules do
  import Ecto.Changeset

  @value_fields [:value, :min, :max]

  @spec validate(Ecto.Changeset.t(), atom(), [atom()]) :: Ecto.Changeset.t()
  def validate(changeset, metric, fields \\ @value_fields) do
    changeset
    |> validate_required([:mode])
    |> validate_shape(fields)
    |> validate_metric(metric, fields)
  end

  @spec validate_single_value(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_single_value(changeset) do
    changeset = validate_required(changeset, [:mode])

    case get_field(changeset, :mode) do
      :exact -> validate_required(changeset, [:value])
      :client_chooses -> require_empty(changeset, [:value])
      _ -> changeset
    end
  end

  defp validate_shape(changeset, [value_field, min_field, max_field] = fields) do
    case get_field(changeset, :mode) do
      :exact ->
        changeset
        |> validate_required([value_field])
        |> require_empty([min_field, max_field])

      :range ->
        changeset
        |> validate_required([min_field, max_field])
        |> require_empty([value_field])
        |> validate_order(min_field, max_field)

      mode when mode in [:client_chooses, :max, :none] ->
        require_empty(changeset, fields)

      _ ->
        changeset
    end
  end

  defp require_empty(changeset, fields) do
    Enum.reduce(fields, changeset, fn field, acc ->
      if is_nil(get_field(acc, field)),
        do: acc,
        else: add_error(acc, field, "must be empty for this target mode")
    end)
  end

  defp validate_order(changeset, min_field, max_field) do
    case {get_field(changeset, min_field), get_field(changeset, max_field)} do
      {nil, _} ->
        changeset

      {_, nil} ->
        changeset

      {lower, upper} ->
        if Decimal.compare(lower, upper) == :gt,
          do: add_error(changeset, max_field, "must be greater than or equal to #{min_field}"),
          else: changeset
    end
  end

  defp validate_metric(changeset, metric, fields) do
    {minimum, maximum} =
      case metric do
        :effort -> {1, 10}
        :reserve -> {0, 10}
        :level -> {1, nil}
        key when key in [:weight, :incline, :score] -> {nil, nil}
        _ -> {0, nil}
      end

    # Check the complete target, including unchanged values on partial updates.
    Enum.reduce(fields, changeset, fn field, acc ->
      value = get_field(acc, field)

      cond do
        is_nil(value) ->
          acc

        minimum != nil and Decimal.compare(value, minimum) == :lt ->
          add_error(acc, field, "must be greater than or equal to #{minimum}")

        maximum != nil and Decimal.compare(value, maximum) == :gt ->
          add_error(acc, field, "must be less than or equal to #{maximum}")

        true ->
          acc
      end
    end)
  end
end

defmodule Easy.Workouts.CountTarget do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @type t :: %__MODULE__{}
  @metrics [:reps, :level, :cadence, :heart_rate, :successes, :attempts]

  embedded_schema do
    field(:mode, Ecto.Enum,
      values: [:client_chooses, :exact, :range, :max],
      default: :client_chooses
    )

    field(:value, :integer)
    field(:min, :integer)
    field(:max, :integer)
  end

  @spec changeset(t(), map(), atom()) :: Ecto.Changeset.t()
  def changeset(target, attrs, metric) when metric in @metrics do
    target
    |> cast(attrs, [:mode, :value, :min, :max], empty_values: [])
    |> Easy.Workouts.TargetRules.validate(metric)
  end
end

defmodule Easy.Workouts.NumericTarget do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @type t :: %__MODULE__{}
  @metrics [
    :weight,
    :duration,
    :distance,
    :elevation_gain,
    :height,
    :calories,
    :speed,
    :incline,
    :power,
    :effort,
    :reserve,
    :score
  ]

  embedded_schema do
    field(:mode, Ecto.Enum,
      values: [:client_chooses, :exact, :range, :max],
      default: :client_chooses
    )

    field(:value, :decimal)
    field(:min, :decimal)
    field(:max, :decimal)
  end

  @spec changeset(t(), map(), atom()) :: Ecto.Changeset.t()
  def changeset(target, attrs, metric) when metric in @metrics do
    target
    |> cast(attrs, [:mode, :value, :min, :max], empty_values: [])
    |> Easy.Workouts.TargetRules.validate(metric)
  end
end

defmodule Easy.Workouts.TextTarget do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    field(:mode, Ecto.Enum, values: [:client_chooses, :exact], default: :client_chooses)
    field(:value, :string)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(target, attrs) do
    target
    |> cast(attrs, [:mode, :value], empty_values: [])
    |> update_change(:value, &normalize_text/1)
    |> Easy.Workouts.TargetRules.validate_single_value()
  end

  defp normalize_text(nil), do: nil

  defp normalize_text(value) do
    case String.trim(value) do
      "" -> nil
      text -> text
    end
  end
end

defmodule Easy.Workouts.ResultTarget do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    field(:mode, Ecto.Enum, values: [:client_chooses, :exact], default: :client_chooses)
    field(:value, Ecto.Enum, values: [:win, :draw, :loss])
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(target, attrs) do
    target
    |> cast(attrs, [:mode, :value], empty_values: [])
    |> Easy.Workouts.TargetRules.validate_single_value()
  end
end

defmodule Easy.Workouts.RestTarget do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    # Omitted rest leaves the duration to the client; none explicitly means no rest.
    field(:mode, Ecto.Enum,
      values: [:client_chooses, :none, :exact, :range],
      default: :client_chooses
    )

    field(:value_s, :decimal)
    field(:min_s, :decimal)
    field(:max_s, :decimal)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(target, attrs) do
    target
    |> cast(attrs, [:mode, :value_s, :min_s, :max_s], empty_values: [])
    |> Easy.Workouts.TargetRules.validate(:duration, [:value_s, :min_s, :max_s])
  end
end

defmodule Easy.Workouts.RoundTargets do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.{CountTarget, Exercise, NumericTarget}

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    # A missing metric is not prescribed. Values use the catalogue's base units.
    embeds_one(:reps, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:weight, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:duration, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:distance, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:elevation_gain, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:height, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:calories, Easy.Workouts.NumericTarget, on_replace: :update)

    embeds_one(:speed, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:incline, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:level, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:power, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:cadence, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:heart_rate, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:effort, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:reserve, Easy.Workouts.NumericTarget, on_replace: :update)

    embeds_one(:successes, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:attempts, Easy.Workouts.CountTarget, on_replace: :update)
    embeds_one(:score, Easy.Workouts.NumericTarget, on_replace: :update)
    embeds_one(:result, Easy.Workouts.ResultTarget, on_replace: :update)
    # Historical grade prescriptions remain representable; grade is not selectable
    # for new exercise definitions. Review data migration before removing this.
    embeds_one(:grade, Easy.Workouts.TextTarget, on_replace: :update)
    embeds_one(:tempo, Easy.Workouts.TextTarget, on_replace: :update)

    # Rest follows the whole exercise for this round: after both sides for per_side.
    embeds_one(:rest, Easy.Workouts.RestTarget,
      on_replace: :update,
      defaults_to_struct: true
    )
  end

  @spec changeset(t(), map(), Exercise.t()) :: Ecto.Changeset.t()
  def changeset(round, attrs, %Exercise{} = exercise) do
    fields = __schema__(:embeds)
    params = Map.new(attrs, fn {key, value} -> {to_string(key), value} end)

    # An empty patch revalidates a retained target without resetting its values.
    params =
      Enum.reduce(fields, params, fn field, acc ->
        if is_nil(Map.fetch!(round, field)),
          do: acc,
          else: Map.put_new(acc, Atom.to_string(field), %{})
      end)

    # Clearing rest resets the instruction instead of deleting its default object.
    params =
      if is_nil(params["rest"]) do
        Map.put(params, "rest", %{
          "mode" => "client_chooses",
          "value_s" => nil,
          "min_s" => nil,
          "max_s" => nil
        })
      else
        params
      end

    changeset =
      Enum.reduce(fields, cast(round, params, [], empty_values: []), fn field, acc ->
        cast_target(acc, field)
      end)

    changeset
    |> validate_known_fields(fields)
    |> validate_selected_metrics(fields, exercise.metrics)
  end

  # Both prescribed entries and session swaps store the same ordered target list.
  @spec cast_many(Ecto.Changeset.t(), Exercise.t(), pos_integer()) :: Ecto.Changeset.t()
  def cast_many(changeset, exercise, rounds) do
    changeset
    |> cast_target_list(exercise)
    |> validate_target_count(rounds)
  end

  defp cast_target_list(changeset, exercise) do
    case Map.fetch(changeset.params, "targets") do
      :error ->
        targets = Enum.map(get_field(changeset, :targets), &changeset(&1, %{}, exercise))
        put_embed(changeset, :targets, targets)

      {:ok, values} when is_list(values) ->
        if Enum.all?(values, &(is_map(&1) and not is_struct(&1))) do
          targets = Enum.map(values, &changeset(%__MODULE__{}, &1, exercise))
          put_embed(changeset, :targets, targets)
        else
          add_error(changeset, :targets, "must be an array of round target objects")
        end

      {:ok, _} ->
        add_error(changeset, :targets, "must be an array of round target objects")
    end
  end

  defp validate_target_count(changeset, rounds) when is_integer(rounds) and rounds > 0 do
    expected =
      case get_field(changeset, :targets_mode) do
        :same_for_all -> 1
        :per_round -> rounds
        _ -> nil
      end

    if expected != nil and length(get_field(changeset, :targets)) != expected,
      do: add_error(changeset, :targets, "must contain exactly #{expected} round target entries"),
      else: changeset
  end

  defp validate_target_count(changeset, _rounds),
    do: add_error(changeset, :targets, "requires a positive integer round count")

  defp cast_target(changeset, field) do
    value = changeset.params[Atom.to_string(field)]

    if is_nil(value) or (is_map(value) and not is_struct(value)) do
      schema = __schema__(:embed, field).related

      target_cast = fn target, target_params ->
        if schema in [CountTarget, NumericTarget],
          do: schema.changeset(target, target_params, field),
          else: schema.changeset(target, target_params)
      end

      cast_embed(changeset, field, with: target_cast)
    else
      add_error(changeset, field, "must be an object or null")
    end
  end

  defp validate_known_fields(changeset, fields) do
    unknown = Map.keys(changeset.params) -- Enum.map(fields, &Atom.to_string/1)

    Enum.reduce(unknown, changeset, fn key, acc ->
      add_error(acc, :base, "unsupported target #{key}")
    end)
  end

  defp validate_selected_metrics(changeset, fields, metrics) do
    selected = Enum.map(metrics, & &1.key)

    Enum.reduce(fields -- [:rest], changeset, fn field, acc ->
      if field not in selected and not is_nil(get_field(acc, field)),
        do: add_error(acc, field, "is not selected for this exercise"),
        else: acc
    end)
  end
end

defmodule Easy.Workouts.WorkoutExercise do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.{Exercise, RoundTargets}

  @primary_key {:id, :binary_id, autogenerate: true}
  @type t :: %__MODULE__{}

  embedded_schema do
    # Required reference to a built-in exercise or one owned by the workout's business.
    # The workout writer maintains the matching WorkoutExerciseReference row.
    field(:exercise_id, :binary_id)

    # Required on save. Combined reps/duration cover the whole round; per_side
    # applies activity targets to each side without changing rounds. Rest follows both.
    field(:side_mode, Ecto.Enum,
      values: [:combined, :per_side],
      default: :combined
    )

    field(:targets_mode, Ecto.Enum,
      values: [:same_for_all, :per_round],
      default: :same_for_all
    )

    # One entry for same_for_all; exactly the group's round count for per_round.
    embeds_many(:targets, Easy.Workouts.RoundTargets, on_replace: :delete)
  end

  # The caller resolves and authorizes the Exercise and supplies its group's rounds.
  @spec changeset(t(), map(), Exercise.t(), pos_integer()) :: Ecto.Changeset.t()
  def changeset(workout_exercise, attrs, %Exercise{} = exercise, rounds) do
    workout_exercise
    |> cast(attrs, [:exercise_id, :side_mode, :targets_mode], empty_values: [])
    |> validate_required([:exercise_id, :side_mode, :targets_mode])
    |> validate_exercise_reference(exercise)
    |> RoundTargets.cast_many(exercise, rounds)
  end

  defp validate_exercise_reference(changeset, exercise) do
    if not is_nil(exercise.id) and get_field(changeset, :exercise_id) == exercise.id,
      do: changeset,
      else: add_error(changeset, :exercise_id, "must match the resolved exercise")
  end
end

defmodule Easy.Workouts.ExerciseGroup do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.{Exercise, WorkoutExercise}

  @primary_key {:id, :binary_id, autogenerate: true}
  @type t :: %__MODULE__{}

  embedded_schema do
    field(:name, :string)
    field(:rounds, :integer, default: 3)

    embeds_many(:exercises, Easy.Workouts.WorkoutExercise, on_replace: :delete)
  end

  # The caller supplies authorized Exercises. Workout may also supply its own prior
  # occurrences to preserve IDs when moving entries between groups.
  @spec changeset(t(), map(), %{optional(String.t()) => Exercise.t()}, map()) ::
          Ecto.Changeset.t()
  def changeset(group, attrs, exercises_by_id, previous_entries \\ %{})
      when is_map(exercises_by_id) do
    group
    |> cast(attrs, [:name, :rounds], empty_values: [])
    |> update_change(:name, &optional_name/1)
    |> validate_rounds()
    |> cast_exercises(exercises_by_id, previous_entries)
    |> validate_nonempty_group()
  end

  defp optional_name(nil), do: nil

  defp optional_name(value) do
    case String.trim(value) do
      "" -> nil
      name -> name
    end
  end

  defp validate_rounds(changeset) do
    rounds = get_field(changeset, :rounds)

    if is_integer(rounds) and rounds in 1..100,
      do: changeset,
      else: add_error(changeset, :rounds, "must be an integer from 1 to 100")
  end

  defp cast_exercises(changeset, exercises_by_id, previous_entries) do
    rounds = get_field(changeset, :rounds)

    case Map.fetch(changeset.params, "exercises") do
      :error ->
        entries =
          Enum.map(get_field(changeset, :exercises), fn entry ->
            cast_exercise(entry, %{}, exercises_by_id, rounds, previous_entries)
          end)

        put_embed(changeset, :exercises, entries)

      {:ok, values} when is_list(values) ->
        if Enum.all?(values, &(is_map(&1) and not is_struct(&1))),
          do: cast_exercise_list(changeset, values, exercises_by_id, rounds, previous_entries),
          else: add_error(changeset, :exercises, "must be an array of exercise objects")

      {:ok, _} ->
        add_error(changeset, :exercises, "must be an array of exercise objects")
    end
  end

  defp cast_exercise_list(changeset, values, exercises_by_id, rounds, previous_entries) do
    entries =
      Enum.map(values, fn value ->
        params = Map.new(value, fn {key, item} -> {to_string(key), item} end)

        case params["id"] do
          nil ->
            {nil, params}

          id ->
            case Ecto.UUID.cast(id) do
              {:ok, id} -> {id, Map.put(params, "id", id)}
              :error -> {:invalid, params}
            end
        end
      end)

    ids = entries |> Enum.map(&elem(&1, 0)) |> Enum.reject(&is_nil/1)

    cond do
      :invalid in ids ->
        add_error(changeset, :exercises, "occurrence IDs must be valid UUIDs")

      Enum.uniq(ids) != ids ->
        add_error(changeset, :exercises, "occurrence IDs must be unique within the group")

      true ->
        params = Map.put(changeset.params, "exercises", Enum.map(entries, &elem(&1, 1)))

        cast_embed(%{changeset | params: params}, :exercises,
          with: fn entry, attrs ->
            cast_exercise(entry, attrs, exercises_by_id, rounds, previous_entries)
          end
        )
    end
  end

  defp cast_exercise(entry, attrs, exercises_by_id, rounds, previous_entries) do
    # The workout supplies its own prior occurrences so moves can keep their IDs.
    entry =
      if is_nil(entry.id), do: Map.get(previous_entries, attrs["id"], entry), else: entry

    reference = cast(entry, attrs, [:exercise_id], empty_values: [])

    case Map.get(exercises_by_id, get_field(reference, :exercise_id)) do
      %Exercise{} = exercise -> WorkoutExercise.changeset(entry, attrs, exercise, rounds)
      _ -> add_error(reference, :exercise_id, "must reference an available exercise")
    end
  end

  defp validate_nonempty_group(changeset) do
    if get_field(changeset, :exercises) == [],
      do: add_error(changeset, :exercises, "must contain at least one exercise"),
      else: changeset
  end
end

defmodule Easy.Workouts.Workout do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.{Exercise, ExerciseGroup}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "workouts" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:client, Easy.Clients.Client)

    field(:name, :string)
    field(:description, :string)

    field(:type, Ecto.Enum, values: [:prescribed, :video, :open], default: :prescribed)

    # Required only for type :video; nil for :prescribed and :open (W53).
    belongs_to(:video, Easy.Attachments.Attachment)
    field(:archived_at, :utc_datetime)

    embeds_many(:groups, Easy.Workouts.ExerciseGroup, on_replace: :delete)
    has_many(:exercise_references, Easy.Workouts.WorkoutExerciseReference)

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t() | nil, map(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs, exercises_by_id) do
    %__MODULE__{}
    |> change(business_id: business_id, client_id: client_id)
    |> update_changeset(attrs, exercises_by_id)
  end

  @spec update_changeset(t() | Ecto.Changeset.t(), map(), map()) :: Ecto.Changeset.t()
  def update_changeset(workout, attrs, exercises_by_id) when is_map(exercises_by_id) do
    workout
    |> cast(attrs, [:name, :description, :type, :video_id], empty_values: [])
    |> update_change(:name, &trim_text/1)
    |> update_change(:description, &optional_text/1)
    |> validate_required([:business_id, :name, :type])
    |> validate_length(:name, min: 1, max: 200)
    |> validate_reference_ids()
    |> cast_groups(exercises_by_id)
    |> validate_unique_structure()
    |> validate_content_for_save()
    |> database_constraints()
  end

  defp trim_text(nil), do: nil
  defp trim_text(value), do: String.trim(value)

  defp optional_text(value) do
    case trim_text(value) do
      "" -> nil
      text -> text
    end
  end

  defp validate_reference_ids(changeset) do
    Enum.reduce([:business_id, :client_id, :video_id], changeset, fn field, acc ->
      case get_field(acc, field) do
        nil ->
          acc

        value ->
          case Ecto.UUID.cast(value) do
            {:ok, id} -> put_change(acc, field, id)
            :error -> add_error(acc, field, "must be a valid UUID")
          end
      end
    end)
  end

  defp cast_groups(changeset, exercises_by_id) do
    business_id = get_field(changeset, :business_id)

    exercises_by_id =
      Map.filter(exercises_by_id, fn {_id, exercise} ->
        match?(%Exercise{}, exercise) and exercise.business_id in [nil, business_id]
      end)

    current = get_field(changeset, :groups)

    previous_entries =
      for group <- current,
          entry <- group.exercises,
          not is_nil(entry.id),
          into: %{},
          do: {entry.id, entry}

    case Map.fetch(changeset.params, "groups") do
      :error ->
        groups =
          Enum.map(current, &ExerciseGroup.changeset(&1, %{}, exercises_by_id, previous_entries))

        put_embed(changeset, :groups, groups)

      {:ok, values} when is_list(values) ->
        if Enum.all?(values, &(is_map(&1) and not is_struct(&1))),
          do: cast_group_list(changeset, values, current, exercises_by_id, previous_entries),
          else: add_error(changeset, :groups, "must be an array of group objects")

      {:ok, _} ->
        add_error(changeset, :groups, "must be an array of group objects")
    end
  end

  defp cast_group_list(changeset, values, current, exercises_by_id, previous_entries) do
    params =
      Enum.map(values, fn value ->
        Map.new(value, fn {key, item} -> {to_string(key), item} end)
      end)

    group_ids = Enum.map(params, & &1["id"])

    entry_ids =
      Enum.flat_map(params, fn group ->
        case group["exercises"] do
          entries when is_list(entries) ->
            for entry <- entries,
                is_map(entry) and not is_struct(entry),
                do: Map.get(entry, "id", Map.get(entry, :id))

          _ ->
            []
        end
      end)

    case identity_error(group_ids, "group") || identity_error(entry_ids, "exercise occurrence") do
      nil ->
        previous_groups =
          for group <- current, not is_nil(group.id), into: %{}, do: {group.id, group}

        groups =
          Enum.map(params, fn attrs ->
            group = Map.get(previous_groups, canonical_id(attrs["id"]), %ExerciseGroup{})
            ExerciseGroup.changeset(group, attrs, exercises_by_id, previous_entries)
          end)

        put_embed(changeset, :groups, groups)

      error ->
        add_error(changeset, :groups, error)
    end
  end

  defp canonical_id(nil), do: nil

  defp canonical_id(value) do
    {:ok, id} = Ecto.UUID.cast(value)
    id
  end

  defp validate_unique_structure(changeset) do
    groups = get_field(changeset, :groups)
    entries = Enum.flat_map(groups, & &1.exercises)

    Enum.reduce(
      [{Enum.map(groups, & &1.id), "group"}, {Enum.map(entries, & &1.id), "exercise occurrence"}],
      changeset,
      fn {ids, label}, acc ->
        case identity_error(ids, label) do
          nil -> acc
          error -> add_error(acc, :groups, error)
        end
      end
    )
  end

  defp identity_error(ids, label) do
    parsed = ids |> Enum.reject(&is_nil/1) |> Enum.map(&Ecto.UUID.cast/1)

    cond do
      :error in parsed -> "#{label} IDs must be valid UUIDs"
      Enum.uniq(parsed) != parsed -> "#{label} IDs must be unique within the workout"
      true -> nil
    end
  end

  # Proposed migration constraints; these registrations do not create them.
  defp database_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id, name: :workouts_client_id_business_id_fkey)
    |> foreign_key_constraint(:video_id)
    |> check_constraint(:name, name: :workouts_name_valid)
    |> check_constraint(:groups, name: :workouts_content_valid)
  end

  # Run after metadata and nested-group casting/validation. These helpers do not
  # resolve references, authorize access, or implement a complete workout save.
  @spec validate_content_for_save(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_content_for_save(changeset) do
    case get_field(changeset, :type) do
      :prescribed ->
        changeset |> require_no_video() |> validate_group_content()

      :video ->
        changeset |> validate_required([:video_id]) |> require_no_groups()

      :open ->
        changeset |> require_no_video() |> require_no_groups()

      _ ->
        add_error(changeset, :type, "must be prescribed, video, or open")
    end
  end

  # Also use this when editing content that will remain on a client's schedule.
  @spec validate_content_for_schedule(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_content_for_schedule(changeset) do
    changeset = validate_content_for_save(changeset)

    if get_field(changeset, :type) == :prescribed and get_field(changeset, :groups) == [],
      do: add_error(changeset, :groups, "must contain exercises before scheduling"),
      else: changeset
  end

  defp require_no_video(changeset) do
    if is_nil(get_field(changeset, :video_id)),
      do: changeset,
      else: add_error(changeset, :video_id, "only a video workout can reference a video")
  end

  defp require_no_groups(changeset) do
    if get_field(changeset, :groups) == [],
      do: changeset,
      else: add_error(changeset, :groups, "must be empty for this workout type")
  end

  defp validate_group_content(changeset) do
    groups = get_field(changeset, :groups)

    if is_list(groups) and Enum.all?(groups, &match?(%ExerciseGroup{exercises: [_ | _]}, &1)),
      do: changeset,
      else: add_error(changeset, :groups, "must contain only nonempty exercise groups")
  end
end

defmodule Easy.Workouts.WorkoutExerciseReference do
  use Ecto.Schema

  @primary_key false
  @foreign_key_type :binary_id

  # Derived from workout.groups; the workout writer replaces memberships in the
  # same transaction as a content save. Repeated uses share one reference row.
  schema "workout_exercises" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:workout, Easy.Workouts.Workout, primary_key: true)
    belongs_to(:exercise, Easy.Workouts.Exercise, primary_key: true)
  end

  # Planned DB rules: all three IDs are NOT NULL; PK(workout_id, exercise_id).
  # FK(workout_id, business_id) -> workouts(id, business_id), ON DELETE CASCADE.
  # FK(exercise_id) -> exercises(id), ON DELETE RESTRICT. The exercise must be
  # built-in or belong to this business. Index(business_id, exercise_id, workout_id).
  # Membership synchronization must also cover copying and Undo. Archived workouts
  # retain references while their content remains stored.
end

defmodule Easy.Workouts.WorkoutSchedule do
  use Ecto.Schema
  import Ecto.Changeset
  import Bitwise, only: [band: 2, bsl: 2]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "workout_schedules" do
    # Required references (W62). Business comes from the authorized context;
    # the client belongs to it. Business and client stay fixed after creation.
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:client, Easy.Clients.Client)
    # The workout belongs to this same client and business. A library workout
    # must be copied to the client before scheduling (W9).
    belongs_to(:workout, Easy.Workouts.Workout)
    # Optional session leader (W61); nil means no assigned leader. A newly
    # selected coach must be active and belong to this business. Removing a
    # coach later must preserve the reference on past sessions.
    belongs_to(:coach, Easy.Orgs.Coach)

    # Required nonempty weekday selection, Mon=1 ... Sun=64 (W36).
    # The date window must contain at least one selected weekday (W58).
    # For equal start/end dates, that date's weekday must be selected.
    field(:weekdays_mask, :integer)
    # Required when stored (W56). On creation, the context defaults an omitted
    # start to the client's current local date and preserves a chosen future date.
    # This is a per-request default, not a static schema default. An omitted start
    # on update keeps the existing date; schedule changes must still follow W14.
    field(:from_date, :date)
    # Optional inclusive end in the client's local calendar (W57). Nil repeats
    # until stopped; a supplied date must be on or after from_date. A one-week
    # assignment can end on that week's Sunday; only selected weekdays occur.
    field(:until_date, :date)

    # Optional local time in the client's timezone (W59). Nil means anytime that
    # day; 00:00 means midnight. One time applies to every selected weekday.
    # Different times require separate schedule rows.
    field(:time, :time)
    # Optional free text (W60). Trim surrounding whitespace; blank becomes nil.
    # At most one of place and meeting_url can be set (W16).
    field(:place, :string)
    # Optional full HTTP/HTTPS URL with a host (W60). Trim surrounding whitespace;
    # blank becomes nil. This is the session's meeting link.
    field(:meeting_url, :string)

    timestamps(type: :utc_datetime)
  end

  # The context supplies the client's local today and authorized references.
  # A supplied start replaces the creation default; explicit null is invalid.
  @spec insert_changeset(String.t(), String.t(), String.t(), map(), Date.t()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, workout_id, attrs, %Date{} = today) do
    %__MODULE__{}
    |> change(
      business_id: business_id,
      client_id: client_id,
      workout_id: workout_id,
      from_date: today
    )
    |> update_changeset(attrs)
  end

  @spec update_changeset(t() | Ecto.Changeset.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(schedule, attrs) do
    schedule
    |> cast(
      attrs,
      [:weekdays_mask, :from_date, :until_date, :time, :place, :meeting_url, :coach_id],
      empty_values: []
    )
    |> update_change(:place, &optional_text/1)
    |> update_change(:meeting_url, &optional_text/1)
    |> validate_required([:business_id, :client_id, :workout_id, :weekdays_mask, :from_date])
    |> validate_reference_ids()
    |> validate_weekdays()
    |> validate_date_window()
    |> validate_location()
    |> validate_meeting_url()
    |> database_constraints()
  end

  defp optional_text(nil), do: nil

  defp optional_text(value) do
    case String.trim(value) do
      "" -> nil
      text -> text
    end
  end

  defp validate_reference_ids(changeset) do
    Enum.reduce([:business_id, :client_id, :workout_id, :coach_id], changeset, fn field, acc ->
      case get_field(acc, field) do
        nil ->
          acc

        value ->
          case Ecto.UUID.cast(value) do
            {:ok, id} -> put_change(acc, field, id)
            :error -> add_error(acc, field, "must be a valid UUID")
          end
      end
    end)
  end

  defp validate_weekdays(changeset) do
    case get_field(changeset, :weekdays_mask) do
      nil ->
        changeset

      mask when is_integer(mask) and mask in 1..127 ->
        changeset

      _ ->
        add_error(
          changeset,
          :weekdays_mask,
          "must select at least one weekday using a mask from 1 to 127"
        )
    end
  end

  defp validate_date_window(changeset) do
    case {get_field(changeset, :from_date), get_field(changeset, :until_date)} do
      {%Date{} = first, %Date{} = last} ->
        days = Date.diff(last, first)
        mask = get_field(changeset, :weekdays_mask)

        cond do
          days < 0 ->
            add_error(changeset, :until_date, "must be on or after the start date")

          is_integer(mask) and mask in 1..127 and not matching_weekday?(first, days, mask) ->
            add_error(changeset, :weekdays_mask, "Select a weekday within the date range.")

          true ->
            changeset
        end

      _ ->
        changeset
    end
  end

  defp matching_weekday?(first, days, mask) do
    first_weekday = Date.day_of_week(first) - 1

    # A weekly pattern needs at most seven checks, even for a long date window.
    Enum.any?(0..min(days, 6), fn offset ->
      band(mask, bsl(1, rem(first_weekday + offset, 7))) != 0
    end)
  end

  defp validate_location(changeset) do
    if get_field(changeset, :place) && get_field(changeset, :meeting_url),
      do: add_error(changeset, :meeting_url, "choose a place or meeting link"),
      else: changeset
  end

  defp validate_meeting_url(changeset) do
    case get_field(changeset, :meeting_url) do
      nil ->
        changeset

      url ->
        case URI.new(url) do
          {:ok, %URI{scheme: scheme, host: host}}
          when scheme in ["http", "https"] and is_binary(host) and host != "" ->
            changeset

          _ ->
            add_error(changeset, :meeting_url, "must be a full HTTP or HTTPS URL with a host")
        end
    end
  end

  # Registrations translate DB errors; they do not create the constraints.
  defp database_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id, name: :workout_schedules_client_id_business_id_fkey)
    |> foreign_key_constraint(:workout_id,
      name: :workout_schedules_workout_id_client_id_business_id_fkey
    )
    |> foreign_key_constraint(:coach_id, name: :workout_schedules_coach_id_business_id_fkey)
    |> check_constraint(:weekdays_mask, name: :workout_schedules_values)
    |> check_constraint(:weekdays_mask, name: :workout_schedules_matching_weekday)
    |> check_constraint(:meeting_url, name: :workout_schedules_meeting_url_valid)
  end

  # Planned ownership constraints (W62): all three references are NOT NULL.
  # FK(client_id, business_id) -> clients(id, business_id).
  # FK(workout_id, client_id, business_id) -> workouts(id, client_id, business_id).
  # FK(coach_id, business_id) -> coaches(id, business_id), retain past references.
  # Planned checks also cover matching weekdays and HTTP(S) meeting URL shape.
  # The context must authorize access, check newly selected coaches are active,
  # apply Workout's scheduling-content checks, and preserve schedule facts (W14).
  # This changeset alone does not resolve references or implement a safe save.
end

defmodule Easy.Workouts.ExerciseSwap do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.{Exercise, RoundTargets, Workout}

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    # The specific prescribed occurrence inside the log's workout, not the
    # catalogue exercise ID. Repeated uses can have different replacements.
    field(:workout_exercise_id, :binary_id)
    # Current replacement selection for unrecorded sets; no exercise snapshot.
    field(:exercise_id, :binary_id)

    # Total planned rounds for this entry in this log, including recorded rounds.
    # Initialize from the prescribed entry's group, raised to include any extra
    # recorded round; derive remaining work (W75-W76).
    field(:rounds, :integer)

    field(:targets_mode, Ecto.Enum,
      values: [:same_for_all, :per_round],
      default: :same_for_all
    )

    # Reuse the typed targets, including rest. Initially copy only rest from the
    # prescription; metric targets stay blank until entered or copied explicitly.
    # Per-round entries use the original round numbers, including recorded slots;
    # these instructions apply only to unrecorded sets.
    embeds_many(:targets, Easy.Workouts.RoundTargets, on_replace: :delete)
  end

  # The caller supplies the resolved workout, authorized definitions, and all
  # recorded sets belonging to this log. WorkoutLog.swaps_changeset/4 checks scope.
  @spec changeset(t(), map(), Workout.t(), map(), [map()]) :: Ecto.Changeset.t()
  def changeset(swap, attrs, %Workout{} = workout, exercises_by_id, recorded_sets) do
    changeset =
      swap
      |> cast(attrs, [:workout_exercise_id, :exercise_id, :rounds, :targets_mode],
        empty_values: []
      )
      |> validate_required([:workout_exercise_id, :exercise_id])
      |> validate_reference_ids()
      |> validate_fixed_occurrence()

    occurrence_id = get_field(changeset, :workout_exercise_id)

    occurrence =
      if workout.type == :prescribed do
        Enum.find_value(workout.groups, fn group ->
          case Enum.find(group.exercises, &(&1.id == occurrence_id)) do
            nil -> nil
            entry -> {group, entry}
          end
        end)
      end

    case occurrence do
      nil ->
        add_error(changeset, :workout_exercise_id, "must reference an entry in this workout")

      {group, entry} ->
        validate_replacement(changeset, workout, group, entry, exercises_by_id, recorded_sets)
    end
  end

  defp validate_reference_ids(changeset) do
    Enum.reduce([:workout_exercise_id, :exercise_id], changeset, fn field, acc ->
      case get_field(acc, field) do
        nil ->
          acc

        value ->
          case Ecto.UUID.cast(value) do
            {:ok, id} -> put_change(acc, field, id)
            :error -> add_error(acc, field, "must be a valid UUID")
          end
      end
    end)
  end

  defp validate_fixed_occurrence(changeset) do
    original_id = changeset.data.workout_exercise_id

    if original_id && original_id != get_field(changeset, :workout_exercise_id),
      do: add_error(changeset, :workout_exercise_id, "must not change the prescribed occurrence"),
      else: changeset
  end

  defp validate_replacement(changeset, workout, group, entry, lookup, recorded_sets) do
    id = get_field(changeset, :exercise_id)
    exercise = Map.get(lookup, id)

    cond do
      not match?(%Exercise{id: ^id}, exercise) or is_nil(id) ->
        add_error(changeset, :exercise_id, "must reference an available exercise")

      exercise.business_id not in [nil, workout.business_id] ->
        add_error(changeset, :exercise_id, "must belong to this business or be built-in")

      id == entry.exercise_id ->
        add_error(changeset, :exercise_id, "remove the swap to use the prescribed exercise")

      not is_nil(exercise.archived_at) and id != changeset.data.exercise_id ->
        add_error(changeset, :exercise_id, "cannot select an archived exercise")

      true ->
        highest_round =
          recorded_sets
          |> Enum.filter(&(&1.workout_exercise_id == entry.id))
          |> Enum.map(& &1.round)
          |> Enum.max(fn -> 0 end)

        changeset =
          changeset
          |> initialize_instructions(group, entry, highest_round)
          |> validate_required([:rounds, :targets_mode])
          |> validate_rounds(highest_round)

        RoundTargets.cast_many(changeset, exercise, get_field(changeset, :rounds))
    end
  end

  defp initialize_instructions(changeset, group, entry, highest_round) do
    new? = is_nil(changeset.data.workout_exercise_id)

    changeset =
      if new? do
        changeset
        |> default_input(:rounds, max(group.rounds, highest_round))
        |> default_input(:targets_mode, entry.targets_mode)
      else
        changeset
      end

    changed_exercise? = get_field(changeset, :exercise_id) != changeset.data.exercise_id

    if not Map.has_key?(changeset.params, "targets") and (new? or changed_exercise?) do
      source = if new?, do: entry.targets, else: get_field(changeset, :targets)
      targets = Enum.map(source, &%RoundTargets{rest: &1.rest})
      put_embed(changeset, :targets, targets)
    else
      changeset
    end
  end

  defp default_input(changeset, field, value) do
    if Map.has_key?(changeset.params, Atom.to_string(field)),
      do: changeset,
      else: put_change(changeset, field, value)
  end

  defp validate_rounds(changeset, highest_round) do
    case get_field(changeset, :rounds) do
      rounds when is_integer(rounds) and rounds > 0 ->
        if rounds < highest_round,
          do: add_error(changeset, :rounds, "must include recorded round #{highest_round}"),
          else: changeset

      _ ->
        add_error(changeset, :rounds, "must be a positive integer")
    end
  end
end

defmodule Easy.Workouts.WorkoutLog do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Workouts.{ExerciseSet, ExerciseSwap, Workout, WorkoutSchedule}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  @type recorder :: :client | {:coach, String.t()}
  @type prescription :: nil | Workout.t() | {Workout.t(), WorkoutSchedule.t(), Date.t()}

  schema "workout_logs" do
    # Required ownership (W64). Linked workouts and schedules must belong to
    # this same client and business.
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:client, Easy.Clients.Client)
    # Recording coach (W70), distinct from the schedule's session leader.
    # Required when recorded_by is :coach; nil when it is :client.
    belongs_to(:coach, Easy.Orgs.Coach)
    # Optional for training without a saved workout. A saved workout can also
    # be logged outside its schedule, with both schedule fields left nil.
    belongs_to(:workout, Easy.Workouts.Workout)
    # When present, the log's workout must match the schedule's workout.
    belongs_to(:schedule, Easy.Workouts.WorkoutSchedule)

    # Set together with schedule_id, or both nil (W64). Identifies the planned
    # occurrence; date below records when the client actually trained.
    field(:scheduled_date, :date)

    # Discard keeps this log and its sets, excludes it from completed-workout
    # totals, and releases the scheduled occurrence for a new attempt (W65).
    # Reopen changes completed -> active, retaining the log and its sets (W66).
    # It requires no other active log for this client; corrections can then be
    # saved and the same log completed again.
    field(:state, Ecto.Enum,
      values: [:active, :completed, :discarded],
      default: :active
    )

    # Required actual training date (W67). On creation, an omitted date defaults
    # to the client's local today. Past dates are allowed; future dates are not.
    # It can be corrected while active, including after reopening, without
    # changing scheduled_date. The writer must enforce the log's state.
    field(:date, :date)
    # Optional actual start time in the client's timezone (W68). Nil means no
    # time was recorded; 00:00 means midnight. No automatic default or copy from
    # the scheduled time. It can be corrected while the log is active.
    field(:time, :time)
    # Required original recorder type (W70). The server sets this and coach_id
    # from the authorized coaching context; later edits/reopening retain both.
    field(:recorded_by, Ecto.Enum, values: [:client, :coach])

    # Client-reported feedback (W72-W73), even when entered by a coach. Every
    # answer is optional, including on completion; nothing is preselected.
    # Whole-session effort: integer 1-5, from Very easy to Very hard. Nil means
    # unanswered. This rating is separate from exercise-level effort.
    field(:effort, :integer)
    # True: pain/discomfort reported; false: none reported; nil: unanswered.
    field(:pain, :boolean)
    # One optional plain-text note for all context, including pain. Trim outer
    # whitespace, store blank text as nil, and preserve internal line breaks. Maximum
    # 10,000 characters on creation and edits; editable only while active.
    field(:text, :string)

    has_many(:exercise_logs, Easy.Workouts.ExerciseLog, preload_order: [asc: :position, asc: :id])

    # Earlier representation retained for historical migration/review (W83).
    # New recording uses ExerciseLog and cannot mix these rows with that hierarchy.
    embeds_many(:swaps, Easy.Workouts.ExerciseSwap, on_replace: :delete)

    has_many(:sets, Easy.Workouts.ExerciseSet, preload_order: [asc: :round, asc: :id])

    # inserted_at records log creation; date/time record actual training (W69).
    timestamps(type: :utc_datetime)
  end

  # References and recorder come from the authorized context, never ordinary
  # editable input. The context also supplies the client's local today.
  @spec insert_changeset(
          String.t(),
          String.t(),
          recorder(),
          prescription(),
          map(),
          Date.t(),
          map()
        ) ::
          Ecto.Changeset.t()
  def insert_changeset(
        business_id,
        client_id,
        recorder,
        prescription,
        attrs,
        %Date{} = today,
        exercises_by_id \\ %{}
      ) do
    %__MODULE__{sets: [], exercise_logs: []}
    |> change(business_id: business_id, client_id: client_id, date: today)
    |> put_recorder(recorder)
    |> put_prescription(prescription)
    |> edit_changeset(attrs, today, prescription, exercises_by_id)
  end

  @spec update_changeset(t(), map(), Date.t(), prescription(), map()) :: Ecto.Changeset.t()
  def update_changeset(
        %__MODULE__{} = log,
        attrs,
        %Date{} = today,
        prescription,
        exercises_by_id \\ %{}
      ) do
    log
    |> change()
    |> require_state(:active)
    |> edit_changeset(attrs, today, prescription, exercises_by_id)
  end

  @spec finish_changeset(t(), map(), Date.t(), prescription(), map()) :: Ecto.Changeset.t()
  def finish_changeset(log, attrs, today, prescription, exercises_by_id \\ %{}) do
    log
    |> update_changeset(attrs, today, prescription, exercises_by_id)
    |> put_change(:state, :completed)
  end

  # These commands only change state; recorded content and original recorder stay.
  # DB uniqueness and the writer's transaction must enforce cross-log availability.
  @spec discard_changeset(t()) :: Ecto.Changeset.t()
  def discard_changeset(%__MODULE__{} = log) do
    log
    |> change()
    |> require_state(:active)
    |> put_change(:state, :discarded)
    |> database_constraints()
  end

  @spec reopen_changeset(t()) :: Ecto.Changeset.t()
  def reopen_changeset(%__MODULE__{} = log) do
    log
    |> change()
    |> require_state(:completed)
    |> put_change(:state, :active)
    |> database_constraints()
  end

  defp require_state(changeset, state) do
    if changeset.data.state == state,
      do: changeset,
      else: add_error(changeset, :state, "must be #{state} for this action")
  end

  defp put_recorder(changeset, :client), do: put_change(changeset, :recorded_by, :client)

  defp put_recorder(changeset, {:coach, coach_id}),
    do: change(changeset, recorded_by: :coach, coach_id: coach_id)

  defp put_recorder(changeset, _),
    do: add_error(changeset, :recorded_by, "must resolve to a client or coach recorder")

  defp put_prescription(changeset, %Workout{} = workout),
    do: put_change(changeset, :workout_id, workout.id)

  defp put_prescription(changeset, {%Workout{} = workout, %WorkoutSchedule{} = schedule, date}),
    do: change(changeset, workout_id: workout.id, schedule_id: schedule.id, scheduled_date: date)

  defp put_prescription(changeset, _), do: changeset

  defp edit_changeset(changeset, attrs, today, prescription, exercises_by_id) do
    changeset
    |> cast(attrs, [:date, :time, :effort, :pain, :text], empty_values: [])
    |> normalize_text()
    |> validate_required([:business_id, :client_id, :recorded_by, :state, :date])
    |> validate_reference_ids()
    |> validate_recorder()
    |> validate_record_date(:date, today)
    |> validate_record_date(:scheduled_date, today)
    |> validate_occurrence_shape()
    |> validate_feedback()
    |> validate_prescription(prescription)
    |> swaps_changeset(attrs, prescription_workout(prescription), exercises_by_id)
    |> Easy.Workouts.Recording.validate_session()
    |> database_constraints()
  end

  defp normalize_text(changeset) do
    case get_field(changeset, :text) do
      text when is_binary(text) ->
        trimmed = String.trim(text)
        put_change(changeset, :text, if(trimmed == "", do: nil, else: trimmed))

      _ ->
        changeset
    end
  end

  defp validate_reference_ids(changeset) do
    Enum.reduce(
      [:business_id, :client_id, :coach_id, :workout_id, :schedule_id],
      changeset,
      fn field, acc ->
        case get_field(acc, field) do
          nil ->
            acc

          value ->
            case Ecto.UUID.cast(value) do
              {:ok, id} -> put_change(acc, field, id)
              :error -> add_error(acc, field, "must be a valid UUID")
            end
        end
      end
    )
  end

  defp validate_recorder(changeset) do
    case get_field(changeset, :recorded_by) do
      :client ->
        if is_nil(get_field(changeset, :coach_id)),
          do: changeset,
          else: add_error(changeset, :coach_id, "must be empty for client recording")

      :coach ->
        validate_required(changeset, [:coach_id])

      _ ->
        add_error(changeset, :recorded_by, "must be client or coach")
    end
  end

  defp validate_record_date(changeset, field, today) do
    case get_field(changeset, field) do
      nil ->
        changeset

      %Date{} = date ->
        if Date.compare(date, today) == :gt,
          do: add_error(changeset, field, "must not be after the client's local today"),
          else: changeset

      _ ->
        add_error(changeset, field, "must be a valid date")
    end
  end

  defp validate_occurrence_shape(changeset) do
    schedule_id = get_field(changeset, :schedule_id)
    date = get_field(changeset, :scheduled_date)

    changeset =
      cond do
        is_nil(schedule_id) and not is_nil(date) ->
          add_error(changeset, :scheduled_date, "requires a schedule")

        not is_nil(schedule_id) and is_nil(date) ->
          add_error(changeset, :scheduled_date, "is required for a scheduled log")

        true ->
          changeset
      end

    if not is_nil(schedule_id) and is_nil(get_field(changeset, :workout_id)),
      do: add_error(changeset, :workout_id, "is required for a scheduled log"),
      else: changeset
  end

  defp validate_feedback(changeset) do
    effort = get_field(changeset, :effort)

    changeset =
      if is_nil(effort) or (is_integer(effort) and effort in 1..5),
        do: changeset,
        else: add_error(changeset, :effort, "must be an integer from 1 to 5")

    changeset =
      if get_field(changeset, :pain) in [nil, true, false],
        do: changeset,
        else: add_error(changeset, :pain, "must be true, false, or unanswered")

    case get_field(changeset, :text) do
      nil ->
        changeset

      text when is_binary(text) ->
        if length(String.codepoints(text)) <= 10_000,
          do: changeset,
          else: add_error(changeset, :text, "must be at most 10000 characters")

      _ ->
        add_error(changeset, :text, "must be plain text")
    end
  end

  defp validate_prescription(changeset, prescription)
       when is_nil(prescription) or is_struct(prescription, Workout) do
    if is_nil(get_field(changeset, :schedule_id)),
      do: changeset,
      else: add_error(changeset, :schedule_id, "requires the resolved scheduled occurrence")
  end

  defp validate_prescription(changeset, {%Workout{}, %WorkoutSchedule{} = schedule, date}) do
    matches =
      not is_nil(schedule.id) and schedule.id == get_field(changeset, :schedule_id) and
        schedule.workout_id == get_field(changeset, :workout_id) and
        schedule.business_id == get_field(changeset, :business_id) and
        schedule.client_id == get_field(changeset, :client_id)

    changeset =
      if matches,
        do: changeset,
        else: add_error(changeset, :schedule_id, "must match this workout, client, and business")

    if date == get_field(changeset, :scheduled_date) and schedule_applies?(schedule, date),
      do: changeset,
      else: add_error(changeset, :scheduled_date, "must match an occurrence in this schedule")
  end

  defp validate_prescription(changeset, _),
    do: add_error(changeset, :workout_id, "must use a resolved workout or scheduled occurrence")

  defp prescription_workout(%Workout{} = workout), do: workout
  defp prescription_workout({%Workout{} = workout, %WorkoutSchedule{}, _date}), do: workout
  defp prescription_workout(_), do: nil

  defp schedule_applies?(
         %WorkoutSchedule{from_date: %Date{} = first, weekdays_mask: mask} = schedule,
         %Date{} = date
       )
       when is_integer(mask) and mask in 1..127 do
    within_end =
      case schedule.until_date do
        nil -> true
        %Date{} = last -> Date.compare(date, last) != :gt
        _ -> false
      end

    Date.compare(date, first) != :lt and within_end and
      Bitwise.band(mask, Bitwise.bsl(1, Date.day_of_week(date) - 1)) != 0
  end

  defp schedule_applies?(_schedule, _date), do: false

  # Existing and proposed DB constraint registrations; no DB checks run here.
  defp database_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:client_id, name: :workout_logs_client_id_business_id_fkey)
    |> foreign_key_constraint(:coach_id, name: :workout_logs_coach_id_business_id_fkey)
    |> foreign_key_constraint(:workout_id,
      name: :workout_logs_workout_id_client_id_business_id_fkey
    )
    |> foreign_key_constraint(:schedule_id,
      name: :workout_logs_schedule_id_client_id_business_id_fkey
    )
    |> foreign_key_constraint(:schedule_id, name: :workout_logs_schedule_workout)
    |> check_constraint(:state, name: :workout_logs_values)
    |> check_constraint(:recorded_by, name: :workout_logs_recorder_valid)
    |> check_constraint(:effort, name: :workout_logs_effort_valid)
    |> check_constraint(:text, name: :workout_logs_text_length)
    |> unique_constraint(:state, name: :workout_logs_one_active)
    |> unique_constraint(:schedule_id, name: :workout_logs_current_occurrence)
  end

  # Only swap structure is validated here (W76). The future writer must authorize the
  # actor, enforce active-state editing, and load/lock the complete recorded sets.
  @spec swaps_changeset(t() | Ecto.Changeset.t(), map(), Workout.t() | nil, map()) ::
          Ecto.Changeset.t()
  def swaps_changeset(log, attrs, workout, exercises_by_id) when is_map(exercises_by_id) do
    changeset = cast(log, attrs, [], empty_values: [])

    cond do
      not matching_workout?(changeset, workout) ->
        add_error(changeset, :workout_id, "must resolve this client's workout in this business")

      not recorded_sets_loaded?(changeset.data) ->
        add_error(
          changeset,
          :sets,
          "must be loaded and belong to this log with valid round numbers"
        )

      true ->
        cast_swaps(changeset, workout, exercises_by_id)
    end
  end

  defp matching_workout?(changeset, nil), do: is_nil(get_field(changeset, :workout_id))

  defp matching_workout?(changeset, %Workout{} = workout) do
    not is_nil(workout.id) and not is_nil(workout.client_id) and
      not is_nil(workout.business_id) and
      workout.id == get_field(changeset, :workout_id) and
      workout.client_id == get_field(changeset, :client_id) and
      workout.business_id == get_field(changeset, :business_id)
  end

  defp matching_workout?(_changeset, _workout), do: false

  defp recorded_sets_loaded?(log) do
    is_list(log.sets) and
      Enum.all?(log.sets, fn set ->
        is_struct(set, ExerciseSet) and not is_nil(log.id) and
          set.workout_log_id == log.id and set.business_id == log.business_id and
          is_integer(set.round) and set.round > 0
      end)
  end

  defp cast_swaps(changeset, workout, exercises_by_id) do
    current = get_field(changeset, :swaps)

    case Map.fetch(changeset.params, "swaps") do
      :error ->
        pairs = Enum.map(current, &{&1, %{}})
        validate_swaps(changeset, pairs, workout, exercises_by_id)

      {:ok, values} when is_list(values) ->
        if Enum.all?(values, &(is_map(&1) and not is_struct(&1))) do
          existing = Map.new(current, &{&1.workout_exercise_id, &1})

          pairs =
            Enum.map(values, fn value ->
              attrs = Map.new(value, fn {key, item} -> {to_string(key), item} end)

              id =
                case Ecto.UUID.cast(attrs["workout_exercise_id"]) do
                  {:ok, id} -> id
                  :error -> nil
                end

              {Map.get(existing, id, %ExerciseSwap{}), attrs}
            end)

          validate_swaps(changeset, pairs, workout, exercises_by_id)
        else
          add_error(changeset, :swaps, "must be an array of swap objects")
        end

      {:ok, _} ->
        add_error(changeset, :swaps, "must be an array of swap objects")
    end
  end

  defp validate_swaps(changeset, [], _workout, _exercises_by_id),
    do: put_embed(changeset, :swaps, [])

  defp validate_swaps(changeset, pairs, %Workout{type: :prescribed} = workout, exercises_by_id) do
    swaps =
      Enum.map(pairs, fn {swap, attrs} ->
        ExerciseSwap.changeset(swap, attrs, workout, exercises_by_id, changeset.data.sets)
      end)

    ids = Enum.map(swaps, &get_field(&1, :workout_exercise_id)) |> Enum.reject(&is_nil/1)
    changeset = put_embed(changeset, :swaps, swaps)

    if Enum.uniq(ids) == ids,
      do: changeset,
      else: add_error(changeset, :swaps, "must have only one selection per prescribed occurrence")
  end

  defp validate_swaps(changeset, _pairs, _workout, _exercises_by_id),
    do: add_error(changeset, :swaps, "requires a prescribed workout")

  # Planned recorder constraints (W70): recorded_by is NOT NULL.
  # CHECK((recorded_by = 'client' AND coach_id IS NULL) OR
  #       (recorded_by = 'coach' AND coach_id IS NOT NULL)).
  # FK(coach_id, business_id) -> coaches(id, business_id), retain past references.
  # Recorder validation is above; database migration and writer integration remain pending.
  # Planned feedback checks (W73): effort IS NULL OR effort BETWEEN 1 AND 5;
  # text is nullable and at most 10,000 characters. Completion must allow all
  # feedback fields to be null, including an unanswered pain flag.
end

defmodule Easy.Workouts.ResultUnits do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key false
  @type t :: %__MODULE__{}

  embedded_schema do
    field(:reps, Ecto.Enum, values: [:count, :reps])
    field(:weight, Ecto.Enum, values: [:kg, :lb])
    field(:duration, Ecto.Enum, values: [:s, :min, :"h:mm:ss"])
    field(:distance, Ecto.Enum, values: [:m, :km, :mi, :yd])
    field(:elevation_gain, Ecto.Enum, values: [:m, :ft])
    field(:height, Ecto.Enum, values: [:cm, :in])
    field(:calories, Ecto.Enum, values: [:kcal])
    field(:speed, Ecto.Enum, values: [:"m/s", :"km/h", :mph, :"min/km", :"min/mi", :"min/100m"])
    field(:incline, Ecto.Enum, values: [:%])
    field(:level, Ecto.Enum, values: [:level])
    field(:power, Ecto.Enum, values: [:W])
    field(:cadence, Ecto.Enum, values: [:rpm, :spm])
    field(:heart_rate, Ecto.Enum, values: [:bpm])
    field(:effort, Ecto.Enum, values: [:RPE])
    field(:reserve, Ecto.Enum, values: [:RIR])
    field(:successes, Ecto.Enum, values: [:count])
    field(:attempts, Ecto.Enum, values: [:count])
    field(:score, Ecto.Enum, values: [:points])
  end

  # Unit metadata describes entry/display; values already use canonical units.
  @spec changeset(t(), map(), [atom()]) :: Ecto.Changeset.t()
  def changeset(units, attrs, selected) do
    fields = __schema__(:fields)
    changeset = cast(units, attrs, fields, empty_values: [])
    unknown = Map.keys(changeset.params) -- Enum.map(fields, &Atom.to_string/1)

    changeset =
      Enum.reduce(unknown, changeset, fn key, acc ->
        add_error(acc, :base, "unsupported unit #{key}")
      end)

    Enum.reduce(changeset.changes, changeset, fn {key, value}, acc ->
      if value != nil and key not in selected,
        do: add_error(acc, key, "is not selected for this result"),
        else: acc
    end)
  end
end

defmodule Easy.Workouts.ResultMeasurements do
  import Ecto.Changeset
  alias Easy.Workouts.{Exercise, ResultUnits}

  @overall [
    reps: :reps,
    weight_kg: :weight,
    duration_s: :duration,
    distance_m: :distance,
    elevation_gain_m: :elevation_gain,
    height_cm: :height,
    calories_kcal: :calories,
    avg_speed_m_s: :speed,
    incline_pct: :incline,
    level: :level,
    avg_power_w: :power,
    avg_cadence_per_min: :cadence,
    avg_heart_rate_bpm: :heart_rate,
    effort: :effort,
    successes: :successes,
    attempts: :attempts,
    score: :score,
    result: :result
  ]

  # Zero and an outcome without a number are recorded values too. Legacy values
  # must also prevent a normal swap/skip from erasing recorded work.
  @spec present?(struct()) :: boolean()
  def present?(row) do
    fields =
      Keyword.keys(@overall) ++
        [:reserve, :speed_m_s, :power_w, :cadence_rpm, :heart_rate_bpm, :grade]

    Enum.any?(fields, &(not is_nil(Map.get(row, &1))))
  end

  # Measurement-only input. The caller authorizes and resolves the exercise,
  # parent, and lifecycle before using this helper; it does not write records.
  @spec changeset(struct(), map(), Exercise.t(), :overall | :detail) :: Ecto.Changeset.t()
  def changeset(row, attrs, %Exercise{} = exercise, scope) when scope in [:overall, :detail] do
    fields = if scope == :detail, do: @overall ++ [reserve: :reserve], else: @overall

    selected =
      Enum.map(exercise.metrics, & &1.key) |> Enum.filter(&(&1 in Keyword.values(fields)))

    # Ecto raises for nonfinite Decimal structs but returns errors for strings.
    attrs =
      Map.new(attrs, fn
        {key, %Decimal{} = value} -> {key, Decimal.to_string(value)}
        pair -> pair
      end)

    row
    |> cast(attrs, Keyword.keys(fields), empty_values: [])
    |> validate_input(fields)
    |> validate_values(fields, selected)
    |> validate_attempts()
    |> cast_units(selected)
  end

  defp validate_input(changeset, fields) do
    allowed = Enum.map([:entered_units | Keyword.keys(fields)], &Atom.to_string/1)

    Enum.reduce(Map.keys(changeset.params) -- allowed, changeset, fn key, acc ->
      add_error(acc, :base, "unsupported measurement #{key}")
    end)
  end

  defp validate_values(changeset, fields, selected) do
    Enum.reduce(fields, changeset, fn {field, metric}, acc ->
      value = get_field(acc, field)

      acc =
        if match?({:ok, value} when not is_nil(value), fetch_change(acc, field)) and
             metric not in selected,
           do: add_error(acc, field, "is not selected for this exercise"),
           else: acc

      cond do
        is_nil(value) ->
          acc

        get_field(acc, :state) == :skipped ->
          add_error(acc, field, "must be empty for skipped work")

        metric == :result ->
          acc

        true ->
          validate_number_value(acc, field, metric, value)
      end
    end)
  end

  defp validate_number_value(changeset, field, metric, value) do
    {minimum, maximum} =
      case metric do
        :effort -> {1, 10}
        :reserve -> {0, 10}
        :level -> {1, nil}
        key when key in [:weight, :incline, :score] -> {nil, nil}
        _ -> {0, nil}
      end

    cond do
      not finite?(value) ->
        add_error(changeset, field, "must be finite")

      minimum != nil and Decimal.compare(value, minimum) == :lt ->
        add_error(changeset, field, "must be greater than or equal to #{minimum}")

      maximum != nil and Decimal.compare(value, maximum) == :gt ->
        add_error(changeset, field, "must be less than or equal to #{maximum}")

      true ->
        changeset
    end
  end

  defp finite?(%Decimal{coef: coefficient}), do: is_integer(coefficient)
  defp finite?(value), do: is_integer(value)

  defp validate_attempts(changeset) do
    case {get_field(changeset, :successes), get_field(changeset, :attempts)} do
      {successes, attempts}
      when is_integer(successes) and is_integer(attempts) and successes > attempts ->
        add_error(changeset, :successes, "must not exceed attempts")

      _ ->
        changeset
    end
  end

  defp cast_units(changeset, selected) do
    value = changeset.params["entered_units"]

    if is_nil(value) or (is_map(value) and not is_struct(value)) do
      cast_embed(changeset, :entered_units,
        with: fn units, attrs -> ResultUnits.changeset(units, attrs, selected) end
      )
    else
      add_error(changeset, :entered_units, "must be an object or null")
    end
  end
end

defmodule Easy.Workouts.ExerciseLog do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "exercise_logs" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:workout_log, Easy.Workouts.WorkoutLog)
    # Selected activity; this reference alone does not establish performed work.
    belongs_to(:exercise, Easy.Workouts.Exercise)

    # Optional ID of the original WorkoutExercise embed, not a relational FK.
    # Nil means an activity added without a prescribed entry. Multiple activity
    # logs can reference the same entry, including a replacement after saved work.
    field(:workout_exercise_id, :binary_id)

    # Active: no final activity outcome was confirmed; it may contain partial work.
    # A closed WorkoutLog freezes this unfinished record. Completed: work confirmed,
    # with or without measurements; it does not assert every target was met.
    # Skipped: the recorder explicitly confirms this activity was not performed.
    field(:state, Ecto.Enum, values: [:active, :completed, :skipped], default: :active)

    # Chosen when recording starts; inherited from a prescribed entry when linked.
    field(:side_mode, Ecto.Enum, values: [:combined, :per_side], default: :combined)

    # Current instructions for unrecorded work. Rounds use the original entry's
    # numbering across replacements; actual extra rounds may exceed the plan.
    field(:rounds, :integer, default: 1)
    field(:targets_mode, Ecto.Enum, values: [:same_for_all, :per_round], default: :same_for_all)
    embeds_many(:targets, Easy.Workouts.RoundTargets, on_replace: :delete)

    # Assigned by the writer, starting at zero, for activity order in this session.
    # This is independent of the prescribed entry's position in the workout.
    field(:position, :integer)

    # Reported overall result (W81-W82). Nil is unknown; never default to zero or
    # fill from targets/interval sums. Child details may cover only part of it.
    field(:reps, :integer)
    field(:weight_kg, :decimal)
    field(:duration_s, :decimal)
    field(:distance_m, :decimal)
    field(:elevation_gain_m, :decimal)
    field(:height_cm, :decimal)
    field(:calories_kcal, :decimal)

    # An average covers this whole activity. Load/settings apply throughout;
    # record differing values in the details rather than inventing an average.
    field(:avg_speed_m_s, :decimal)
    field(:incline_pct, :decimal)
    field(:level, :integer)
    field(:avg_power_w, :decimal)
    field(:avg_cadence_per_min, :decimal)
    field(:avg_heart_rate_bpm, :decimal)
    # Activity effort remains 1-10, separate from WorkoutLog's 1-5 feedback.
    field(:effort, :decimal)

    field(:successes, :integer)
    field(:attempts, :integer)
    field(:score, :decimal)
    field(:result, Ecto.Enum, values: [:win, :draw, :loss])

    embeds_one(:entered_units, Easy.Workouts.ResultUnits, on_replace: :update)

    has_many(:sets, Easy.Workouts.ExerciseSet, preload_order: [asc: :round, asc: :id])

    timestamps(type: :utc_datetime)
  end

  @spec measurements_changeset(t(), map(), Easy.Workouts.Exercise.t()) :: Ecto.Changeset.t()
  def measurements_changeset(log, attrs, exercise),
    do: Easy.Workouts.ResultMeasurements.changeset(log, attrs, exercise, :overall)

  # Recording below validates creation, ownership, outcomes, and child recording.
  # Client and recorder are inherited from WorkoutLog. Database constraints,
  # transactions, legacy-field migration, and mismatch UI remain pending.
end

# W78-W80: a detail record belongs to ExerciseLog. Earlier direct session/exercise
# references remain below until their removal and affected validators are reviewed.
defmodule Easy.Workouts.ExerciseSet do
  use Ecto.Schema

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "exercise_sets" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:exercise_log, Easy.Workouts.ExerciseLog)
    # Earlier references retained during review; the parent now owns these facts.
    belongs_to(:workout_log, Easy.Workouts.WorkoutLog)
    belongs_to(:exercise, Easy.Workouts.Exercise)

    field(:workout_exercise_id, :binary_id)
    # No default: only an explicit record/skip command creates a detailed outcome.
    field(:state, Ecto.Enum, values: [:completed, :skipped])
    field(:round, :integer)
    # Prescribed results: combined uses null; per_side uses separate left/right
    # rows with the same round number. The workout prescription sets this rule.
    field(:side, Ecto.Enum, values: [:left, :right])

    field(:reps, :integer)
    field(:weight_kg, :decimal)
    field(:duration_s, :decimal)
    field(:distance_m, :decimal)
    field(:elevation_gain_m, :decimal)
    field(:height_cm, :decimal)
    field(:calories_kcal, :decimal)

    # Explicit averages cover this set/interval, not the whole activity.
    field(:avg_speed_m_s, :decimal)
    field(:incline_pct, :decimal)
    field(:level, :integer)
    field(:avg_power_w, :decimal)
    field(:avg_cadence_per_min, :decimal)
    field(:avg_heart_rate_bpm, :decimal)
    field(:effort, :decimal)
    # Reserve describes this individual set; it has no whole-activity equivalent.
    field(:reserve, :decimal)

    field(:successes, :integer)
    field(:attempts, :integer)
    field(:score, :decimal)
    field(:result, Ecto.Enum, values: [:win, :draw, :loss])
    # Retain historical fields without relabeling their unknown statistic as an
    # average. New measurement input does not write these fields (W82).
    field(:speed_m_s, :decimal)
    field(:power_w, :decimal)
    field(:cadence_rpm, :integer)
    field(:heart_rate_bpm, :integer)
    # Historical grades remain readable under ADR 0005.
    field(:grade, :string)

    embeds_one(:entered_units, Easy.Workouts.ResultUnits, on_replace: :update)

    timestamps(type: :utc_datetime)
  end

  @spec measurements_changeset(t(), map(), Easy.Workouts.Exercise.t()) :: Ecto.Changeset.t()
  def measurements_changeset(set, attrs, exercise),
    do: Easy.Workouts.ResultMeasurements.changeset(set, attrs, exercise, :detail)
end

defmodule Easy.Workouts.Recording do
  import Ecto.Changeset

  alias Easy.Workouts.{
    Exercise,
    ExerciseLog,
    ExerciseSet,
    ResultMeasurements,
    RoundTargets,
    Workout,
    WorkoutLog
  }

  # Pure draft commands. The persistence context must authorize the actor, lock
  # the session, load this complete hierarchy, and apply each result atomically.
  # Activity targets belong to ExerciseLog; old WorkoutLog swaps are legacy-only.
  @type source :: nil | {Workout.t(), String.t()}

  @spec start_activity(WorkoutLog.t(), Exercise.t(), source(), atom()) :: Ecto.Changeset.t()
  def start_activity(session, exercise, source \\ nil, side_mode \\ :combined) do
    position =
      if is_list(session.exercise_logs),
        do:
          Enum.map(session.exercise_logs, & &1.position)
          |> Enum.filter(&is_integer/1)
          |> Enum.max(fn -> -1 end)
          |> Kernel.+(1),
        else: 0

    %ExerciseLog{sets: [], targets: [%RoundTargets{}]}
    |> change(
      business_id: session.business_id,
      workout_log_id: session.id,
      exercise_id: exercise.id,
      position: position
    )
    |> cast(%{side_mode: side_mode}, [:side_mode], empty_values: [])
    |> require_session(session)
    |> resolve_source(session, source)
    |> validate_exercise(exercise, session, source, true)
    |> initialize_instructions(session, source)
    |> validate_instructions(session, exercise)
    |> validate_required([:business_id, :workout_log_id, :exercise_id, :side_mode, :position])
    |> activity_constraints()
  end

  @spec update_activity(WorkoutLog.t(), ExerciseLog.t(), Exercise.t(), map()) ::
          Ecto.Changeset.t()
  def update_activity(session, activity, exercise, attrs) do
    activity
    |> activity_payload(attrs, exercise, session, activity.state)
    |> require_activity(session, activity)
    |> validate_exercise(exercise, session, nil, false)
    |> activity_constraints()
  end

  @spec complete_activity(WorkoutLog.t(), ExerciseLog.t(), Exercise.t(), map()) ::
          Ecto.Changeset.t()
  def complete_activity(session, activity, exercise, attrs \\ %{}) do
    activity
    |> activity_payload(attrs, exercise, session, :completed)
    |> require_activity(session, activity)
    |> validate_exercise(exercise, session, nil, false)
    |> activity_constraints()
  end

  @spec skip_activity(WorkoutLog.t(), ExerciseLog.t()) :: Ecto.Changeset.t()
  def skip_activity(session, activity) do
    changeset = activity |> change() |> require_activity(session, activity)

    has_completed_sets =
      is_list(activity.sets) and Enum.any?(activity.sets, &(&1.state == :completed))

    if activity.state == :completed or ResultMeasurements.present?(activity) or has_completed_sets do
      add_error(changeset, :state, "cannot skip recorded work; correct the record explicitly")
    else
      changeset |> put_change(:state, :skipped) |> activity_constraints()
    end
  end

  # Explicitly undo an activity outcome; resuming ordinary entry needs no reset.
  # Measurements and child outcomes remain, so this cannot erase performed work.
  @spec reopen_activity(WorkoutLog.t(), ExerciseLog.t()) :: Ecto.Changeset.t()
  def reopen_activity(session, activity) do
    changeset = activity |> change() |> require_activity(session, activity)

    if activity.state in [:completed, :skipped],
      do: put_change(changeset, :state, :active),
      else: add_error(changeset, :state, "has no completed or skipped outcome to reopen")
  end

  @spec replace_activity(WorkoutLog.t(), ExerciseLog.t(), Exercise.t(), source()) ::
          {atom(), Ecto.Changeset.t()}
  def replace_activity(session, activity, replacement, source \\ nil) do
    untouched =
      activity.state == :active and activity.sets == [] and
        not ResultMeasurements.present?(activity)

    cond do
      source_id(source) != activity.workout_exercise_id ->
        {:update,
         activity
         |> change()
         |> add_error(:workout_exercise_id, "must retain the original prescribed entry")}

      replacement.id == activity.exercise_id ->
        {:update,
         activity
         |> change()
         |> require_activity(session, activity)
         |> validate_exercise(replacement, session, source, false)}

      untouched ->
        changeset =
          activity |> change(exercise_id: replacement.id) |> put_embed(:entered_units, nil)

        {:update,
         changeset
         |> require_activity(session, activity)
         |> resolve_source(session, source)
         |> validate_exercise(replacement, session, source, true)
         |> replacement_instructions(session, activity)
         |> validate_instructions(session, replacement)
         |> activity_constraints()}

      true ->
        changeset = start_activity(session, replacement, source, activity.side_mode)

        {:insert,
         changeset
         |> require_activity(session, activity)
         |> replacement_instructions(session, activity)
         |> validate_instructions(session, replacement)}
    end
  end

  @spec record_set(WorkoutLog.t(), ExerciseLog.t(), Exercise.t(), map(), ExerciseSet.t() | nil) ::
          Ecto.Changeset.t()
  def record_set(session, activity, exercise, attrs, existing \\ nil) do
    {slot, measurements} = split_slot(attrs)
    changeset = set_changeset(session, activity, slot, existing, :completed)

    # Keep the measurement payload separate from immutable slot/reference input.
    values =
      ResultMeasurements.changeset(
        change(changeset.data, state: :completed),
        measurements,
        exercise,
        :detail
      )

    changeset
    |> merge(values)
    |> validate_exercise_for_activity(exercise, activity, session)
    |> reject_skipped_parent(activity)
    |> set_constraints()
  end

  @spec skip_set(WorkoutLog.t(), ExerciseLog.t(), map(), ExerciseSet.t() | nil) ::
          Ecto.Changeset.t()
  def skip_set(session, activity, attrs, existing \\ nil) do
    {slot, extra} = split_slot(attrs)
    changeset = set_changeset(session, activity, slot, existing, :skipped)

    changeset =
      if extra == %{},
        do: changeset,
        else: add_error(changeset, :base, "skip input accepts only round and side")

    if existing && (existing.state == :completed or ResultMeasurements.present?(existing)) do
      add_error(
        changeset,
        :state,
        "cannot skip a recorded result; remove it explicitly to correct it"
      )
    else
      changeset |> reject_skipped_parent(activity) |> set_constraints()
    end
  end

  @spec remove_set(WorkoutLog.t(), ExerciseLog.t(), ExerciseSet.t()) :: Ecto.Changeset.t()
  def remove_set(session, activity, set) do
    changeset =
      set |> change() |> require_activity(session, activity) |> require_set(activity, set)

    %{changeset | action: :delete}
  end

  # Called by WorkoutLog edits/finish. It validates but never completes children,
  # creates missing rows, aggregates measurements, or replaces supplied records.
  @spec validate_session(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_session(changeset) do
    session = changeset.data
    activities = session.exercise_logs

    if is_list(activities) and Enum.all?(activities, &valid_activity?(session, &1)) and
         (activities == [] or (get_field(changeset, :swaps) == [] and session.sets == [])) and
         unique?(Enum.map(activities, & &1.id)) and unique?(Enum.map(activities, & &1.position)) and
         unique?(for activity <- activities, set <- activity.sets, do: set.id) and
         unique?(for activity <- activities, set <- activity.sets, do: slot_key(activity, set)) and
         consistent_sides?(activities) do
      changeset
    else
      add_error(
        changeset,
        :exercise_logs,
        "must load a valid hierarchy with unique activity positions and result slots"
      )
    end
  end

  defp set_changeset(session, activity, slot, existing, state) do
    row = existing || %ExerciseSet{}
    changeset = row |> change(state: state) |> cast(slot, [:round, :side], empty_values: [])

    changeset =
      if existing,
        do: require_set(changeset, activity, existing),
        else: change(changeset, business_id: activity.business_id, exercise_log_id: activity.id)

    changeset =
      changeset
      |> require_activity(session, activity)
      |> validate_required([:state, :round, :business_id, :exercise_log_id])
      |> validate_number(:round, greater_than: 0, less_than_or_equal_to: 10_000)

    changeset =
      if side_valid?(activity, get_field(changeset, :side)),
        do: changeset,
        else: add_error(changeset, :side, "must match this activity's side mode")

    changeset =
      if existing &&
           (get_field(changeset, :round) != existing.round or
              get_field(changeset, :side) != existing.side),
         do: add_error(changeset, :round, "cannot move a recorded slot"),
         else: changeset

    candidate = apply_changes(changeset)

    collision =
      is_list(session.exercise_logs) and
        Enum.any?(session.exercise_logs, fn other ->
          is_list(other.sets) and
            Enum.any?(other.sets, fn set ->
              (is_nil(existing) or set.id != existing.id) and
                slot_key(other, set) == slot_key(activity, candidate)
            end)
        end)

    if collision,
      do: add_error(changeset, :round, "already has an outcome; update that result explicitly"),
      else: changeset
  end

  defp activity_payload(activity, attrs, exercise, session, outcome) do
    {instructions, measurements} =
      attrs
      |> Map.new(fn {key, value} -> {to_string(key), value} end)
      |> Map.split(["rounds", "targets_mode", "targets"])

    changeset =
      activity
      |> change(state: outcome)
      |> ResultMeasurements.changeset(measurements, exercise, :overall)

    if instructions == %{} do
      changeset
    else
      instruction_changes =
        activity
        |> change()
        |> cast(instructions, [:rounds, :targets_mode], empty_values: [])
        |> validate_instructions(session, exercise)

      merge(changeset, instruction_changes)
    end
  end

  defp initialize_instructions(changeset, session, source) do
    case source_entry(session, source) do
      {group, entry} ->
        targets =
          if entry.exercise_id == get_field(changeset, :exercise_id),
            do: entry.targets,
            else: rest_only(entry.targets)

        rounds =
          if is_integer(group.rounds),
            do: max(group.rounds, highest_round(session, apply_changes(changeset))),
            else: group.rounds

        changeset
        |> change(rounds: rounds, targets_mode: entry.targets_mode)
        |> put_embed(:targets, pad_targets(targets, entry.targets_mode, rounds))

      nil ->
        changeset
    end
  end

  defp replacement_instructions(changeset, session, activity) do
    rounds = max(activity.rounds, highest_round(session, activity))
    targets = activity.targets |> rest_only() |> pad_targets(activity.targets_mode, rounds)

    changeset
    |> change(rounds: rounds, targets_mode: activity.targets_mode, side_mode: activity.side_mode)
    |> put_embed(:targets, targets)
  end

  defp rest_only(targets), do: Enum.map(targets, &%RoundTargets{rest: &1.rest})

  defp pad_targets(targets, :per_round, rounds) when is_integer(rounds) and rounds in 1..10_000,
    do: targets ++ List.duplicate(%RoundTargets{}, max(rounds - length(targets), 0))

  defp pad_targets(targets, _, _), do: targets

  defp validate_instructions(changeset, session, exercise) do
    changeset =
      changeset
      |> cast(%{}, [], empty_values: [])
      |> validate_required([:rounds, :targets_mode])
      |> validate_number(:rounds, greater_than: 0, less_than_or_equal_to: 10_000)

    rounds = get_field(changeset, :rounds)
    highest = highest_round(session, apply_changes(changeset))

    changeset =
      if is_integer(rounds) and rounds < highest,
        do: add_error(changeset, :rounds, "must include recorded round #{highest}"),
        else: changeset

    RoundTargets.cast_many(changeset, exercise, rounds)
  end

  defp highest_round(session, activity) do
    if is_list(session.exercise_logs) do
      session.exercise_logs
      |> Enum.filter(fn other ->
        if activity.workout_exercise_id,
          do: other.workout_exercise_id == activity.workout_exercise_id,
          else: other.id == activity.id
      end)
      |> Enum.flat_map(fn other -> if is_list(other.sets), do: other.sets, else: [] end)
      |> Enum.map(& &1.round)
      |> Enum.filter(&is_integer/1)
      |> Enum.max(fn -> 0 end)
    else
      0
    end
  end

  defp require_session(changeset, session) do
    valid =
      session.state == :active and uuid?(session.id) and uuid?(session.business_id) and
        uuid?(session.client_id) and
        session.sets == [] and session.swaps == [] and validate_session(change(session)).valid?

    if valid,
      do: changeset,
      else:
        add_error(
          changeset,
          :workout_log_id,
          "requires an active session with the complete current hierarchy and no legacy recording rows"
        )
  end

  defp require_activity(changeset, session, activity) do
    changeset = require_session(changeset, session)

    present =
      is_list(session.exercise_logs) and Enum.any?(session.exercise_logs, &(&1 == activity))

    if present and valid_activity?(session, activity),
      do: changeset,
      else:
        add_error(
          changeset,
          :workout_log_id,
          "activity must be the loaded record in this session"
        )
  end

  defp require_set(changeset, activity, set) do
    present = is_list(activity.sets) and Enum.any?(activity.sets, &(&1 == set))

    if present and valid_set?(activity, set),
      do: changeset,
      else:
        add_error(
          changeset,
          :exercise_log_id,
          "result must be the loaded record in this activity"
        )
  end

  defp reject_skipped_parent(changeset, %{state: :skipped}),
    do:
      add_error(
        changeset,
        :state,
        "confirm this skipped activity as performed before recording its sets"
      )

  defp reject_skipped_parent(changeset, _), do: changeset

  defp resolve_source(changeset, _session, nil), do: changeset

  defp resolve_source(changeset, session, source) do
    case source_entry(session, source) do
      {_group, entry} ->
        if uuid?(entry.id),
          do: change(changeset, workout_exercise_id: entry.id, side_mode: entry.side_mode),
          else: add_error(changeset, :workout_exercise_id, "must be a UUID")

      nil ->
        add_error(
          changeset,
          :workout_exercise_id,
          "must resolve an entry in this client's workout"
        )
    end
  end

  defp source_entry(session, {%Workout{} = workout, entry_id}) do
    if workout.id == session.workout_id and workout.business_id == session.business_id and
         workout.client_id == session.client_id and workout.type == :prescribed do
      Enum.find_value(workout.groups, fn group ->
        case Enum.find(group.exercises, &(&1.id == entry_id)) do
          nil -> nil
          entry -> {group, entry}
        end
      end)
    end
  end

  defp source_entry(_, _), do: nil

  defp validate_exercise(changeset, exercise, session, source, new?) do
    prescribed =
      case source do
        {%Workout{} = workout, entry_id} ->
          Enum.any?(workout.groups, fn group ->
            Enum.any?(group.exercises, &(&1.id == entry_id and &1.exercise_id == exercise.id))
          end)

        _ ->
          false
      end

    valid =
      uuid?(exercise.id) and exercise.id == get_field(changeset, :exercise_id) and
        exercise.business_id in [nil, session.business_id] and
        (not new? or is_nil(exercise.archived_at) or prescribed)

    if valid,
      do: changeset,
      else:
        add_error(changeset, :exercise_id, "must resolve an available exercise in this business")
  end

  defp validate_exercise_for_activity(changeset, exercise, activity, session) do
    if uuid?(exercise.id) and exercise.id == activity.exercise_id and
         exercise.business_id in [nil, session.business_id],
       do: changeset,
       else: add_error(changeset, :exercise_id, "must resolve the activity's selected exercise")
  end

  defp valid_activity?(session, %ExerciseLog{} = activity) do
    uuid?(activity.id) and uuid?(activity.exercise_id) and
      activity.business_id == session.business_id and activity.workout_log_id == session.id and
      (is_nil(activity.workout_exercise_id) or uuid?(activity.workout_exercise_id)) and
      is_integer(activity.position) and activity.position >= 0 and
      activity.state in [:active, :completed, :skipped] and
      activity.side_mode in [:combined, :per_side] and
      is_integer(activity.rounds) and activity.rounds in 1..10_000 and
      activity.targets_mode in [:same_for_all, :per_round] and is_list(activity.targets) and
      length(activity.targets) ==
        if(activity.targets_mode == :same_for_all, do: 1, else: activity.rounds) and
      is_list(activity.sets) and Enum.all?(activity.sets, &valid_set?(activity, &1)) and
      (activity.state != :skipped or
         (not ResultMeasurements.present?(activity) and
            Enum.all?(activity.sets, &(&1.state == :skipped))))
  end

  defp valid_activity?(_, _), do: false

  defp valid_set?(activity, %ExerciseSet{} = set) do
    uuid?(set.id) and set.exercise_log_id == activity.id and
      set.business_id == activity.business_id and
      is_integer(set.round) and set.round in 1..10_000 and side_valid?(activity, set.side) and
      set.state in [:completed, :skipped] and
      (set.state != :skipped or not ResultMeasurements.present?(set))
  end

  defp valid_set?(_, _), do: false

  defp consistent_sides?(activities) do
    activities
    |> Enum.reject(&is_nil(&1.workout_exercise_id))
    |> Enum.group_by(& &1.workout_exercise_id)
    |> Enum.all?(fn {_, rows} ->
      rows |> Enum.map(& &1.side_mode) |> Enum.uniq() |> length() == 1
    end)
  end

  defp side_valid?(%{side_mode: :combined}, side), do: is_nil(side)
  defp side_valid?(%{side_mode: :per_side}, side), do: side in [:left, :right]
  defp side_valid?(_, _), do: false

  defp slot_key(%{workout_exercise_id: nil, id: id}, set),
    do: {:activity, id, set.round, set.side}

  defp slot_key(activity, set),
    do: {:prescribed, activity.workout_exercise_id, set.round, set.side}

  defp unique?(values), do: Enum.uniq(values) == values
  defp uuid?(id), do: match?({:ok, _}, Ecto.UUID.cast(id))
  defp source_id(nil), do: nil
  defp source_id({_workout, id}), do: id
  defp source_id(_), do: :invalid

  defp split_slot(attrs),
    do:
      attrs
      |> Map.new(fn {key, value} -> {to_string(key), value} end)
      |> Map.split(["round", "side"])

  defp activity_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:workout_log_id, name: :exercise_logs_workout_log_business_fkey)
    |> foreign_key_constraint(:exercise_id, name: :exercise_logs_exercise_tenant)
    |> check_constraint(:state, name: :exercise_logs_values)
    |> unique_constraint(:position, name: :exercise_logs_session_position)
  end

  defp set_constraints(changeset) do
    changeset
    |> foreign_key_constraint(:exercise_log_id, name: :exercise_sets_activity_business_fkey)
    |> check_constraint(:state, name: :exercise_sets_outcome_values)
    |> unique_constraint(:round, name: :exercise_sets_activity_round_side)
  end
end
