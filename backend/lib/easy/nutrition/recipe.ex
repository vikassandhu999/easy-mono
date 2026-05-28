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

  @service_size_types [:serving_based, :weight_based]

  schema "recipes" do
    field :name, :string
    field :macros, :map
    field :source, :string
    field :category, :string
    field :tags, {:array, :string}
    field :instructions, :string
    field :image_url, :string
    field :cooked_weight_g, :float

    field :service_size_type, Ecto.Enum, values: @service_size_types, default: :serving_based
    embeds_many :serving_sizes, Nutrition.ServingSize, on_replace: :delete

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    has_many :recipe_ingredients, RecipeIngredient, on_delete: :delete_all, on_replace: :delete
    has_many :foods, through: [:recipe_ingredients, :food]

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :name,
    :source,
    :category,
    :tags,
    :instructions,
    :image_url,
    :cooked_weight_g,
    :service_size_type
  ]

  # Changesets

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> validate_required([:name, :creator_id, :business_id])
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
    |> cast_assoc(:recipe_ingredients, with: &RecipeIngredient.changeset/2)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(recipe, attrs) do
    recipe
    |> cast(attrs, @cast_fields)
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
    |> cast_assoc(:recipe_ingredients, with: &RecipeIngredient.changeset/2)
  end

  # Queries

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
    from(r in query, order_by: [desc: r.inserted_at])
  end

  @spec with_ingredients(Ecto.Queryable.t()) :: Ecto.Query.t()
  def with_ingredients(query \\ __MODULE__) do
    from(r in query, preload: [:foods, recipe_ingredients: [:food]])
  end
end
