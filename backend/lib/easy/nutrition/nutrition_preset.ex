defmodule Easy.Nutrition.NutritionPreset do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Utils
  import Ecto.Query
  alias Easy.Nutrition.{Food, MealOption}
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "nutrition_presets" do
    field :type, Ecto.Enum, values: [:meal, :food, :supplement]
    field :name, :string
    field :instructions, :string
    field :amount, :float
    field :unit, :string
    field :archived_at, :utc_datetime
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    belongs_to :food, Food
    has_many :options, MealOption, on_replace: :delete, preload_order: [asc: :position, asc: :id]
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs) do
    %__MODULE__{}
    |> change()
    |> put_change(:id, Ecto.UUID.generate())
    |> put_change(:business_id, business_id)
    |> put_change(:client_id, client_id)
    |> update_changeset(attrs)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    business_id = get_field(change(row), :business_id)
    parent_id = get_field(change(row), :id)

    row
    |> cast(attrs, [:type, :name, :instructions, :food_id, :amount, :unit])
    |> update_change(:name, &Utils.trim/1)
    |> cast_assoc(:options, with: fn _option, attrs -> MealOption.insert_changeset(business_id, parent_id, attrs) end)
    |> validate_required([:business_id, :client_id, :type])
    |> validate_number(:amount, greater_than: 0)
    |> validate_shape()
    |> check_constraint(:type, name: :nutrition_presets_shape)
    |> foreign_key_constraint(:food_id, name: :nutrition_presets_food_id_business_id_fkey)
  end

  defp validate_shape(cs) do
    if get_field(cs, :type) == :meal do
      cs |> validate_required([:name]) |> validate_length(:options, min: 1) |> forbid_item()
    else
      cs |> validate_required([:food_id, :amount, :unit]) |> forbid_options()
    end
  end

  defp forbid_item(cs),
    do:
      if(Enum.any?([:food_id, :amount, :unit], &(not is_nil(get_field(cs, &1)))),
        do: add_error(cs, :food_id, "a meal contains options, not a direct item"),
        else: cs
      )

  defp forbid_options(cs),
    do: if(get_field(cs, :options) == [], do: cs, else: add_error(cs, :options, "only meals contain options"))

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(p in query, where: p.business_id == ^business_id and p.client_id == ^client_id)

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__), do: from(p in query, where: is_nil(p.archived_at))

  @spec alphabetical(Ecto.Queryable.t()) :: Ecto.Query.t()
  def alphabetical(query \\ __MODULE__), do: from(p in query, order_by: [asc: p.name, asc: p.id])

  @spec include_content(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def include_content(query \\ __MODULE__, id) do
    options = MealOption.for_business(id) |> MealOption.include_items(id)
    from(p in query, preload: [options: ^options, food: ^Food.for_business(id)])
  end
end
