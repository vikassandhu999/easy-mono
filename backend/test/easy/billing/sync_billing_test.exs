defmodule Easy.Billing.SyncBillingTest do
  use Easy.DataCase, async: true

  alias Easy.{Billing, Ctx}
  alias Easy.Clients.Client

  import Easy.Factory
  import Ecto.Query

  defp ctx_for(business), do: Ctx.new(business.id, business.owner_id)

  defp stub_get(subscription_id, response) do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      assert conn.method == "GET"
      assert conn.request_path == "/v1/subscriptions/#{subscription_id}"
      Req.Test.json(conn, response)
    end)
  end

  defp events_for(business_id) do
    Repo.all(from(e in Easy.Billing.Event, where: e.business_id == ^business_id))
  end

  test "active status activates seats, records seats_added, no payment_succeeded" do
    business = insert(:business)

    insert(:business_billing,
      business: business,
      status: :free,
      paid_seats: 0,
      razorpay_subscription_id: "sub_sync"
    )

    waiting = insert(:client, business: business, status: :awaiting_seat)

    stub_get("sub_sync", %{
      "id" => "sub_sync",
      "status" => "active",
      "quantity" => 3,
      "current_end" => 1_790_000_000
    })

    assert {:ok, summary} = Billing.sync_billing(ctx_for(business))
    assert summary.status == :active
    assert summary.paid_seats == 3

    billing = Billing.billing_for(business.id)
    assert billing.status == :active
    assert billing.paid_seats == 3
    assert billing.current_period_end

    kinds = business.id |> events_for() |> Enum.map(& &1.kind)
    assert :seats_added in kinds
    refute :payment_succeeded in kinds

    assert Repo.get!(Client, waiting.id).status == :active
  end

  test "cancel_at_period_end is preserved when active/authenticated status arrives" do
    business = insert(:business)

    insert(:business_billing,
      business: business,
      status: :cancel_at_period_end,
      paid_seats: 2,
      razorpay_subscription_id: "sub_sync"
    )

    stub_get("sub_sync", %{
      "id" => "sub_sync",
      "status" => "authenticated",
      "quantity" => 2,
      "current_end" => 1_790_000_000
    })

    assert {:ok, _summary} = Billing.sync_billing(ctx_for(business))
    assert Billing.billing_for(business.id).status == :cancel_at_period_end
  end

  test "created status is a no-op" do
    business = insert(:business)

    insert(:business_billing,
      business: business,
      status: :free,
      paid_seats: 0,
      razorpay_subscription_id: "sub_sync"
    )

    stub_get("sub_sync", %{"id" => "sub_sync", "status" => "created"})

    assert {:ok, summary} = Billing.sync_billing(ctx_for(business))
    assert summary.status == :free
    assert summary.paid_seats == 0
    assert events_for(business.id) == []
  end

  test "halted status on active billing sets past_due and records payment_failed" do
    business = insert(:business)

    insert(:business_billing,
      business: business,
      status: :active,
      paid_seats: 2,
      razorpay_subscription_id: "sub_sync"
    )

    stub_get("sub_sync", %{"id" => "sub_sync", "status" => "halted"})

    assert {:ok, _summary} = Billing.sync_billing(ctx_for(business))

    billing = Billing.billing_for(business.id)
    assert billing.status == :past_due

    kinds = business.id |> events_for() |> Enum.map(& &1.kind)
    assert :payment_failed in kinds
  end

  test "non-owner gets :not_owner" do
    business = insert(:business)
    other = insert(:user)

    insert(:business_billing, business: business, razorpay_subscription_id: "sub_sync")

    assert {:error, :not_owner} = Billing.sync_billing(Ctx.new(business.id, other.id))
  end

  test "no subscription id gets :no_subscription" do
    business = insert(:business)

    assert {:error, :no_subscription} = Billing.sync_billing(ctx_for(business))
  end

  test "razorpay 500 surfaces as :razorpay_error" do
    business = insert(:business)
    insert(:business_billing, business: business, razorpay_subscription_id: "sub_sync")

    Req.Test.stub(Easy.Razorpay, fn conn -> Plug.Conn.send_resp(conn, 500, "boom") end)

    assert {:error, :razorpay_error} = Billing.sync_billing(ctx_for(business))
  end

  test "sync then the real webhook for the same quantity is idempotent" do
    business = insert(:business)

    insert(:business_billing,
      business: business,
      status: :free,
      paid_seats: 0,
      razorpay_subscription_id: "sub_sync"
    )

    stub_get("sub_sync", %{
      "id" => "sub_sync",
      "status" => "active",
      "quantity" => 3,
      "current_end" => 1_790_000_000
    })

    assert {:ok, _} = Billing.sync_billing(ctx_for(business))

    payload = %{
      "event" => "subscription.charged",
      "payload" => %{
        "subscription" => %{"entity" => %{"id" => "sub_sync", "quantity" => 3, "current_end" => 1_790_000_000}},
        "payment" => %{"entity" => %{"amount" => 149_700, "currency" => "INR"}}
      }
    }

    body = Jason.encode!(payload)
    signature = :crypto.mac(:hmac, :sha256, "test_webhook_secret", body) |> Base.encode16(case: :lower)

    assert :ok = Billing.handle_razorpay_webhook(body, signature, "evt_idem_1")

    billing = Billing.billing_for(business.id)
    assert billing.paid_seats == 3

    kinds = business.id |> events_for() |> Enum.map(& &1.kind)
    assert Enum.count(kinds, &(&1 == :seats_added)) == 1
    assert :payment_succeeded in kinds
  end
end
