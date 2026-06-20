defmodule Easy.Nutrition.Food do
  use Ecto.Schema

  alias Easy.Nutrition
  alias Easy.Orgs

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "foods" do
    field :name, :string
    field :macros, :map
    field :source, :string
    field :category, :string
    field :tags, {:array, :string}
    field :notes, :string
    field :image_url, :string
    field :import_id, :string

    embeds_many :serving_sizes, Nutrition.ServingSize, on_replace: :delete

    belongs_to :creator, Orgs.Coach, foreign_key: :creator_id
    belongs_to :business, Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @cast_fields [:name, :macros, :source, :category, :tags, :notes, :image_url]

  # Changesets

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, coach_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> put_change(:creator_id, coach_id)
    |> validate_required([:name, :creator_id, :business_id])
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(food, attrs) do
    food
    |> cast(attrs, @cast_fields)
    |> validate_required([:name])
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
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
    from(f in query, order_by: [desc: f.inserted_at])
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
