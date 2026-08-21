defmodule Easy.Nutrition.DiaryEntry do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Nutrition.{DiaryFrozenOption, DiaryFrozenPlannedItem, DiarySlot, Food, Recipe}
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}
  @kinds [:food, :recipe]
  @portion_kinds [:gram, :serving]

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_diary_entries" do
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
    field :notes, :string
    field :revision, :integer, default: 1
    field :source_food_id, :binary_id
    field :source_recipe_id, :binary_id

    belongs_to :business, Orgs.Business
    belongs_to :client, Client
    belongs_to :diary_slot, DiarySlot, foreign_key: :nutrition_diary_slot_id
    belongs_to :frozen_planned_item, DiaryFrozenPlannedItem, foreign_key: :frozen_planned_item_id
    belongs_to :frozen_option, DiaryFrozenOption, foreign_key: :frozen_option_id
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
    :notes,
    :revision,
    :source_food_id,
    :source_recipe_id,
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
      :kind,
      :display_name,
      :portion_kind,
      :complete,
      :revision,
      :business_id,
      :client_id,
      :nutrition_diary_slot_id
    ])
    |> validate_number(:revision, greater_than: 0)
    |> validate_length(:notes, max: 255)
    |> unique_constraint(:frozen_planned_item_id, name: :nutrition_diary_entries_one_fulfilment_index)
    |> check_constraint(:source_food_id, name: :nutrition_diary_entries_source_identity_check)
    |> foreign_key_constraint(:nutrition_diary_slot_id, name: :nutrition_diary_entries_slot_business_id_fkey)
    |> foreign_key_constraint(:frozen_planned_item_id, name: :nutrition_diary_entries_fulfilment_slot_business_fkey)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(entry, attrs) do
    entry
    |> cast(attrs, [
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
      :notes,
      :revision,
      :source_food_id,
      :source_recipe_id,
      :food_id,
      :recipe_id
    ])
    |> validate_required([:revision])
    |> validate_number(:revision, greater_than: 0)
    |> validate_length(:notes, max: 255)
    |> check_constraint(:source_food_id, name: :nutrition_diary_entries_source_identity_check)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id) do
    from(entry in query, where: entry.business_id == ^business_id and entry.client_id == ^client_id)
  end

  @spec lock_id(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def lock_id(query \\ __MODULE__, id), do: from(entry in query, where: entry.id == ^id, lock: "FOR UPDATE")
end
