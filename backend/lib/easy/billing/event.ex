defmodule Easy.Billing.Event do
  use Ecto.Schema

  import Ecto.Changeset
  import Ecto.Query

  @type t :: %__MODULE__{}
  @type kind ::
          :seats_added
          | :seats_removed
          | :payment_succeeded
          | :payment_failed
          | :cancellation_scheduled
          | :subscription_cancelled

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @kinds [
    :seats_added,
    :seats_removed,
    :payment_succeeded,
    :payment_failed,
    :cancellation_scheduled,
    :subscription_cancelled
  ]

  schema "billing_events" do
    field :kind, Ecto.Enum, values: @kinds
    field :seat_delta, :integer
    field :amount_paid, :integer
    field :currency, :string
    field :occurred_at, :utc_datetime
    field :metadata, :map

    belongs_to :business, Easy.Orgs.Business

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @spec insert_changeset(String.t(), kind(), DateTime.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, kind, occurred_at, attrs) do
    %__MODULE__{}
    |> cast(attrs, [:seat_delta, :amount_paid, :currency, :metadata])
    |> put_change(:business_id, business_id)
    |> put_change(:kind, kind)
    |> put_change(:occurred_at, occurred_at)
    |> validate_required([:business_id, :kind, :occurred_at])
    |> validate_inclusion(:kind, @kinds)
    |> validate_number(:seat_delta, greater_than_or_equal_to: 0)
    |> validate_number(:amount_paid, greater_than_or_equal_to: 0)
    |> validate_length(:currency, max: 255, count: :codepoints)
    |> foreign_key_constraint(:business_id)
  end

  @spec for_business(Ecto.Queryable.t(), String.t()) :: Ecto.Query.t()
  def for_business(query \\ __MODULE__, business_id), do: where(query, [event], event.business_id == ^business_id)

  @spec newest(Ecto.Queryable.t()) :: Ecto.Query.t()
  def newest(query \\ __MODULE__), do: order_by(query, [event], desc: event.occurred_at, desc: event.id)
end
