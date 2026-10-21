defmodule Easy.Nutrition.MealItem do
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "meal_items" do
    field :amount, :float
    field :unit, :string
    field :position, :integer
    belongs_to :business, Easy.Orgs.Business
    belongs_to :meal_option, Easy.Nutrition.MealOption
    belongs_to :food, Easy.Nutrition.Food
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, parent_id, attrs),
    do:
      %__MODULE__{}
      |> change()
      |> put_change(:business_id, business_id)
      |> put_change(:meal_option_id, parent_id)
      |> update_changeset(attrs)

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs),
    do:
      row
      |> cast(attrs, [:food_id, :amount, :unit, :position])
      |> validate_required([:food_id, :amount, :unit, :position])
      |> validate_number(:amount, greater_than: 0)
      |> validate_number(:position, greater_than_or_equal_to: 0)
      |> foreign_key_constraint(:food_id, name: :meal_items_food_id_business_id_fkey)

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, id), do: from(i in query, where: i.business_id == ^id)
end
