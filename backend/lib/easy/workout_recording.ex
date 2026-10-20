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

  @spec validate_session(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate_session(changeset) do
    session = changeset.data
    activities = session.exercise_logs

    if is_list(activities) and Enum.all?(activities, &valid_activity?(session, &1)) and
         unique?(Enum.map(activities, & &1.id)) and unique?(Enum.map(activities, & &1.position)) and
         unique_results?(activities) and consistent_sides?(activities) do
      changeset
    else
      add_error(
        changeset,
        :exercise_logs,
        "must load a valid hierarchy with unique activity positions and result slots"
      )
    end
  end

  defp unique_results?(activities) do
    unique?(for activity <- activities, set <- activity.sets, do: set.id) and
      unique?(for activity <- activities, set <- activity.sets, do: slot_key(activity, set))
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
      |> validate_fixed_slot(existing)

    changeset =
      if side_valid?(activity, get_field(changeset, :side)),
        do: changeset,
        else: add_error(changeset, :side, "must match this activity's side mode")

    candidate = apply_changes(changeset)

    if slot_collision?(session, activity, candidate, existing),
      do: add_error(changeset, :round, "already has an outcome; update that result explicitly"),
      else: changeset
  end

  defp validate_fixed_slot(changeset, nil), do: changeset

  defp validate_fixed_slot(changeset, existing) do
    if {get_field(changeset, :round), get_field(changeset, :side)} == {existing.round, existing.side},
      do: changeset,
      else: add_error(changeset, :round, "cannot move a recorded slot")
  end

  defp slot_collision?(session, activity, candidate, existing) do
    is_list(session.exercise_logs) and
      Enum.any?(session.exercise_logs, fn other ->
        is_list(other.sets) and
          Enum.any?(other.sets, fn set ->
            (is_nil(existing) or set.id != existing.id) and
              slot_key(other, set) == slot_key(activity, candidate)
          end)
      end)
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
        validate_session(change(session)).valid?

    if valid,
      do: changeset,
      else:
        add_error(
          changeset,
          :workout_log_id,
          "requires an active session with the complete current hierarchy"
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
      Enum.find_value(workout.groups, &find_source_entry(&1, entry_id))
    end
  end

  defp source_entry(_, _), do: nil

  defp find_source_entry(group, entry_id) do
    case Enum.find(group.exercises, &(&1.id == entry_id)) do
      nil -> nil
      entry -> {group, entry}
    end
  end

  defp validate_exercise(changeset, exercise, session, source, new?) do
    prescribed = prescribed_exercise?(session, source, exercise)

    valid =
      uuid?(exercise.id) and exercise.id == get_field(changeset, :exercise_id) and
        exercise.business_id in [nil, session.business_id] and
        (not new? or is_nil(exercise.archived_at) or prescribed)

    if valid,
      do: changeset,
      else: add_error(changeset, :exercise_id, "must resolve an available exercise in this business")
  end

  defp prescribed_exercise?(session, source, exercise) do
    case source_entry(session, source) do
      {_group, entry} -> entry.exercise_id == exercise.id
      nil -> false
    end
  end

  defp validate_exercise_for_activity(changeset, exercise, activity, session) do
    if uuid?(exercise.id) and exercise.id == activity.exercise_id and
         exercise.business_id in [nil, session.business_id],
       do: changeset,
       else: add_error(changeset, :exercise_id, "must resolve the activity's selected exercise")
  end

  defp valid_activity?(session, %ExerciseLog{} = activity) do
    valid_activity_reference?(session, activity) and valid_activity_instructions?(activity) and
      valid_activity_results?(activity)
  end

  defp valid_activity?(_, _), do: false

  defp valid_activity_reference?(session, activity) do
    uuid?(activity.id) and uuid?(activity.exercise_id) and
      {activity.business_id, activity.workout_log_id} == {session.business_id, session.id} and
      (is_nil(activity.workout_exercise_id) or uuid?(activity.workout_exercise_id)) and
      is_integer(activity.position) and activity.position >= 0
  end

  defp valid_activity_instructions?(activity) do
    activity.side_mode in [:combined, :per_side] and
      is_integer(activity.rounds) and activity.rounds in 1..10_000 and
      activity.targets_mode in [:same_for_all, :per_round] and is_list(activity.targets) and
      length(activity.targets) == if(activity.targets_mode == :same_for_all, do: 1, else: activity.rounds)
  end

  defp valid_activity_results?(activity) do
    activity.state in [:active, :completed, :skipped] and
      is_list(activity.sets) and Enum.all?(activity.sets, &valid_set?(activity, &1)) and
      valid_activity_outcome?(activity)
  end

  defp valid_activity_outcome?(%{state: :skipped} = activity),
    do: not ResultMeasurements.present?(activity) and Enum.all?(activity.sets, &(&1.state == :skipped))

  defp valid_activity_outcome?(_activity), do: true

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
    |> check_constraint(:round, name: :exercise_sets_values)
    |> check_constraint(:side, name: :exercise_sets_side_valid)
    |> unique_constraint(:round, name: :exercise_sets_prescribed_slot)
    |> unique_constraint(:round, name: :exercise_sets_activity_round_side)
  end
end
