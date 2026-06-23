defmodule Easy.Storefront.Lead do
  use Ecto.Schema

  alias Easy.Clients.Client
  alias Easy.Storefront.Offer

  import Ecto.Changeset
  import Ecto.Query

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @type t :: %__MODULE__{}

  @lead_statuses [:new, :contacted, :converted, :rejected]

  @cast_fields [:name, :email, :phone, :instagram_handle, :intake_answers, :status, :notes, :source, :offer_id]

  schema "leads" do
    field :name, :string
    field :email, :string
    field :phone, :string
    field :instagram_handle, :string
    field :intake_answers, :map, default: %{}
    field :status, Ecto.Enum, values: @lead_statuses, default: :new
    field :notes, :string
    field :source, :string

    belongs_to :business, Easy.Orgs.Business
    belongs_to :offer, Offer
    belongs_to :client, Client

    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, @cast_fields)
    |> put_change(:business_id, business_id)
    |> validate_required([:business_id])
    |> foreign_key_constraint(:business_id)
    |> foreign_key_constraint(:offer_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id) do
    from(l in query, where: l.business_id == ^business_id)
  end
end
