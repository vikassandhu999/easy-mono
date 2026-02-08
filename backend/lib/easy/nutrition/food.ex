defmodule Easy.Nutrition.Food do
  use Ecto.Schema

  alias Easy.Nutrition
  alias Easy.Orgs
  alias Easy.Repo

  import Ecto.Changeset
  import Ecto.Query

  @type t() :: %__MODULE__{}

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  # TODO: Add barcode.
  schema "foods" do
    field :name, :string
    field :macros, :map
    field :source, :string
    field :category, :string
    field :tags, {:array, :string}
    field :notes, :string
    field :image_url, :string

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
    |> cast_embed(:serving_sizes, with: &Nutrition.ServingSize.changeset/2)
  end

  # Queries

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(f in query, where: f.business_id == ^business_id)
  end

  @spec search(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def search(query \\ __MODULE__, term)
  def search(query, ""), do: query

  def search(query, term) do
    from(f in query, where: ilike(f.name, ^"%#{term}%"))
  end

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__) do
    from(f in query, order_by: [desc: f.inserted_at])
  end

  @spec paginate(Ecto.Queryable.t(), non_neg_integer(), pos_integer()) :: Ecto.Query.t()
  def paginate(query \\ __MODULE__, offset, limit) do
    from(f in query, limit: ^limit, offset: ^offset)
  end

  # Actions

  @spec create(String.t(), String.t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def create(business_id, coach_id, attrs) do
    insert_changeset(business_id, coach_id, attrs)
    |> Repo.insert()
  end

  @spec update(t(), map()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def update(food, attrs) do
    update_changeset(food, attrs)
    |> Repo.update()
  end

  @spec delete(t()) :: {:ok, t()} | {:error, Ecto.Changeset.t()}
  def delete(food) do
    Repo.delete(food)
  end

  @spec get(String.t(), String.t()) :: t() | nil
  def get(id, business_id) do
    Repo.get_by(__MODULE__, id: id, business_id: business_id)
  end

  @spec list(String.t(), map()) :: {:ok, non_neg_integer(), [t()]}
  def list(business_id, opts \\ %{}) do
    search_term = Map.get(opts, :search, "")
    offset = Map.get(opts, :offset, 0) |> max(0)
    limit = Map.get(opts, :limit, 20) |> min(100) |> max(1)

    base = __MODULE__ |> for_business(business_id) |> search(search_term)

    total_count = Repo.aggregate(base, :count, :id)
    foods = base |> newest() |> paginate(offset, limit) |> Repo.all()

    {:ok, total_count, foods}
  end
end
