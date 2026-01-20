defmodule Easy.Nutrition.Library.Recipe do
  use Ecto.Schema
  alias Easy.Orgs
  alias Easy.Nutrition.Library
  alias Easy.Nutrition.Library.RecipeIngredient

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
    has_many :recipe_ingredients, RecipeIngredient, on_delete: :delete_all

    timestamps(type: :utc_datetime)
  end

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
  end
end
