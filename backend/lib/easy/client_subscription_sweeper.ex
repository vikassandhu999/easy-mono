defmodule Easy.ClientSubscriptionSweeper do
  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.Sweeper
  alias Easy.SweeperLock

  @day_ms 24 * 60 * 60 * 1000
  @lock_name "easy-client-subscription-sweeper"

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(_opts) do
    Sweeper.start_link(
      name: __MODULE__,
      sweep: fn -> SweeperLock.run(@lock_name, &sweep/0) end,
      interval: @day_ms
    )
  end

  @spec child_spec(keyword()) :: Supervisor.child_spec()
  def child_spec(opts), do: %{id: __MODULE__, start: {__MODULE__, :start_link, [opts]}}

  # Ends expired client coaching engagements (clients.subscription_ends_on). This
  # is unrelated to a business's Razorpay billing subscription (Easy.Billing).
  # Cross-tenant by design: the one system-wide job that ends expired engagements.
  # ponytail: UTC date boundary + 24h tick; Oban + business timezones if precision
  # ever matters.
  @spec sweep(Date.t()) :: {non_neg_integer(), nil}
  def sweep(today \\ Date.utc_today()) do
    Repo.update_all(
      Client.expired_subscriptions(today),
      set: [
        status: :inactive,
        inactive_reason: :subscription_expired,
        updated_at: DateTime.utc_now(:second)
      ]
    )
  end
end
