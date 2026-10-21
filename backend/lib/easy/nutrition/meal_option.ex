defmodule Easy.Nutrition.MealOption do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  alias Easy.Nutrition.{Food, MealItem}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "meal_options" do
    field :name, :string
    field :position, :integer
    belongs_to :business, Easy.Orgs.Business
    belongs_to :nutrition_preset, Easy.Nutrition.NutritionPreset
    has_many :items, MealItem, on_replace: :delete, preload_order: [asc: :position, asc: :id]
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, parent_id, attrs) do
    %__MODULE__{}
    |> change()
    |> put_change(:id, Ecto.UUID.generate())
    |> put_change(:business_id, business_id)
    |> put_change(:nutrition_preset_id, parent_id)
    |> update_changeset(attrs)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    business_id = get_field(change(row), :business_id)
    parent_id = get_field(change(row), :id)

    row
    |> cast(attrs, [:name, :position])
    |> validate_required([:position])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> cast_assoc(:items,
      required: true,
      with: fn _item, attrs -> MealItem.insert_changeset(business_id, parent_id, attrs) end
    )
    |> validate_length(:items, min: 1)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, id), do: from(o in query, where: o.business_id == ^id)
  @spec include_items(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_items(query \\ __MODULE__, id) do
    items = MealItem.for_business(id) |> preload(food: ^Food.for_business(id))
    from(o in query, preload: [items: ^items])
  end
end
