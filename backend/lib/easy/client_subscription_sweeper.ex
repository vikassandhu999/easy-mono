defmodule Easy.ClientSubscriptionSweeper do
  use GenServer

  import Ecto.Query

  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.SweeperLock

  @day_ms 24 * 60 * 60 * 1000
  @lock_name "easy-client-subscription-sweeper"

  @spec start_link(keyword()) :: GenServer.on_start()
  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  @spec init(keyword()) :: {:ok, map()}
  def init(_opts) do
    send(self(), :sweep)
    {:ok, %{}}
  end

  @impl true
  @spec handle_info(:sweep, map()) :: {:noreply, map()}
  def handle_info(:sweep, state) do
    SweeperLock.run(@lock_name, &sweep/0)
    Process.send_after(self(), :sweep, @day_ms)
    {:noreply, state}
  end

  # Ends expired client coaching engagements (clients.subscription_ends_on). This
  # is unrelated to a business's Razorpay billing subscription (Easy.Billing).
  # Cross-tenant by design: the one system-wide job that ends expired engagements.
  # ponytail: UTC date boundary + 24h tick; Oban + business timezones if precision
  # ever matters.
  @spec sweep() :: {non_neg_integer(), nil}
  def sweep do
    today = Date.utc_today()

    Repo.update_all(
      from(c in Client, where: c.status == :active and c.subscription_ends_on < ^today),
      set: [
        status: :inactive,
        inactive_reason: :subscription_expired,
        updated_at: DateTime.utc_now(:second)
      ]
    )
  end
end
