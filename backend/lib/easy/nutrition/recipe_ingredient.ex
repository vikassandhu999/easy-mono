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
    field :amount, :float
    field :unit, :string
    field :weight_g, :float
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
    |> cast(attrs, [:food_id, :amount, :unit, :weight_g])
    |> put_change(:business_id, business_id)
    |> put_change(:recipe_id, recipe_id)
    |> put_change(:position, position)
    |> reject_subrecipe(attrs)
    |> validate_required([:business_id, :recipe_id, :food_id, :weight_g, :position])
    |> validate_number(:weight_g, greater_than: 0)
    |> validate_number(:position, greater_than_or_equal_to: 0)
    |> unique_constraint(:position, name: :nutrition_recipe_ingredients_recipe_id_position_index)
    |> check_constraint(:weight_g,
      name: :nutrition_recipe_ingredients_weight_positive,
      message: "must be greater than 0"
    )
    |> check_constraint(:position, name: :nutrition_recipe_ingredients_position_nonnegative)
    |> foreign_key_constraint(:food_id)
  end

  defp reject_subrecipe(changeset, attrs) do
    if Map.has_key?(attrs, :recipe_id) do
      add_error(changeset, :food_id, "subrecipes are not allowed")
    else
      changeset
    end
  end
end
