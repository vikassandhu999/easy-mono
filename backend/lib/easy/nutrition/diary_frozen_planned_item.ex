defmodule Easy.Nutrition.DiaryFrozenPlannedItem do
  use Ecto.Schema

  alias Easy.Nutrition.{DiaryFrozenOption, DiarySlot, Food, Recipe}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @kinds [:food, :recipe]
  @portion_kinds [:gram, :serving]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_diary_frozen_planned_items" do
    field :kind, Ecto.Enum, values: @kinds
    field :display_name, :string
    field :portion_kind, Ecto.Enum, values: @portion_kinds
    field :weight_g, :float
    field :amount, :float
    field :unit, :string
    field :serving_label, :string
    field :calories, :float
    field :protein, :float
    field :carbohydrates, :float
    field :fat, :float
    field :fiber, :float
    field :complete, :boolean, default: false
    field :position, :integer
    field :source_meal_item_id, :binary_id
    field :source_food_id, :binary_id
    field :source_recipe_id, :binary_id

    belongs_to :business, Orgs.Business
    belongs_to :diary_slot, DiarySlot, foreign_key: :nutrition_diary_slot_id
    belongs_to :frozen_option, DiaryFrozenOption, foreign_key: :nutrition_diary_frozen_option_id
    belongs_to :food, Food
    belongs_to :recipe, Recipe

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :kind,
    :display_name,
    :portion_kind,
    :weight_g,
    :amount,
    :unit,
    :serving_label,
    :calories,
    :protein,
    :carbohydrates,
    :fat,
    :fiber,
    :complete,
    :position,
    :source_meal_item_id,
    :source_food_id,
    :source_recipe_id,
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
      :kind,
      :display_name,
      :portion_kind,
      :complete,
      :position,
      :source_meal_item_id,
      :business_id,
      :nutrition_diary_slot_id,
      :nutrition_diary_frozen_option_id
    ])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> unique_constraint(:position, name: :nutrition_diary_frozen_items_option_position_index)
    |> check_constraint(:source_food_id, name: :nutrition_diary_frozen_planned_items_source_identity_check)
    |> foreign_key_constraint(:nutrition_diary_frozen_option_id,
      name: :nutrition_diary_frozen_items_option_slot_business_fkey
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id),
    do: from(item in query, where: item.business_id == ^business_id)
end
