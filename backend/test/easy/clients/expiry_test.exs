defmodule Easy.Clients.ExpiryTest do
  use Easy.DataCase, async: true

  alias Easy.Clients.Client

  test "expiry query and presentation agree at each window boundary" do
    business = insert(:business)
    today = Date.utc_today()

    cases = [
      {:active, nil, false},
      {:active, -1, false},
      {:active, 0, true},
      {:active, 14, true},
      {:active, 15, false},
      {:inactive, 0, false},
      {:pending, 0, false}
    ]

    clients =
      Enum.map(cases, fn {status, days, expected} ->
        ends_on = if days, do: Date.add(today, days)
        client = insert(:client, business: business, status: status, subscription_ends_on: ends_on)
        assert Client.put_expiring_flag(client, today).expiring_soon == expected
        {client, expected}
      end)

    expected_ids = for {client, true} <- clients, into: MapSet.new(), do: client.id

    actual_ids =
      Client.for_business(business.id)
      |> Client.expiring_soon(today)
      |> Repo.all()
      |> MapSet.new(& &1.id)

    assert actual_ids == expected_ids
  end
end
