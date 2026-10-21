defmodule Easy.Billing.CheckoutTest do
  use Easy.DataCase, async: true

  alias Easy.{Billing, Ctx}
  alias Easy.Billing.BusinessBilling

  import Easy.Factory

  defp ctx_for(business), do: Ctx.new(business.id, business.owner_user_id)

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
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_existing") |> Easy.Repo.update!()

    assert {:ok, %{action: :updated, billing: billing}} = Billing.checkout(ctx_for(business), 1)
    assert billing.paid_seats == 4
    assert [%{kind: :seats_added, seat_delta: 1} | _] = summary(ctx_for(business)).recent_events
  end

  test "checkout rejects past-due and scheduled-for-cancellation subscriptions" do
    stub_razorpay()

    for status <- [:past_due, :cancel_at_period_end] do
      business = insert(:business)
      business.billing |> Ecto.Changeset.change(status: status, razorpay_subscription_id: "sub_#{status}") |> Easy.Repo.update!()

      assert {:error, changeset} = Billing.checkout(ctx_for(business), 1)
      assert %{status: ["is unavailable for this action"]} = errors_on(changeset)
    end
  end

  test "checkout rejects more than 100 seats before calling the provider" do
    stub_razorpay()
    business = insert(:business)

    assert {:error, changeset} = Billing.checkout(ctx_for(business), 101)
    assert %{seats_to_add: ["must be less than or equal to 100"]} = errors_on(changeset)
  end

  test "invalid seat increases return changeset errors without changing billing or contacting the provider" do
    Req.Test.stub(Easy.Razorpay, fn _conn -> flunk("invalid checkout must not contact Razorpay") end)
    business = insert(:business)

    for value <- [nil, 0, -1, 1.5, "invalid", %{}] do
      assert {:error, %Ecto.Changeset{valid?: false} = changeset} = Billing.checkout(ctx_for(business), value)
      assert Map.has_key?(errors_on(changeset), :seats_to_add)
      assert Repo.get_by(BusinessBilling, business_id: business.id).paid_seats == 0
    end
  end

  test "buying seats leaves joined clients waiting for an explicit coaching start" do
    stub_razorpay()
    business = insert(:business)
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_existing") |> Easy.Repo.update!()
    insert(:client, business: business)
    insert(:client, business: business)
    insert(:client, business: business)
    insert(:client, business: business)
    insert(:client, business: business)
    waiting = insert(:client, business: business, terms: [])

    {:ok, _} = Billing.checkout(ctx_for(business), 1)

    assert Repo.preload(Repo.get!(Easy.Clients.Client, waiting.id), :terms).terms == []
  end

  test "cancel schedules cancellation at period end and keeps paid seats" do
    stub_razorpay()
    business = insert(:business)
    business.billing |> Ecto.Changeset.change(paid_seats: 3, status: :active, razorpay_subscription_id: "sub_existing") |> Easy.Repo.update!()

    assert {:ok, billing} = Billing.cancel(ctx_for(business))
    assert billing.status == :cancel_at_period_end
    assert billing.paid_seats == 3
    assert [%{kind: :cancellation_scheduled} | _] = summary(ctx_for(business)).recent_events
  end

  test "cancel without a subscription is :no_subscription" do
    business = insert(:business)

    assert {:error, :no_subscription} = Billing.cancel(ctx_for(business))
  end

  test "cancel rejects subscriptions that are already scheduled or cancelled" do
    stub_razorpay()

    for status <- [:free, :cancel_at_period_end, :cancelled] do
      business = insert(:business)
      business.billing |> Ecto.Changeset.change(status: status, razorpay_subscription_id: "sub_#{status}") |> Easy.Repo.update!()

      assert {:error, changeset} = Billing.cancel(ctx_for(business))
      assert %{status: ["is unavailable for this action"]} = errors_on(changeset)
    end
  end

  test "checkout with a stale subscription id on a free (never-paid) business starts a fresh checkout" do
    stub_razorpay()
    business = insert(:business)
    business.billing |> Ecto.Changeset.change(paid_seats: 0, status: :free, razorpay_subscription_id: "sub_stale") |> Easy.Repo.update!()

    assert {:ok, %{action: :checkout, checkout: checkout, billing: billing}} =
             Billing.checkout(ctx_for(business), 3)

    assert checkout.subscription_id == "sub_new"
    assert billing.paid_seats == 0
    assert billing_for(business.id).razorpay_subscription_id == "sub_new"
    refute Enum.any?(summary(ctx_for(business)).recent_events, &(&1.kind == :seats_added))
  end

  test "razorpay failure surfaces as :razorpay_error and changes nothing" do
    Req.Test.stub(Easy.Razorpay, fn conn -> Req.Test.transport_error(conn, :econnrefused) end)
    business = insert(:business)

    assert {:error, :razorpay_error} = Billing.checkout(ctx_for(business), 1)
    assert billing_for(business.id).razorpay_subscription_id == nil
  end
end
