defmodule Easy.Workouts.ExerciseGroup do
  use Ecto.Schema
  import Ecto.Changeset
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "exercise_groups" do
    field :name, :string
    field :rounds, :integer, default: 3
    field :position, :integer
    belongs_to :business, Easy.Orgs.Business
    belongs_to :workout, Easy.Workouts.Workout
    has_many :exercises, Easy.Workouts.WorkoutExercise, preload_order: [asc: :position, asc: :id]
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, workout_id, attrs),
    do: %__MODULE__{} |> change(business_id: business_id, workout_id: workout_id) |> update_changeset(attrs)

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs),
    do:
      row
      |> cast(attrs, [:name, :rounds, :position])
      |> validate_required([:business_id, :workout_id, :rounds, :position])
      |> validate_number(:rounds, greater_than: 0, less_than_or_equal_to: 100)
      |> validate_number(:position, greater_than_or_equal_to: 0)
      |> check_constraint(:rounds, name: :exercise_groups_values)
end
