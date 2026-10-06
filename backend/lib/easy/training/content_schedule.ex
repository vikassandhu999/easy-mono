defmodule Easy.Training.Content.Schedule do
  use Ecto.Schema
  alias Easy.Training.Content.Entry
  import Ecto.Changeset
  @primary_key false

  embedded_schema do
    field :cycle_weeks, :integer, default: 1
    embeds_many :entries, Entry, on_replace: :delete
  end

  @spec changeset(struct(), map()) :: Ecto.Changeset.t()
  def changeset(value, attrs) do
    value
    |> cast(attrs, [:cycle_weeks])
    |> cast_embed(:entries, with: &Entry.changeset/2)
    |> validate_required([:cycle_weeks])
    |> validate_inclusion(:cycle_weeks, [1])
  end
end
