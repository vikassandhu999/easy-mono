defmodule Easy.Billing.CheckoutIntent do
  use Ecto.Schema

  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id
  @type t :: %__MODULE__{}

  schema "billing_checkout_intents" do
    field :request_id, :binary_id
    field :target_quantity, :integer
    field :kind, Ecto.Enum, values: [:create, :update]
    field :status, Ecto.Enum, values: [:pending, :unknown, :confirmed]
    field :subscription_id, :string

    belongs_to :business, Easy.Orgs.Business
    timestamps(type: :utc_datetime)
  end

  @spec insert_changeset(Ecto.UUID.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:request_id, :target_quantity, :kind, :status, :subscription_id])
    |> put_change(:business_id, business_id)
    |> validate_required([:business_id, :request_id, :target_quantity, :kind, :status])
    |> validate_number(:target_quantity, greater_than: 0)
    |> foreign_key_constraint(:business_id)
    |> unique_constraint([:business_id, :request_id])
    |> unique_constraint(:business_id, name: :billing_checkout_intents_business_id_index)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(intent, attrs) do
    intent
    |> cast(attrs, [:status, :subscription_id])
    |> validate_required([:status])
    |> unique_constraint(:business_id, name: :billing_checkout_intents_business_id_index)
  end
end
