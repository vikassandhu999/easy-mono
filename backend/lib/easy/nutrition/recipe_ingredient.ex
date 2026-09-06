defmodule Easy.Nutrition.RecipeIngredient do
  use Ecto.Schema
  alias Easy.Nutrition
  alias Easy.Orgs.Business

  import Ecto.Changeset
  import Ecto.Query, only: [from: 2]

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "nutrition_recipe_ingredients" do
    field :portion, Nutrition.Portions
    field :position, :integer, default: 0

    belongs_to :recipe, Nutrition.Recipe
    belongs_to :food, Nutrition.Food
    belongs_to :business, Business
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(ri in query, where: ri.business_id == ^business_id)
  end

  @spec insert_changeset(String.t(), String.t(), non_neg_integer(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, recipe_id, position, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:food_id, :portion])
    |> put_change(:business_id, business_id)
    |> put_change(:recipe_id, recipe_id)
    |> put_change(:position, position)
    |> validate_required([:business_id, :recipe_id, :food_id, :portion, :position])
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> unique_constraint(:position, name: :nutrition_recipe_ingredients_recipe_id_position_index)
    |> check_constraint(:portion, name: :nutrition_recipe_ingredients_portion_check)
    |> check_constraint(:position, name: :nutrition_recipe_ingredients_position_nonnegative)
    |> foreign_key_constraint(:food_id)
  end
end
