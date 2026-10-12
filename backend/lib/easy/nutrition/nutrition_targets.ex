defmodule Easy.Nutrition.NutritionTargets do
  use Ecto.Schema
  import Ecto.Changeset
  alias Easy.Utils
  import Ecto.Query
  alias Easy.Nutrition.Values
  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}
  schema "nutrition_targets" do
    field :name, :string
    field :targets, :map, default: %{}
    field :archived_at, :utc_datetime
    belongs_to :business, Easy.Orgs.Business
    belongs_to :client, Easy.Clients.Client
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, client_id, attrs),
    do:
      %__MODULE__{}
      |> change()
      |> put_change(:business_id, business_id)
      |> put_change(:client_id, client_id)
      |> update_changeset(attrs)

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(row, attrs) do
    row
    |> cast(Values.encode(attrs), [:name, :targets])
    |> update_change(:name, &Utils.trim/1)
    |> validate_required([:business_id, :client_id, :name])
    |> validate_change(:targets, fn field, value ->
      if Values.targets?(value), do: [], else: [{field, "use registered nutrients and non-negative ordered bounds"}]
    end)
    |> check_constraint(:targets, name: :nutrition_targets_values_valid)
  end

  @spec for_client(Ecto.Queryable.t(), String.t(), String.t()) :: Ecto.Query.t()
  def for_client(query \\ __MODULE__, business_id, client_id),
    do: from(t in query, where: t.business_id == ^business_id and t.client_id == ^client_id)

  @spec active(Ecto.Queryable.t()) :: Ecto.Query.t()
  def active(query \\ __MODULE__), do: from(t in query, where: is_nil(t.archived_at))

  @spec alphabetical(Ecto.Queryable.t()) :: Ecto.Query.t()
  def alphabetical(query \\ __MODULE__), do: from(t in query, order_by: [asc: t.name, asc: t.id])
end
