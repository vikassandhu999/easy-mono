defmodule Easy.Nutrition.DiaryEntry do
  use Ecto.Schema
  import Ecto.Changeset
  @type t :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: false}
  @foreign_key_type :binary_id
  schema "diary_entries" do
    field :business_id, :binary_id
    field :request_id, :binary_id
    field :meal_id, :binary_id
    field :planned_item_id, :binary_id
    field :source, :map
    field :portion, :map
    field :name, :string
    field :grams, :float
    field :nutrients, :map, default: %{}
    field :food_components, {:array, :map}, default: []
    field :notes, :string
    field :deleted_at, :utc_datetime
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
    |> unique_constraint(:id, name: :diary_entries_pkey)
    |> unique_constraint(:request_id, name: :diary_entries_meal_id_request_id_key)
  end

  defp stamp(cs, _actor), do: cs
end
