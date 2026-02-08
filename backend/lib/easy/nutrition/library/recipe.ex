defmodule Easy.Nutrition.Library.Recipe do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Nutrition.Library
  alias Easy.Nutrition.Library.RecipeIngredient
  import Ecto.Query

  import Ecto.Changeset

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
    embeds_many :serving_sizes, Library.ServingSize, on_replace: :delete

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business
    has_many :recipe_ingredients, RecipeIngredient, on_delete: :delete_all, on_replace: :delete
    has_many :foods, through: [:recipe_ingredients, :food]

    timestamps(type: :utc_datetime)
  end

  def search(query \\ __MODULE__, term),
    do: from(q in query, where: fragment("search_vector @@ plainto_tsquery('english', ?)", ^term))

  def with_business(query \\ __MODULE__, business_id),
    do: from(r in query, where: r.business_id == ^business_id)

  def preload_ingredients(query \\ __MODULE__),
    do: from(r in query, preload: [:recipe_ingredients])

  def newest_first(query \\ __MODULE__),
    do: from(r in query, order_by: [desc: r.inserted_at])

  @spec new_changeset(String.t(), String.t(), map()) :: t()
  def new_changeset(business_id, coach_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [
      :name,
      :source,
      :category,
      :tags,
      :instructions,
      :image_url,
      :cooked_weight_g,
      :service_size_type,
      :creator_id,
      :business_id
    ])
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> validate_required([:name, :creator_id, :business_id])
    |> cast_embed(:serving_sizes, with: &Library.ServingSize.changeset/2)
    |> cast_assoc(:recipe_ingredients, with: &RecipeIngredient.changeset/2)
  end

  @spec update_changeset(t(), map()) :: t()
  def update_changeset(recipe, attrs) do
    recipe
    |> cast(attrs, [
      :name,
      :source,
      :category,
      :tags,
      :instructions,
      :image_url,
      :cooked_weight_g,
      :service_size_type
    ])
    |> cast_embed(:serving_sizes, with: &Library.ServingSize.changeset/2)
    |> cast_assoc(:recipe_ingredients, with: &RecipeIngredient.changeset/2)
  end
end
