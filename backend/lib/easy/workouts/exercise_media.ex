defmodule Easy.Workouts.ExerciseMedia do
  use Ecto.Schema
  import Ecto.Changeset
  @type t :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "exercise_media" do
    belongs_to(:business, Easy.Orgs.Business)
    belongs_to(:exercise, Easy.Workouts.Exercise)
    belongs_to(:attachment, Easy.Attachments.Attachment)

    field(:caption, :string)
    field(:position, :integer)

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, exercise_id, attachment_id, attrs) do
    %__MODULE__{}
    |> change(business_id: business_id, exercise_id: exercise_id, attachment_id: attachment_id)
    |> update_changeset(attrs)
  end

  @spec update_changeset(t() | Ecto.Changeset.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, [:caption, :position], empty_values: [])
    |> update_change(:caption, &optional_caption/1)
    |> validate_required([:business_id, :exercise_id, :attachment_id, :position])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:exercise_id)
    |> foreign_key_constraint(:attachment_id)
    |> unique_constraint(:position, name: :exercise_media_position)
  end

  defp optional_caption(nil), do: nil

  defp optional_caption(value) do
    case String.trim(value) do
      "" -> nil
      caption -> caption
    end
  end
end
