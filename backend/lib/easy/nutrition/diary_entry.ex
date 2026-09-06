defmodule Easy.Nutrition.DiaryEntry do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.{DiaryFrozenOption, DiaryFrozenPlannedItem, DiarySlot}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_diary_entries" do
    field :display_name, :string
    field :portion, Easy.Nutrition.Portions
    field :nutrients, Easy.Nutrition.NutrientTotals
    field :notes, :string

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :diary_slot, DiarySlot, foreign_key: :nutrition_diary_slot_id
    belongs_to :frozen_planned_item, DiaryFrozenPlannedItem, foreign_key: :frozen_planned_item_id
    belongs_to :frozen_option, DiaryFrozenOption, foreign_key: :frozen_option_id
    field :food_id, :binary_id
    field :recipe_id, :binary_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :display_name,
    :portion,
    :nutrients,
    :notes,
    :frozen_planned_item_id,
    :frozen_option_id,
    :food_id,
    :recipe_id
  ]

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, slot_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> put_change(:nutrition_diary_slot_id, slot_id)
    |> validate_required([
      :display_name,
      :portion,
      :nutrients,
      :business_id,
      :client_id,
      :nutrition_diary_slot_id
    ])
    |> validate_length(:notes, max: 255)
    |> unique_constraint(:frozen_planned_item_id, name: :nutrition_diary_entries_one_fulfilment_index)
    |> check_constraint(:portion, name: :nutrition_diary_entries_portion_check)
    |> check_constraint(:nutrients, name: :nutrition_diary_entries_nutrients_check)
    |> check_constraint(:food_id, name: :nutrition_diary_entries_source_identity_check)
    |> foreign_key_constraint(:nutrition_diary_slot_id, name: :nutrition_diary_entries_slot_business_id_fkey)
    |> foreign_key_constraint(:frozen_planned_item_id, name: :nutrition_diary_entries_fulfilment_slot_business_fkey)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, [
      :display_name,
      :portion,
      :nutrients,
      :notes,
      :food_id,
      :recipe_id
    ])
    |> validate_length(:notes, max: 255)
    |> check_constraint(:portion, name: :nutrition_diary_entries_portion_check)
    |> check_constraint(:nutrients, name: :nutrition_diary_entries_nutrients_check)
    |> check_constraint(:food_id, name: :nutrition_diary_entries_source_identity_check)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(entry in query, where: entry.business_id == ^business_id and entry.client_id == ^client_id)
  end
end
