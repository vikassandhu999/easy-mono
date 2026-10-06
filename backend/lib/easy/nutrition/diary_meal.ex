defmodule Easy.Nutrition.DiaryMeal do
  use Ecto.Schema
  import Ecto.Changeset
  @type t :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id
  schema "diary_meals" do
    field :business_id, :binary_id
    field :request_id, :binary_id
    field :client_id, :binary_id
    field :local_date, :date
    field :timezone, :string
    field :recorded_by_type, Ecto.Enum, values: [:client, :coach]
    field :recorded_by_id, :binary_id
    field :revision, :integer, default: 1
    field :plan_revision_id, :binary_id
    field :slot_id, :binary_id
    field :name, :string
    field :chosen_meal_id, :binary_id
    field :note_to_coach, :string
    field :shared_at, :utc_datetime
    has_many :entries, Easy.Nutrition.DiaryEntry, foreign_key: :meal_id
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), tuple(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, actor, attrs) do
    %__MODULE__{} |> change(business_id: business_id) |> update_changeset(attrs) |> stamp(actor)
  end

  @spec update_changeset(t() | Ecto.Changeset.t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(attrs, __schema__(:fields) -- [:business_id, :recorded_by_type, :recorded_by_id, :inserted_at, :updated_at])
    |> validate_required([:id, :name, :request_id])
    |> validate_length(:name, max: 255)
    |> validate_length(:note_to_coach, max: 4000)
    |> unique_constraint(:id, name: :diary_meals_pkey)
    |> unique_constraint(:request_id, name: :diary_meals_client_id_request_id_key)
    |> unique_constraint(:name, name: :diary_meals_client_id_local_date_name_key)
    |> unique_constraint(:slot_id, name: :diary_meals_slot)
  end

  defp stamp(cs, {type, id}), do: cs |> put_change(:recorded_by_type, type) |> put_change(:recorded_by_id, id)
end
