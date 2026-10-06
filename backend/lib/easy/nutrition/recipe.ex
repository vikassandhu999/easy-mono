defmodule Easy.Nutrition.Recipe do
  alias Easy.Nutrition.ContentValidator
  alias Easy.Nutrition.Tags
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  @type t :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "recipes" do
    field :name, :string
    field :description, :string
    field :instructions, :string
    field :ingredients, {:array, :map}, default: []
    field :servings_count, :integer, default: 1
    field :cooked_weight_g, :float
    field :nutrients, :map, virtual: true, default: %{}
    field :food_components, {:array, :map}, virtual: true, default: []
    field :grams, :float, virtual: true
    field :allergens, {:array, :string}, default: []
    field :dietary_tags, {:array, :string}, default: []
    field :tags, {:array, :string}, default: []
    field :revision, :integer, default: 1
    field :archived_at, :utc_datetime
    belongs_to :business, Easy.Orgs.Business
    belongs_to :creator, Easy.Orgs.Coach
    timestamps(type: :utc_datetime)
  end

  @fields [
    :name,
    :allergens,
    :dietary_tags,
    :tags,
    :description,
    :instructions,
    :ingredients,
    :servings_count,
    :cooked_weight_g
  ]
  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, actor_id, attrs),
    do:
      %__MODULE__{}
      |> cast(ContentValidator.encode(attrs), @fields)
      |> put_change(:business_id, business_id)
      |> put_change(:creator_id, actor_id)
      |> validate()

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs),
    do: row |> cast(ContentValidator.encode(attrs), @fields) |> put_change(:revision, row.revision + 1) |> validate()

  defp validate(cs) do
    cs
    |> update_change(:name, &String.trim/1)
    |> validate_required([:name, :business_id, :servings_count])
    |> validate_length(:name, max: 255)
    |> validate_subset(:allergens, Tags.allergens())
    |> validate_subset(:dietary_tags, Tags.dietary())
    |> validate_number(:servings_count, greater_than: 0)
    |> validate_number(:cooked_weight_g, greater_than: 0)
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:creator_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, id), do: from(x in query, where: x.business_id == ^id)
end
