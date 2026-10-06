defmodule Easy.Nutrition.Food do
  alias Easy.Nutrition.ContentValidator
  alias Easy.Nutrition.Nutrients
  alias Easy.Nutrition.Tags
  use Ecto.Schema
  import Ecto.Changeset
  import Ecto.Query
  @type t :: %__MODULE__{}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  schema "foods" do
    field :name, :string
    field :brand, :string
    field :source, Ecto.Enum, values: [:system, :custom], default: :custom
    field :category, :string
    field :nutrients, :map, default: %{}
    field :servings, {:array, :map}, default: []
    field :default_serving_id, :string
    field :notes, :string
    belongs_to :media, Easy.LibraryMedia.Media
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
    :brand,
    :category,
    :nutrients,
    :servings,
    :default_serving_id,
    :notes,
    :media_id
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
    |> validate_required([:name, :business_id])
    |> validate_length(:name, max: 255)
    |> validate_subset(:allergens, Tags.allergens())
    |> validate_subset(:dietary_tags, Tags.dietary())
    |> validate_change(:nutrients, fn field, values ->
      if Nutrients.valid?(values),
        do: [],
        else: [{field, "must use registered nutrient codes with non-negative numbers"}]
    end)
    |> validate_change(:servings, fn field, values ->
      if valid_servings?(values), do: [], else: [{field, "must have unique stable ids, labels and positive grams"}]
    end)
    |> validate_default()
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:creator_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, id), do: from(x in query, where: x.business_id == ^id)

  defp valid_servings?(values) do
    ids = Enum.map(values, & &1["id"])

    length(ids) == length(Enum.uniq(ids)) and
      Enum.all?(values, fn v ->
        is_binary(v["id"]) and v["id"] != "" and is_binary(v["label"]) and v["label"] != "" and is_number(v["grams"]) and
          v["grams"] > 0
      end)
  end

  defp validate_default(cs) do
    id = get_field(cs, :default_serving_id)

    if is_nil(id) or Enum.any?(get_field(cs, :servings), &(&1["id"] == id)),
      do: cs,
      else: add_error(cs, :default_serving_id, "must identify a serving")
  end

  @spec for_business_or_system(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business_or_system(query \\ __MODULE__, id),
    do: from(x in query, where: x.business_id == ^id or is_nil(x.business_id))

  @spec search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, nil), do: query
  def search(query, ""), do: query

  def search(query, term) do
    # Parse query lexemes with the same dictionary as the stored vector, retaining prefix search.
    from(f in query,
      cross_join:
        search in fragment(
          """
          (SELECT to_tsquery('simple', string_agg(quote_literal(token) || ':*', ' & ')) AS value
           FROM unnest(tsvector_to_array(to_tsvector('simple', ?))) AS token)
          """,
          ^term
        ),
      where: is_nil(search.value) or fragment("search_vector @@ ?", search.value),
      order_by: [
        desc: fragment("ts_rank(search_vector, ?) / greatest(length(?), 1)", search.value, f.name),
        desc: fragment("CASE WHEN ? IS NULL THEN ? END", search.value, f.inserted_at),
        desc: fragment("CASE WHEN ? IS NULL THEN ? END", search.value, f.id),
        asc: f.name,
        asc: f.id
      ]
    )
  end
end
