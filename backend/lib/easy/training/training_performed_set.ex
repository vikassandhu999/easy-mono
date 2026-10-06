defmodule Easy.Training.TrainingPerformedSet do
  use Ecto.Schema
  import Ecto.Changeset
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "performed_sets" do
    belongs_to :business, Easy.Orgs.Business
    belongs_to :session, Easy.Training.TrainingSession
    field :position, :integer
    field :request_id, :binary_id
    field :item_id, :binary_id
    field :set_id, :binary_id
    belongs_to :exercise, Easy.Training.TrainingExercise
    field :exercise_name, :string
    field :kind, Ecto.Enum, values: [:warmup, :working, :drop], default: :working
    field :outcome, Ecto.Enum, values: [:done, :failed, :skipped], default: :done
    field :reps, :integer
    field :load_kg, :decimal
    field :entered_load_unit, Ecto.Enum, values: [:kg, :lb]
    field :duration_s, :integer
    field :distance_m, :decimal
    field :entered_distance_unit, Ecto.Enum, values: [:m, :km, :mi]
    field :rpe, :decimal
    field :rir, :integer
    field :notes, :string
    field :deleted_at, :utc_datetime
    field :local_date, :date, virtual: true
    timestamps(type: :utc_datetime)
  end

  @fields [
    :item_id,
    :set_id,
    :exercise_id,
    :exercise_name,
    :kind,
    :outcome,
    :reps,
    :load_kg,
    :entered_load_unit,
    :duration_s,
    :distance_m,
    :entered_distance_unit,
    :rpe,
    :rir,
    :notes
  ]
  @spec insert_changeset(String.t(), String.t(), non_neg_integer(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, session_id, position, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:request_id | @fields])
    |> put_change(:business_id, business_id)
    |> put_change(:session_id, session_id)
    |> put_change(:position, position)
    |> validate()
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs), do: row |> cast(attrs, @fields) |> validate()

  defp validate(cs) do
    cs
    |> validate_required([:position, :kind, :outcome])
    |> validate_number(:reps, greater_than_or_equal_to: 0)
    |> validate_number(:duration_s, greater_than_or_equal_to: 0)
    |> validate_number(:distance_m, greater_than_or_equal_to: 0)
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> validate_number(:rir, greater_than_or_equal_to: 0, less_than_or_equal_to: 10)
    |> check_constraint(:exercise_id, name: :performed_sets_check)
    |> foreign_key_constraint(:exercise_id)
    |> unique_constraint(:request_id, name: :performed_sets_session_id_request_id_key)
  end
end
