defmodule Easy.Workouts.WorkoutLog do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Workouts.{ExerciseSet, Workout}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "workout_logs" do
    field :state, Ecto.Enum, values: [:active, :completed, :discarded], default: :active
    field :date, :date
    field :time, :time
    field :at_utc, :utc_datetime
    field :text, :string
    field :recorded_by, :binary_id
    field :difficulty, Ecto.Enum, values: [:too_easy, :just_right, :too_hard]
    field :pain, :boolean
    field :pain_note, :string
    field :scheduled_date, :date
    field :swaps, :map, default: %{}
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    belongs_to :workout, Easy.Workouts.Workout
    belongs_to :schedule, Easy.Workouts.WorkoutSchedule
    has_many :sets, Easy.Workouts.ExerciseSet, preload_order: [asc: :round, asc: :id]
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), DateTime.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, actor, client_id, now, attrs) do
    %__MODULE__{}
    |> change(business_id: business_id, client_id: client_id, recorded_by: actor, at_utc: now)
    |> cast(attrs, [:date, :time, :text])
    |> validate_required([:business_id, :client_id, :recorded_by, :date, :at_utc])
    |> log_constraints()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, [:time, :text, :difficulty, :pain, :pain_note])
    |> validate_length(:text, max: 10_000)
    |> validate_length(:pain_note, max: 2_000)
    |> validate_pain()
    |> log_constraints()
  end

  defp validate_pain(cs) do
    if get_field(cs, :pain_note) && get_field(cs, :pain) != true,
      do: add_error(cs, :pain_note, "only applies when pain is reported"),
      else: cs
  end

  defp log_constraints(cs) do
    cs
    |> check_constraint(:state, name: :workout_logs_values)
    |> unique_constraint(:state, name: :workout_logs_one_active)
    |> unique_constraint(:schedule_id, name: :workout_logs_current_occurrence)
    |> foreign_key_constraint(:workout_id, name: :workout_logs_workout_id_client_id_business_id_fkey)
    |> foreign_key_constraint(:schedule_id, name: :workout_logs_schedule_id_client_id_business_id_fkey)
    |> foreign_key_constraint(:schedule_id, name: :workout_logs_schedule_workout)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(l in query, where: l.business_id == ^business_id and l.client_id == ^client_id)

  @spec include_content(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_content(query \\ __MODULE__, business_id) do
    sets = from(s in ExerciseSet, where: s.business_id == ^business_id, order_by: [asc: s.round, asc: s.id])
    workouts = Workout.include_content(business_id)
    from(l in query, preload: [sets: ^sets, workout: ^workouts])
  end
end
