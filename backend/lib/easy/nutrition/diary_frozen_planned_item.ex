defmodule Easy.Nutrition.DiaryFrozenPlannedItem do
  use Ecto.Schema

  alias Easy.Nutrition.{DiaryFrozenOption, DiarySlot}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_diary_frozen_planned_items" do
    field :display_name, :string
    field :portion, Easy.Nutrition.Portions
    field :nutrients, Easy.Nutrition.NutrientTotals
    field :position, :integer
    field :source_meal_item_id, :binary_id

    belongs_to :business, Orgs.Business
    belongs_to :diary_slot, DiarySlot, foreign_key: :nutrition_diary_slot_id
    belongs_to :frozen_option, DiaryFrozenOption, foreign_key: :nutrition_diary_frozen_option_id
    field :food_id, :binary_id
    field :recipe_id, :binary_id

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :display_name,
    :portion,
    :nutrients,
    :position,
    :source_meal_item_id,
    :food_id,
    :recipe_id
  ]

  @spec insert_changeset(String.t(), String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, slot_id, option_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_diary_slot_id, slot_id)
    |> put_change(:nutrition_diary_frozen_option_id, option_id)
    |> validate_required([
      :display_name,
      :portion,
      :nutrients,
      :position,
      :source_meal_item_id,
      :business_id,
      :nutrition_diary_slot_id,
      :nutrition_diary_frozen_option_id
    ])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> unique_constraint(:position, name: :nutrition_diary_frozen_items_option_position_index)
    |> check_constraint(:portion, name: :nutrition_diary_frozen_planned_items_portion_check)
    |> check_constraint(:nutrients, name: :nutrition_diary_frozen_planned_items_nutrients_check)
    |> check_constraint(:food_id, name: :nutrition_diary_frozen_planned_items_source_identity_check)
    |> foreign_key_constraint(:nutrition_diary_frozen_option_id,
      name: :nutrition_diary_frozen_items_option_slot_business_fkey
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(item in query, where: item.business_id == ^business_id)
end
