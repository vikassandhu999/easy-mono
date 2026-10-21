defmodule Easy.Workouts.WorkoutReplacementReceipt do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "workout_replacement_receipts" do
    belongs_to :business, Easy.Orgs.Business
    belongs_to :workout_log, Easy.Workouts.WorkoutLog
    belongs_to :source_activity, Easy.Workouts.ExerciseLog
    # Retain the request identity even when this exercise is no longer selected.
    field :exercise_id, :binary_id
    belongs_to :result_activity, Easy.Workouts.ExerciseLog
    timestamps(type: :utc_datetime, updated_at: false)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), String.t(), String.t(), String.t()) ::
          Ecto.Changeset.t()
  def insert_changeset(business_id, workout_log_id, source_activity_id, exercise_id, result_activity_id, id) do
    fields = [
      id: id,
      business_id: business_id,
      workout_log_id: workout_log_id,
      source_activity_id: source_activity_id,
      exercise_id: exercise_id,
      result_activity_id: result_activity_id
    ]

    %__MODULE__{}
    |> change(fields)
    |> validate_required(Keyword.keys(fields))
    |> validate_ids(fields)
    |> unique_constraint(:id, name: :workout_replacement_receipts_pkey)
    |> foreign_key_constraint(:workout_log_id, name: :workout_replacement_receipts_session_fkey)
    |> foreign_key_constraint(:source_activity_id, name: :workout_replacement_receipts_source_fkey)
    |> foreign_key_constraint(:result_activity_id, name: :workout_replacement_receipts_result_fkey)
  end

  @spec for_session(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_session(query \\ __MODULE__, business_id, workout_log_id),
    do: from(r in query, where: r.business_id == ^business_id and r.workout_log_id == ^workout_log_id)

  defp validate_ids(changeset, fields) do
    Enum.reduce(fields, changeset, fn {field, value}, acc ->
      case Ecto.UUID.cast(value) do
        {:ok, id} -> put_change(acc, field, id)
        :error -> add_error(acc, field, "must be a valid UUID")
      end
    end)
  end
end
