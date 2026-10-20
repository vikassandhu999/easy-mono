defmodule Easy.Workouts.WorkoutLog do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Orgs.Coach
  alias Easy.Workouts.{Exercise, ExerciseLog, ExerciseSet, Recording, Workout, WorkoutSchedule}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  @type recorder :: :client | {:coach, String.t()}
  @type prescription :: nil | Workout.t() | {Workout.t(), WorkoutSchedule.t(), Date.t()}

  schema "workout_logs" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:client, Easy.Clients.Client)
    belongs_to(:coach, Easy.Orgs.Coach)
    belongs_to(:workout, Easy.Workouts.Workout)
    belongs_to(:schedule, Easy.Workouts.WorkoutSchedule)

    field(:scheduled_date, :date)

    field(:state, Ecto.Enum,
      values: [:active, :completed, :discarded],
      default: :active
    )

    field(:date, :date)
    field(:time, :time)
    field(:recorded_by, Ecto.Enum, values: [:client, :coach])
    field(:recorder_name, :string, virtual: true)
    field(:replayed?, :boolean, virtual: true, default: false)

    field(:effort, :integer)
    field(:pain, :boolean)
    field(:text, :string)

    has_many(:exercise_logs, Easy.Workouts.ExerciseLog, preload_order: [asc: :position, asc: :id])

    timestamps(type: :utc_datetime)
  end

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
    %__MODULE__{exercise_logs: []}
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

  defp edit_changeset(changeset, attrs, today, prescription, _exercises_by_id) do
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
    |> Recording.validate_session()
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
      &validate_reference_id(&2, &1)
    )
  end

  defp validate_reference_id(changeset, field) do
    case get_field(changeset, field) do
      nil ->
        changeset

      value ->
        case Ecto.UUID.cast(value) do
          {:ok, id} -> put_change(changeset, field, id)
          :error -> add_error(changeset, field, "must be a valid UUID")
        end
    end
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
    changeset = validate_workout_reference(changeset, prescription)

    if is_nil(get_field(changeset, :schedule_id)),
      do: changeset,
      else: add_error(changeset, :schedule_id, "requires the resolved scheduled occurrence")
  end

  defp validate_prescription(changeset, {%Workout{} = workout, %WorkoutSchedule{} = schedule, date}) do
    changeset = validate_workout_reference(changeset, workout)

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

  defp validate_workout_reference(changeset, nil) do
    if is_nil(get_field(changeset, :workout_id)),
      do: changeset,
      else: add_error(changeset, :workout_id, "requires the resolved client workout")
  end

  defp validate_workout_reference(changeset, workout) do
    expected = {get_field(changeset, :workout_id), get_field(changeset, :business_id), get_field(changeset, :client_id)}

    if not is_nil(workout.id) and {workout.id, workout.business_id, workout.client_id} == expected,
      do: changeset,
      else: add_error(changeset, :workout_id, "must resolve this client's workout in this business")
  end

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

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(l in query, where: l.business_id == ^business_id and l.client_id == ^client_id)

  @spec put_recorder_name(t()) :: t()
  def put_recorder_name(%__MODULE__{} = log), do: %{log | recorder_name: recorder_name(log)}

  defp recorder_name(%{recorded_by: :client, client: %Client{} = client}),
    do: display_name(Client.full_name(client))

  defp recorder_name(%{recorded_by: :coach, coach: %Coach{} = coach}),
    do: display_name(Coach.full_name(coach))

  defp recorder_name(_log), do: "Unknown recorder"

  defp display_name(name) when is_binary(name) do
    if String.trim(name) == "", do: "Unknown recorder", else: name
  end

  defp display_name(_name), do: "Unknown recorder"

  @spec include_content(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_content(query \\ __MODULE__, business_id) do
    sets =
      from(s in ExerciseSet,
        where: s.business_id == ^business_id,
        order_by: [asc: s.round, asc: s.side, asc: s.id]
      )

    exercises = Exercise.visible(business_id) |> Exercise.include_media(business_id)

    activities =
      from(a in ExerciseLog,
        where: a.business_id == ^business_id,
        order_by: [asc: a.position, asc: a.id],
        preload: [sets: ^sets, exercise: ^exercises]
      )

    workouts = Workout.include_content(business_id)
    clients = Client.for_business(business_id)
    coaches = Coach.for_business(business_id)
    schedules = from(s in WorkoutSchedule, where: s.business_id == ^business_id)

    from(l in query,
      preload: [exercise_logs: ^activities, workout: ^workouts, client: ^clients, coach: ^coaches, schedule: ^schedules]
    )
  end
end
