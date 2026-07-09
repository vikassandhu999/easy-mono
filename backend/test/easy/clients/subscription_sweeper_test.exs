defmodule Easy.SubscriptionSweeperTest do
  use Easy.SchemaCase, async: false

  alias Easy.Clients.Client
  alias Easy.Repo
  alias Easy.SubscriptionSweeper

  test "sweep deactivates only active clients past their end date" do
    business = insert(:business)
    yesterday = Date.add(Date.utc_today(), -1)
    tomorrow = Date.add(Date.utc_today(), 1)

    expired = insert(:client, business: business, status: :active, subscription_ends_on: yesterday)
    current = insert(:client, business: business, status: :active, subscription_ends_on: tomorrow)
    dateless = insert(:client, business: business, status: :active)

    already_inactive =
      insert(:client, business: business, status: :inactive, inactive_reason: :manual, subscription_ends_on: yesterday)

    assert {1, nil} = SubscriptionSweeper.sweep()

    assert %{status: :inactive, inactive_reason: :subscription_expired} = Repo.get!(Client, expired.id)
    assert Repo.get!(Client, current.id).status == :active
    assert Repo.get!(Client, dateless.id).status == :active
    assert %{status: :inactive, inactive_reason: :manual} = Repo.get!(Client, already_inactive.id)
  end

  test "sweep is idempotent" do
    business = insert(:business)
    insert(:client, business: business, status: :active, subscription_ends_on: Date.add(Date.utc_today(), -3))

    assert {1, nil} = SubscriptionSweeper.sweep()
    assert {0, nil} = SubscriptionSweeper.sweep()
  end
end
