defmodule Easy.Nutrition.Food do
  use Ecto.Schema

  alias Easy.Nutrition
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @allergens ~w(dairy egg fish shellfish tree_nuts peanuts wheat soy sesame)
  @dietary_tags ~w(vegan vegetarian halal kosher gluten_free dairy_free low_fodmap keto high_protein)

  @spec allergens() :: [String.t()]
  def allergens, do: @allergens

  @spec dietary_tags() :: [String.t()]
  def dietary_tags, do: @dietary_tags

  schema "nutrition_foods" do
    field :name, :string
    field :brand, :string
    field :barcode, :string
    field :source, Ecto.Enum, values: [:system, :imported, :custom]
    field :category, :string

    field :calories_per_100g, :float
    field :protein_g_per_100g, :float
    field :carbs_g_per_100g, :float
    field :fat_g_per_100g, :float
    field :fiber_g_per_100g, :float

    field :allergens, {:array, :string}, default: []
    field :dietary_tags, {:array, :string}, default: []

    field :notes, :string
    field :image_url, :string
    field :import_id, :string

    embeds_many :serving_sizes, Nutrition.ServingSize, on_replace: :delete

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @cast_fields [
    :name,
    :brand,
    :barcode,
    :source,
    :category,
    :calories_per_100g,
    :protein_g_per_100g,
    :carbs_g_per_100g,
    :fat_g_per_100g,
    :fiber_g_per_100g,
    :allergens,
    :dietary_tags,
    :notes,
    :image_url
  ]

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> validate_required([:name, :creator_id, :business_id])
    |> validate_macros()
    |> validate_enums()
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(food, attrs) do
    food
    |> cast(attrs, @cast_fields)
    |> validate_required([:name])
    |> validate_macros()
    |> validate_enums()
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
  end

  defp validate_macros(changeset) do
    Enum.reduce(
      [:calories_per_100g, :protein_g_per_100g, :carbs_g_per_100g, :fat_g_per_100g, :fiber_g_per_100g],
      changeset,
      fn field, acc -> validate_number(acc, field, greater_than_or_equal_to: 0) end
    )
  end

  defp validate_enums(changeset) do
    changeset
    |> validate_subset(:allergens, @allergens)
    |> validate_subset(:dietary_tags, @dietary_tags)
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(f in query, where: f.business_id == ^business_id)
  end

  @spec for_business_or_system(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business_or_system(query \\ __MODULE__, business_id) do
    from(f in query, where: f.business_id == ^business_id or is_nil(f.business_id))
  end

  @spec search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query

  def search(query, term) do
    case to_tsquery(term) do
      "" ->
        query

      tsquery ->
        from(f in query,
          where: fragment("search_vector @@ to_tsquery('simple', ?)", ^tsquery),
          order_by: [
            desc:
              fragment(
                "ts_rank(search_vector, to_tsquery('simple', ?)) / greatest(length(?), 1)",
                ^tsquery,
                f.name
              )
          ]
        )
    end
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(f in query, order_by: [desc: f.inserted_at, desc: f.id])
  end

  defp to_tsquery(term) do
    term
    |> String.trim()
    |> String.split(~r/\s+/, trim: true)
    |> Enum.map(&sanitize_tsquery_token/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.map_join(" & ", &"#{&1}:*")
  end

  defp sanitize_tsquery_token(token) do
    String.replace(token, ~r/[^\w]/u, "")
  end
end
