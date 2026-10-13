defmodule Easy.Workouts.WorkoutExercise do
  use Ecto.Schema
  import Ecto.Changeset
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "workout_exercises" do
    field :position, :integer
    field :targets_mode, Ecto.Enum, values: [:same_for_all, :per_round], default: :same_for_all
    field :targets, {:array, :map}, default: [%{}]
    field :rest, {:array, :map}, default: []
    field :exercise_snapshot, :map
    belongs_to :business, Easy.Orgs.Business
    belongs_to :exercise_group, Easy.Workouts.ExerciseGroup
    belongs_to :exercise, Easy.Workouts.Exercise
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, group_id, attrs),
    do: %__MODULE__{} |> change(business_id: business_id, exercise_group_id: group_id) |> update_changeset(attrs)

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs),
    do:
      row
      |> cast(attrs, [:exercise_id, :position, :targets_mode, :targets, :rest])
      |> validate_required([:exercise_id, :position, :targets_mode])
      |> validate_number(:position, greater_than_or_equal_to: 0)
      |> foreign_key_constraint(:exercise_id)
end
