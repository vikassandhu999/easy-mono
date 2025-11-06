defmodule Easy.Clients.Subscription do
  use Ecto.Schema
  import Ecto.Changeset

  alias Easy.Clients.Client
  alias Easy.Organizations.Business

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "client_subscriptions" do
    # Subscription details
    field :plan_name, :string
    field :amount, :decimal
    field :currency, :string, default: "INR"
    field :billing_cycle, Ecto.Enum, values: [:monthly, :quarterly, :yearly, :one_time]

    # Payment tracking
    field :payment_method, Ecto.Enum,
      values: [:cash, :bank_transfer, :upi, :card, :cheque, :other],
      default: :cash

    field :payment_status, Ecto.Enum,
      values: [:pending, :paid, :failed, :refunded],
      default: :pending

    field :transaction_id, :string
    field :payment_reference, :string
    field :payment_date, :date
    field :payment_notes, :string

    # Subscription period
    field :starts_at, :date
    field :ends_at, :date

    # Status
    field :status, Ecto.Enum,
      values: [:active, :expired, :cancelled, :paused],
      default: :active

    # Notes and audit
    field :notes, :string
    field :recorded_by, :binary_id

    # Relationships
    belongs_to :client, Client
    belongs_to :business, Business

    timestamps(type: :utc_datetime)
  end

  @doc """
  Changeset for creating a new client subscription record.
  """
  def create_changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [
      :client_id,
      :business_id,
      :plan_name,
      :amount,
      :currency,
      :billing_cycle,
      :payment_method,
      :payment_status,
      :transaction_id,
      :payment_reference,
      :payment_date,
      :payment_notes,
      :starts_at,
      :ends_at,
      :status,
      :notes,
      :recorded_by
    ])
    |> validate_required([
      :client_id,
      :business_id,
      :plan_name,
      :amount,
      :billing_cycle,
      :starts_at
    ])
    |> validate_number(:amount, greater_than: 0)
    |> validate_length(:plan_name, min: 2, max: 100)
    |> validate_length(:currency, is: 3)
    |> validate_subscription_dates()
    |> foreign_key_constraint(:client_id)
    |> foreign_key_constraint(:business_id)
  end

  @doc """
  Changeset for updating subscription details.
  """
  def update_changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [
      :plan_name,
      :amount,
      :currency,
      :billing_cycle,
      :payment_method,
      :payment_status,
      :transaction_id,
      :payment_reference,
      :payment_date,
      :payment_notes,
      :starts_at,
      :ends_at,
      :status,
      :notes
    ])
    |> validate_number(:amount, greater_than: 0)
    |> validate_length(:plan_name, min: 2, max: 100)
    |> validate_subscription_dates()
  end

  @doc """
  Changeset for recording a payment.
  """
  def payment_changeset(subscription, attrs) do
    subscription
    |> cast(attrs, [
      :payment_status,
      :payment_method,
      :transaction_id,
      :payment_reference,
      :payment_date,
      :payment_notes
    ])
    |> validate_required([:payment_status, :payment_method, :payment_date])
  end

  @doc """
  Changeset for updating subscription status.
  """
  def status_changeset(subscription, status) when is_atom(status) do
    subscription
    |> change(status: status)
    |> validate_required([:status])
  end

  # Private validation helpers

  defp validate_subscription_dates(changeset) do
    starts_at = get_field(changeset, :starts_at)
    ends_at = get_field(changeset, :ends_at)

    case {starts_at, ends_at} do
      {nil, _} ->
        changeset

      {_, nil} ->
        changeset

      {start_d, end_d} ->
        if Date.compare(start_d, end_d) == :lt do
          changeset
        else
          add_error(changeset, :ends_at, "must be after start date")
        end
    end
  end

  @doc """
  Returns true if the subscription is active.
  """
  def active?(%__MODULE__{status: :active}), do: true
  def active?(%__MODULE__{}), do: false

  @doc """
  Returns true if payment has been received.
  """
  def paid?(%__MODULE__{payment_status: :paid}), do: true
  def paid?(%__MODULE__{}), do: false

  @doc """
  Returns true if subscription is currently valid (within dates and active).
  """
  def valid?(%__MODULE__{status: :active, starts_at: starts_at, ends_at: ends_at}) do
    today = Date.utc_today()
    within_start = Date.compare(today, starts_at) in [:eq, :gt]
    within_end = is_nil(ends_at) or Date.compare(today, ends_at) in [:eq, :lt]

    within_start and within_end
  end

  def valid?(%__MODULE__{}), do: false

  @doc """
  Calculates if subscription is expiring soon (within 7 days).
  """
  def expiring_soon?(%__MODULE__{ends_at: nil}), do: false

  def expiring_soon?(%__MODULE__{ends_at: ends_at}) do
    today = Date.utc_today()
    days_until_expiry = Date.diff(ends_at, today)
    days_until_expiry >= 0 and days_until_expiry <= 7
  end
end
