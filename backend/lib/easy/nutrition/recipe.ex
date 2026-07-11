defmodule Easy.Nutrition.Recipe do
  use Ecto.Schema

  alias Easy.Nutrition
  alias Easy.Nutrition.RecipeIngredient
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @allergens ~w(dairy egg fish shellfish tree_nuts peanuts wheat soy sesame)
  @dietary_tags ~w(vegan vegetarian halal kosher gluten_free dairy_free low_fodmap keto high_protein)

  schema "nutrition_recipes" do
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :servings_count, :integer
    field :cooked_weight_g, :float

    field :allergens, {:array, :string}, default: []
    field :dietary_tags, {:array, :string}, default: []

    embeds_many :serving_sizes, Nutrition.ServingSize, on_replace: :delete

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    has_many :recipe_ingredients, RecipeIngredient, on_delete: :delete_all, on_replace: :delete
    has_many :foods, through: [:recipe_ingredients, :food]

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :name,
    :description,
    :instructions,
    :servings_count,
    :cooked_weight_g,
    :allergens,
    :dietary_tags
  ]

  @spec scalar_fields() :: [atom()]
  def scalar_fields, do: @cast_fields

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> validate_required([:name, :creator_id, :business_id])
    |> validate_subset(:allergens, @allergens)
    |> validate_subset(:dietary_tags, @dietary_tags)
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
    |> cast_assoc(:recipe_ingredients,
      with: fn ingredient, ingredient_attrs ->
        RecipeIngredient.update_changeset(ingredient, business_id, ingredient_attrs)
      end
    )
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(recipe, attrs) do
    recipe
    |> cast(attrs, @cast_fields)
    |> validate_subset(:allergens, @allergens)
    |> validate_subset(:dietary_tags, @dietary_tags)
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
    |> cast_assoc(:recipe_ingredients,
      with: fn ingredient, ingredient_attrs ->
        RecipeIngredient.update_changeset(ingredient, recipe.business_id, ingredient_attrs)
      end
    )
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(r in query, where: r.business_id == ^business_id)
  end

  @spec search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query
  def search(query, term), do: from(r in query, where: ilike(r.name, ^"%#{term}%"))

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(r in query, order_by: [desc: r.inserted_at, desc: r.id])
  end
end
