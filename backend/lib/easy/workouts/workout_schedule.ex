defmodule Easy.Workouts.WorkoutSchedule do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "workout_schedules" do
    field :weekdays_mask, :integer
    field :from_date, :date
    field :until_date, :date
    field :time, :time
    field :place, :string
    field :meeting_url, :string
    field :claimed_today, :boolean, virtual: true, default: false
    belongs_to :coach, Easy.Orgs.Coach
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    belongs_to :workout, Easy.Workouts.Workout
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, workout_id, attrs),
    do:
      %__MODULE__{}
      |> change(business_id: business_id, client_id: client_id, workout_id: workout_id)
      |> update_changeset(attrs)

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, [:weekdays_mask, :from_date, :until_date, :time, :place, :meeting_url, :coach_id])
    |> validate_required([:business_id, :client_id, :workout_id, :weekdays_mask, :from_date])
    |> validate_number(:weekdays_mask, greater_than: 0, less_than_or_equal_to: 127)
    |> validate_location()
    |> check_constraint(:weekdays_mask, name: :workout_schedules_values)
    |> foreign_key_constraint(:client_id, name: :workout_schedules_client_id_business_id_fkey)
    |> foreign_key_constraint(:workout_id, name: :workout_schedules_workout_id_client_id_business_id_fkey)
    |> foreign_key_constraint(:coach_id, name: :workout_schedules_coach_id_business_id_fkey)
  end

  defp validate_location(cs),
    do:
      if(get_field(cs, :place) && get_field(cs, :meeting_url),
        do: add_error(cs, :meeting_url, "choose a place or meeting link"),
        else: cs
      )

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(s in query, where: s.business_id == ^business_id and s.client_id == ^client_id)
end
