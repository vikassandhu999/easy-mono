defmodule Easy.Razorpay.Payload do
  @max_integer 2_147_483_647
  @max_amount_paise @max_integer * 100 + 99

  @subscription_events ~w(subscription.charged subscription.pending subscription.halted subscription.cancelled subscription.updated)

  @type subscription :: %{
          id: String.t(),
          plan_id: String.t() | nil,
          status: String.t() | nil,
          quantity: non_neg_integer() | nil,
          current_period_end: DateTime.t() | nil,
          has_scheduled_changes: boolean(),
          checkout_request_id: Ecto.UUID.t() | nil
        }
  @type payment :: %{amount_paid: non_neg_integer() | nil, currency: String.t() | nil}
  @type webhook :: %{event: String.t(), subscription: subscription() | nil, payment: payment() | nil}

  @spec parse_webhook(term()) :: {:ok, webhook()} | {:error, :invalid_webhook_payload}
  def parse_webhook(%{"event" => event} = params) when event in @subscription_events do
    payload = params["payload"]
    subscription = entity(payload, "subscription")
    payment = entity(payload, "payment")

    if valid_subscription?(subscription) and valid_optional_payment?(payload, payment) do
      {:ok, %{event: event, subscription: subscription_values(subscription), payment: payment_values(payment || %{})}}
    else
      {:error, :invalid_webhook_payload}
    end
  end

  def parse_webhook(%{"event" => event}) when is_binary(event) and event != "" do
    {:ok, %{event: event, subscription: nil, payment: nil}}
  end

  def parse_webhook(_params), do: {:error, :invalid_webhook_payload}

  @spec subscription_values(map()) :: subscription()
  def subscription_values(subscription) do
    %{
      id: subscription["id"],
      plan_id: subscription["plan_id"],
      status: subscription["status"],
      quantity: subscription["quantity"],
      current_period_end: period_end(subscription["current_end"]),
      has_scheduled_changes: subscription["has_scheduled_changes"] == true,
      checkout_request_id: checkout_request_id(subscription["notes"])
    }
  end

  defp checkout_request_id(%{"checkout_request_id" => request_id}) do
    case Ecto.UUID.cast(request_id) do
      {:ok, request_id} -> request_id
      :error -> nil
    end
  end

  defp checkout_request_id(_notes), do: nil

  defp payment_values(payment) do
    %{amount_paid: payment["amount"] && div(payment["amount"], 100), currency: payment["currency"]}
  end

  defp period_end(nil), do: nil

  defp period_end(timestamp) do
    case DateTime.from_unix(timestamp) do
      {:ok, datetime} -> datetime
      {:error, _reason} -> nil
    end
  end

  @spec valid_subscription?(term()) :: boolean()
  def valid_subscription?(%{"id" => id} = subscription) do
    nonempty_string?(id) and
      optional_string?(subscription["plan_id"]) and
      optional_string?(subscription["status"]) and
      optional_nonnegative_integer?(subscription["quantity"], @max_integer) and
      valid_period_end?(subscription["current_end"]) and
      optional_boolean?(subscription["has_scheduled_changes"])
  end

  def valid_subscription?(_subscription), do: false

  @spec valid_payment?(term()) :: boolean()
  def valid_payment?(payment) when is_map(payment) do
    optional_nonnegative_integer?(payment["amount"], @max_amount_paise) and
      optional_string?(payment["currency"])
  end

  def valid_payment?(_payment), do: false

  defp entity(payload, key) when is_map(payload) do
    case payload[key] do
      %{"entity" => entity} when is_map(entity) -> entity
      _invalid -> nil
    end
  end

  defp entity(_payload, _key), do: nil

  defp valid_optional_payment?(%{"payment" => _payment}, payment), do: valid_payment?(payment)
  defp valid_optional_payment?(_payload, _payment), do: true

  defp nonempty_string?(value), do: is_binary(value) and value != "" and byte_size(value) <= 255
  defp optional_string?(nil), do: true
  defp optional_string?(value), do: nonempty_string?(value)

  defp optional_nonnegative_integer?(nil, _maximum), do: true
  defp optional_nonnegative_integer?(value, maximum), do: is_integer(value) and value >= 0 and value <= maximum

  defp optional_boolean?(nil), do: true
  defp optional_boolean?(value), do: is_boolean(value)

  defp valid_period_end?(nil), do: true
  defp valid_period_end?(value) when is_integer(value), do: match?({:ok, _}, DateTime.from_unix(value))
  defp valid_period_end?(_value), do: false
end
