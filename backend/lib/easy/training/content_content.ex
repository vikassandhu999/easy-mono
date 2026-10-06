defmodule Easy.Training.Content.Content do
  use Ecto.Schema
  alias Easy.Training.Content.Schedule
  alias Easy.Training.Content.Workout
  import Ecto.Changeset
  @primary_key false

  embedded_schema do
    embeds_many :workouts, Workout, on_replace: :delete
    embeds_one :schedule, Schedule, on_replace: :delete
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(value, attrs) do
    value
    |> cast(attrs, [])
    |> cast_embed(:workouts, with: &Workout.changeset/2)
    |> cast_embed(:schedule, with: &Schedule.changeset/2)
  end
end
