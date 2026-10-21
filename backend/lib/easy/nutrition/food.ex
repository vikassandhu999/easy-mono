defmodule Easy.Nutrition.Food do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Utils
  import Ecto.Query
  alias Easy.Nutrition.{FoodServing, Values}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "foods" do
    field :name, :string
    field :kind, Ecto.Enum, values: [:food, :supplement]
    field :basis, Ecto.Enum, values: [:"100g", :"100ml", :"1unit"]
    field :unit_label, :string
    field :nutrients, :map, default: %{}
    embeds_many :servings, FoodServing, on_replace: :delete
    belongs_to :business, Easy.Orgs.Business
    timestamps(type: :utc_datetime)
  end

  @fields [:name, :kind, :basis, :unit_label, :nutrients]
  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs),
    do: %__MODULE__{} |> change() |> put_change(:business_id, business_id) |> update_changeset(attrs)

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(Values.encode(attrs), @fields)
    |> cast_embed(:servings)
    |> update_change(:name, &Utils.trim/1)
    |> validate_required([:business_id, :name, :kind, :basis])
    |> validate_length(:name, max: 255)
    |> validate_change(:nutrients, fn field, values ->
      if Values.nutrients?(values), do: [], else: [{field, "use registered codes and non-negative values"}]
    end)
    |> validate_servings()
    |> foreign_key_constraint(:business_id)
    |> check_constraint(:nutrients, name: :foods_nutrients_valid)
    |> check_constraint(:servings, name: :foods_servings_valid)
    |> check_constraint(:kind, name: :foods_prescribed_shape)
  end

  defp validate_servings(cs) do
    labels = Enum.map(get_field(cs, :servings), & &1.label)
    basis = get_field(cs, :basis)
    base_unit = if basis, do: basis_unit(%{basis: basis})
    reserved = ["base", base_unit, get_field(cs, :unit_label)]

    if length(labels) == length(Enum.uniq(labels)) and not Enum.any?(labels, &(&1 in reserved)),
      do: cs,
      else: add_error(cs, :servings, "use unique serving labels distinct from the basis unit")
  end

  @spec basis_unit(t()) :: String.t()
  def basis_unit(%{basis: :"100g"}), do: "g"
  def basis_unit(%{basis: :"100ml"}), do: "ml"
  def basis_unit(%{basis: :"1unit"}), do: "unit"
  @spec factor(t(), number(), String.t()) :: {:ok, number()} | {:error, :invalid_unit}
  def factor(food, amount, unit) do
    cond do
      unit in ["base", basis_unit(food), food.unit_label] -> {:ok, amount / divisor(food)}
      serving = Enum.find(food.servings, &(&1.label == unit)) -> {:ok, amount * serving.amount / divisor(food)}
      true -> {:error, :invalid_unit}
    end
  end

  defp divisor(%{basis: :"1unit"}), do: 1
  defp divisor(_food), do: 100
  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, id), do: from(f in query, where: f.business_id == ^id)
  @spec for_kind(Ecto.Queryable.t(), atom() | String.t() | nil) :: Ecto.Queryable.t()
  def for_kind(query \\ __MODULE__, kind)
  def for_kind(query, kind) when kind in [nil, ""], do: query
  def for_kind(query, kind), do: from(f in query, where: f.kind == ^kind)
  @spec search(Ecto.Queryable.t(), String.t() | nil) :: Ecto.Queryable.t()
  def search(query \\ __MODULE__, term)
  def search(query, term) when term in [nil, ""], do: query
  def search(query, term), do: from(f in query, where: ilike(f.name, ^Easy.Search.like_pattern(String.trim(term))))
end
