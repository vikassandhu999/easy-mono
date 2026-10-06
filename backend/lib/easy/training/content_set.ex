defmodule Easy.Training.Content.Set do
  use Ecto.Schema
  alias Easy.Training.Content.Distance
  alias Easy.Training.Content.Load
  alias Easy.Training.Content.Reps
  import Ecto.Changeset
  @primary_key false

  embedded_schema do
    field :id, Ecto.UUID
    field :kind, Ecto.Enum, values: [:warmup, :working, :drop], default: :working
    field :rpe, :float
    field :rir, :integer
    field :tempo, :string
    field :duration_s, :integer
    field :rest_s, :integer
    field :notes, :string
    embeds_one :reps, Reps, on_replace: :delete
    embeds_one :load, Load, on_replace: :delete
    embeds_one :distance, Distance, on_replace: :delete
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(value, attrs) do
    value
    |> cast(attrs, [:id, :kind, :rpe, :rir, :tempo, :duration_s, :rest_s, :notes])
    |> cast_embed(:reps, with: &Reps.changeset/2)
    |> cast_embed(:load, with: &Load.changeset/2)
    |> cast_embed(:distance, with: &Distance.changeset/2)
    |> validate_required([:id, :kind])
    |> validate_number(:rpe, greater_than_or_equal_to: 1, less_than_or_equal_to: 10)
    |> validate_number(:rir, greater_than_or_equal_to: 0, less_than_or_equal_to: 10)
    |> validate_number(:duration_s, greater_than_or_equal_to: 0)
    |> validate_number(:rest_s, greater_than_or_equal_to: 0)
  end
end
