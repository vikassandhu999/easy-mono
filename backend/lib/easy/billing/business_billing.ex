defmodule Easy.Billing.BusinessBilling do
  use Ecto.Schema

  import Ecto.Changeset

  @type t :: %__MODULE__{}
  @type status :: :free | :active | :past_due | :cancel_at_period_end | :cancelled

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @statuses [:free, :active, :past_due, :cancel_at_period_end, :cancelled]

  schema "business_billing" do
    # ponytail: 10 free seats while billing is disabled for first users; drop back
    # to 2 when Razorpay goes live and paid seats become the growth path.
    field :free_seats, :integer, default: 10
    field :paid_seats, :integer, default: 0
    field :status, Ecto.Enum, values: @statuses, default: :free
    field :razorpay_subscription_id, :string
    field :razorpay_plan_id, :string
    field :current_period_end, :utc_datetime

    belongs_to :business, Easy.Orgs.Business

    timestamps(type: :utc_datetime)
  end

  @spec seat_limit(t()) :: non_neg_integer()
  def seat_limit(%__MODULE__{free_seats: free, paid_seats: paid}), do: free + paid

  @spec subscribed?(t()) :: boolean()
  def subscribed?(%__MODULE__{status: status}), do: status in [:active, :past_due, :cancel_at_period_end]

  @spec parse_seat_increase(term()) :: {:ok, pos_integer()} | {:error, Ecto.Changeset.t()}
  def parse_seat_increase(value) do
    changeset =
      {%{}, %{seats_to_add: :integer}}
      |> cast(%{seats_to_add: value}, [:seats_to_add])
      |> validate_required([:seats_to_add])
      |> validate_number(:seats_to_add, greater_than: 0, less_than_or_equal_to: 100)

    case apply_action(changeset, :insert) do
      {:ok, %{seats_to_add: count}} -> {:ok, count}
      {:error, changeset} -> {:error, changeset}
    end
  end

  @spec available_seats(t(), non_neg_integer()) :: integer()
  def available_seats(%__MODULE__{} = billing, used), do: seat_limit(billing) - used

  @spec invitation_status(t(), non_neg_integer()) :: {:active, nil} | {:inactive, :awaiting_seat}
  def invitation_status(%__MODULE__{} = billing, used) do
    if available_seats(billing, used) < 0, do: {:inactive, :awaiting_seat}, else: {:active, nil}
  end

  @spec insert_changeset(String.t(), map()) :: Ecto.Changeset.t()
  def insert_changeset(business_id, attrs \\ %{}) do
    %__MODULE__{}
    |> cast(attrs, [:free_seats])
    |> put_change(:business_id, business_id)
    |> validate_required([:business_id])
    |> validate_seats()
    |> unique_constraint(:business_id)
    |> foreign_key_constraint(:business_id)
  end

  @spec update_changeset(t(), map()) :: Ecto.Changeset.t()
  def update_changeset(billing, attrs) do
    billing
    |> cast(attrs, [
      :free_seats,
      :paid_seats,
      :status,
      :razorpay_subscription_id,
      :razorpay_plan_id,
      :current_period_end
    ])
    |> validate_seats()
    |> validate_length(:razorpay_subscription_id, max: 255, count: :codepoints)
    |> validate_length(:razorpay_plan_id, max: 255, count: :codepoints)
    |> unique_constraint(:razorpay_subscription_id)
  end

  @spec charge_changeset(t(), non_neg_integer() | nil, DateTime.t() | nil) :: Ecto.Changeset.t()
  def charge_changeset(billing, quantity, period_end) do
    status = if billing.status == :cancel_at_period_end, do: :cancel_at_period_end, else: :active

    update_changeset(billing, %{
      paid_seats: quantity || billing.paid_seats,
      status: status,
      current_period_end: period_end
    })
  end

  defp validate_seats(changeset) do
    changeset
    |> validate_required([:free_seats, :paid_seats, :status])
    |> validate_number(:free_seats, greater_than_or_equal_to: 0)
    |> validate_number(:paid_seats, greater_than_or_equal_to: 0)
  end
end
