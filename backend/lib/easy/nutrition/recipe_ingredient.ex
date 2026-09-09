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
    field :portion, Nutrition.Portion
    field :position, :integer, default: 0

    belongs_to :recipe, Nutrition.Recipe
    belongs_to :food, Nutrition.Food
    belongs_to :business, Business
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(ri in query, where: ri.business_id == ^business_id)
  end

  @spec for_recipe(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_recipe(query \\ __MODULE__, business_id, recipe_id) do
    query = for_business(query, business_id)
    from(ingredient in query, where: ingredient.recipe_id == ^recipe_id)
  end

  @spec for_food(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_food(query \\ __MODULE__, business_id, food_id) do
    from(ingredient in for_business(query, business_id), where: ingredient.food_id == ^food_id)
  end

  @spec for_portion(Ecto.Queryable.t(), map() | nil) :: Ecto.Query.t()
  def for_portion(query \\ __MODULE__, portion)
  def for_portion(query, nil), do: query

  def for_portion(query, portion) do
    from(ingredient in query, where: fragment("? @> ?::jsonb", ingredient.portion, ^portion))
  end

  @spec ordered(Ecto.Queryable.t()) :: Ecto.Query.t()
  def ordered(query \\ __MODULE__) do
    from(ingredient in query, order_by: [asc: ingredient.position, asc: ingredient.id])
  end

  @spec include_food(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_food(query \\ __MODULE__, business_id) do
    food_query = Nutrition.Food.for_business_or_system(business_id) |> Nutrition.Food.include_media()
    from(ingredient in query, preload: [food: ^food_query])
  end

  @spec item_reference(map()) ::
          {:ok, Nutrition.ItemReference.t()} | {:error, :not_found | :invalid_portion}
  def item_reference(attrs) when is_map(attrs) do
    changeset =
      {%{}, %{food_id: Ecto.UUID, portion: Nutrition.Portion}}
      |> cast(attrs, [:food_id, :portion])
      |> validate_required([:food_id, :portion])

    cond do
      Keyword.has_key?(changeset.errors, :food_id) -> {:error, :not_found}
      not changeset.valid? -> {:error, :invalid_portion}
      true -> {:ok, %{kind: :food, id: get_field(changeset, :food_id), portion: get_field(changeset, :portion)}}
    end
  end

  def item_reference(_attrs), do: {:error, :invalid_portion}

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
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:recipe_id)
    |> foreign_key_constraint(:food_id)
  end
end
