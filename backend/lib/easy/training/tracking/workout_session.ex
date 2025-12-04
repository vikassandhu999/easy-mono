defmodule Easy.Training.Tracking.WorkoutSession do
  use Easy.Training.Schema

  alias Easy.Clients.Client
  alias Easy.Organizations.Business
  alias Easy.Training.Programming.PlannedWorkout
  alias Easy.Training.Tracking.PerformedSet

  schema "workout_sessions" do
    field :started_at, :utc_datetime_usec
    field :ended_at, :utc_datetime_usec
    field :state, Ecto.Enum, values: [:active, :completed, :discarded], default: :active
    field :soreness_rating, :integer
    field :notes, :string

    belongs_to :client, Client
    belongs_to :business, Business
    belongs_to :planned_workout, PlannedWorkout

    has_many :performed_sets, PerformedSet, on_delete: :delete_all

    timestamps()
  end

  @doc false
  def changeset(workout_session, attrs) do
    workout_session
    |> cast(attrs, [
      :started_at,
      :ended_at,
      :state,
      :soreness_rating,
      :notes,
      :planned_workout_id
    ])
    |> validate_required([:state, :started_at])
    |> validate_length(:notes, max: 5000)
    |> validate_number(:soreness_rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> validate_end_after_start()
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:planned_workout_id)
  end

  defp validate_end_after_start(changeset) do
    started_at = get_field(changeset, :started_at)
    ended_at = get_field(changeset, :ended_at)

    if started_at && ended_at && DateTime.compare(ended_at, started_at) == :lt do
      add_error(changeset, :ended_at, "must be after started_at")
    else
      changeset
    end
  end
end
