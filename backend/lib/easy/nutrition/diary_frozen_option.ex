defmodule Easy.Nutrition.DiaryFrozenOption do
  use Ecto.Schema

  alias Easy.Nutrition.{DiaryFrozenPlannedItem, DiarySlot, Meal}
  alias Easy.Orgs

  import Ecto.Changeset

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_diary_frozen_options" do
    field :position, :integer
    field :meal_name, :string
    field :source_meal_id, :binary_id

    belongs_to :business, Orgs.Business
    belongs_to :diary_slot, DiarySlot, foreign_key: :nutrition_diary_slot_id
    belongs_to :meal, Meal, foreign_key: :nutrition_meal_id
    has_many :planned_items, DiaryFrozenPlannedItem, foreign_key: :nutrition_diary_frozen_option_id

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, slot_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:position, :meal_name, :source_meal_id, :nutrition_meal_id])
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_diary_slot_id, slot_id)
    |> validate_required([:position, :meal_name, :source_meal_id, :business_id, :nutrition_diary_slot_id])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> unique_constraint(:position, name: :nutrition_diary_frozen_options_slot_position_index)
    |> foreign_key_constraint(:nutrition_diary_slot_id, name: :nutrition_diary_frozen_options_slot_business_id_fkey)
  end
end
