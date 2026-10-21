defmodule EasyWeb.Types.BillingEvent do
  use EasyWeb.Type

  @type t :: %{
          required(:id) => String.t(),
          required(:kind) =>
            :seats_added
            | :seats_removed
            | :payment_succeeded
            | :payment_failed
            | :cancellation_scheduled
            | :subscription_cancelled,
          required(:seat_delta) => integer() | nil,
          required(:amount_paid) => integer() | nil,
          required(:currency) => String.t() | nil,
          required(:occurred_at) => DateTime.t()
        }
end

defmodule EasyWeb.Types.BillingCheckoutPayload do
  use EasyWeb.Type

  @type t :: %{
          required(:key_id) => String.t(),
          required(:subscription_id) => String.t(),
          required(:request_id) => Ecto.UUID.t()
        }
end

defmodule EasyWeb.Types.PendingBillingCheckout do
  use EasyWeb.Type

  @type t :: %{
          required(:key_id) => String.t(),
          required(:subscription_id) => String.t() | nil,
          required(:request_id) => Ecto.UUID.t(),
          required(:target_quantity) => pos_integer(),
          required(:status) => :pending | :unknown,
          required(:kind) => :create | :update
        }
end

defmodule EasyWeb.Types.Billing do
  use EasyWeb.Type

  @type t :: %{
          required(:status) => :free | :active | :past_due | :cancel_at_period_end | :cancelled,
          required(:free_seats) => non_neg_integer(),
          required(:paid_seats) => non_neg_integer(),
          required(:seat_limit) => non_neg_integer(),
          required(:used_seats) => non_neg_integer(),
          required(:available_seats) => integer(),
          required(:monthly_seat_price_inr) => non_neg_integer() | nil,
          required(:monthly_total_inr) => non_neg_integer() | nil,
          required(:billing_enabled) => boolean(),
          required(:can_add_seats) => boolean(),
          required(:can_cancel) => boolean(),
          required(:can_sync) => boolean(),
          required(:cancellation_state) => :requested | :unknown | :accepted | nil,
          required(:pending_checkout) => EasyWeb.Types.PendingBillingCheckout.t() | nil,
          required(:current_period_end) => DateTime.t() | nil,
          required(:is_owner) => boolean(),
          required(:recent_events) => [EasyWeb.Types.BillingEvent.t()] | nil
        }

  @type checkout :: %{required(:seats_to_add) => pos_integer(), optional(:request_id) => Ecto.UUID.t()}

  @spec format(map()) :: t()
  def format(%{recent_events: events} = billing) when is_list(events),
    do: format_billing(billing, events)

  def format(%{recent_events: nil} = billing), do: format_billing(billing, nil)

  def format(billing) when is_map(billing) and not is_map_key(billing, :recent_events),
    do: format_billing(billing, nil)

  defp format_billing(billing, recent_events) do
    %{
      status: billing.status,
      free_seats: billing.free_seats,
      paid_seats: billing.paid_seats,
      seat_limit: billing.seat_limit,
      used_seats: billing.used_seats,
      available_seats: billing.available_seats,
      monthly_seat_price_inr: billing.monthly_seat_price_inr,
      monthly_total_inr: billing.monthly_total_inr,
      billing_enabled: billing.billing_enabled,
      can_add_seats: billing.can_add_seats,
      can_cancel: billing.can_cancel,
      can_sync: billing.can_sync,
      cancellation_state: billing.cancellation_state,
      pending_checkout: billing.pending_checkout,
      current_period_end: billing.current_period_end,
      is_owner: billing.is_owner,
      recent_events: recent_events
    }
  end
end

defmodule EasyWeb.Types.BillingCheckoutResult do
  use EasyWeb.Type

  @type t :: %{
          required(:action) => :checkout | :updated,
          required(:checkout) => EasyWeb.Types.BillingCheckoutPayload.t() | nil,
          required(:billing) => EasyWeb.Types.Billing.t()
        }

  @spec format(map()) :: t()
  def format(%{action: :checkout, checkout: checkout, billing: billing}) do
    %{action: :checkout, checkout: checkout, billing: billing}
  end

  def format(%{action: :updated, billing: billing}) do
    %{action: :updated, checkout: nil, billing: billing}
  end
end
