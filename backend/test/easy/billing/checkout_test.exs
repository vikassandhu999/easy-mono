defmodule Easy.Billing.CheckoutTest do
  use Easy.DataCase, async: true

  alias Easy.{Billing, Ctx}
  alias Easy.Billing.BusinessBilling

  import Easy.Factory

  defp ctx_for(business), do: Ctx.new(business.id, business.owner_id)

  defp billing_for(business_id),
    do: Repo.get_by(BusinessBilling, business_id: business_id) || %BusinessBilling{}

  defp summary(ctx) do
    {:ok, summary} = Billing.get_billing(ctx)
    summary
  end

  defp stub_razorpay do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      case {conn.method, conn.request_path} do
        {"POST", "/v1/subscriptions"} ->
          Req.Test.json(conn, %{"id" => "sub_new", "plan_id" => "plan_test", "quantity" => 3, "status" => "created"})

        {"PATCH", "/v1/subscriptions/sub_existing"} ->
          Req.Test.json(conn, %{"id" => "sub_existing", "quantity" => 4, "status" => "active"})

        {"POST", "/v1/subscriptions/sub_existing/cancel"} ->
          Req.Test.json(conn, %{"id" => "sub_existing", "status" => "cancelled"})
      end
    end)
  end

  test "checkout is owner-only" do
    business = insert(:business)
    other = insert(:user)

    assert {:error, :not_owner} = Billing.checkout(Ctx.new(business.id, other.id), 1)
    assert {:error, :not_owner} = Billing.cancel(Ctx.new(business.id, other.id))
  end

  test "first checkout creates a subscription and returns a checkout payload" do
    stub_razorpay()
    business = insert(:business)

    assert {:ok, %{action: :checkout, checkout: checkout, billing: billing}} =
             Billing.checkout(ctx_for(business), 3)

    assert checkout.subscription_id == "sub_new"
    assert checkout.key_id == "rzp_test_key"
    # paid_seats NOT bumped yet — webhook confirms payment
    assert billing.paid_seats == 0
    assert billing_for(business.id).razorpay_subscription_id == "sub_new"
  end

  test "checkout with an existing active subscription updates quantity immediately" do
    stub_razorpay()
    business = insert(:business)
    insert(:business_billing, business: business, paid_seats: 3, status: :active, razorpay_subscription_id: "sub_existing")

    assert {:ok, %{action: :updated, billing: billing}} = Billing.checkout(ctx_for(business), 1)
    assert billing.paid_seats == 4
    assert [%{kind: :seats_added, seat_delta: 1} | _] = summary(ctx_for(business)).recent_events
  end

  test "buying seats activates the oldest awaiting_seat clients" do
    stub_razorpay()
    business = insert(:business)
    insert(:business_billing, business: business, paid_seats: 3, status: :active, razorpay_subscription_id: "sub_existing")
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    waiting = insert(:client, business: business, status: :inactive, inactive_reason: :awaiting_seat)

    {:ok, _} = Billing.checkout(ctx_for(business), 1)

    assert Repo.get!(Easy.Clients.Client, waiting.id).status == :active
    assert Repo.get!(Easy.Clients.Client, waiting.id).inactive_reason == nil
  end

  test "cancel schedules cancellation at period end and keeps paid seats" do
    stub_razorpay()
    business = insert(:business)
    insert(:business_billing, business: business, paid_seats: 3, status: :active, razorpay_subscription_id: "sub_existing")

    assert {:ok, billing} = Billing.cancel(ctx_for(business))
    assert billing.status == :cancel_at_period_end
    assert billing.paid_seats == 3
    assert [%{kind: :cancellation_scheduled} | _] = summary(ctx_for(business)).recent_events
  end

  test "cancel without a subscription is :no_subscription" do
    business = insert(:business)

    assert {:error, :no_subscription} = Billing.cancel(ctx_for(business))
  end

  test "checkout with a stale subscription id on a free (never-paid) business starts a fresh checkout" do
    stub_razorpay()
    business = insert(:business)
    insert(:business_billing, business: business, paid_seats: 0, status: :free, razorpay_subscription_id: "sub_stale")

    assert {:ok, %{action: :checkout, checkout: checkout, billing: billing}} =
             Billing.checkout(ctx_for(business), 3)

    assert checkout.subscription_id == "sub_new"
    assert billing.paid_seats == 0
    assert billing_for(business.id).razorpay_subscription_id == "sub_new"
    refute Enum.any?(summary(ctx_for(business)).recent_events, &(&1.kind == :seats_added))
    assert summary(ctx_for(business)).awaiting_seat_count == 0
  end

  test "razorpay failure surfaces as :razorpay_error and changes nothing" do
    Req.Test.stub(Easy.Razorpay, fn conn -> Req.Test.transport_error(conn, :econnrefused) end)
    business = insert(:business)

    assert {:error, :razorpay_error} = Billing.checkout(ctx_for(business), 1)
    assert billing_for(business.id).razorpay_subscription_id == nil
  end
end
