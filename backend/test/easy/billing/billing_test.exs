defmodule Easy.BillingTest do
  use Easy.DataCase, async: true

  alias Easy.{Billing, Ctx, Repo}
  alias Easy.Billing.{BusinessBilling, Event}
  alias Easy.Clients.Client

  import Easy.Factory

  @webhook_secret "test_webhook_secret"

  defp ctx_for(business), do: Ctx.new(business.id, business.owner_id)

  defp summary(ctx) do
    {:ok, summary} = Billing.get_billing(ctx)
    summary
  end

  # Drives a signed subscription.charged event through the public webhook
  # interface — the production trigger for waiting-client activation.
  defp charged_webhook(sub_id, quantity) do
    body =
      Jason.encode!(%{
        "event" => "subscription.charged",
        "payload" => %{
          "subscription" => %{"entity" => %{"id" => sub_id, "quantity" => quantity, "current_end" => 1_790_000_000}},
          "payment" => %{"entity" => %{"amount" => 10_000, "currency" => "INR"}}
        }
      })

    signature = :crypto.mac(:hmac, :sha256, @webhook_secret, body) |> Base.encode16(case: :lower)
    Billing.handle_razorpay_webhook(body, signature, "evt_#{System.unique_integer([:positive])}")
  end

  test "quantity updates change subscribed accounts and leave free or cancelled accounts untouched" do
    for status <- [:free, :active, :past_due, :cancel_at_period_end, :cancelled] do
      subscription_id = "sub_quantity_#{status}"
      paid_seats = if status in [:free, :cancelled], do: 0, else: 2

      billing =
        insert(:business_billing,
          status: status,
          paid_seats: paid_seats,
          razorpay_subscription_id: subscription_id
        )

      before = Repo.get!(BusinessBilling, billing.id)

      body =
        Jason.encode!(%{
          "event" => "subscription.updated",
          "payload" => %{"subscription" => %{"entity" => %{"id" => subscription_id, "quantity" => 4}}}
        })

      signature = :crypto.mac(:hmac, :sha256, @webhook_secret, body) |> Base.encode16(case: :lower)
      assert :ok = Billing.handle_razorpay_webhook(body, signature, "evt_quantity_#{status}")
      updated = Repo.get!(BusinessBilling, billing.id)
      events = Repo.all(Event.for_business(billing.business_id))

      if status in [:free, :cancelled] do
        assert updated == before
        assert events == []
      else
        assert updated.status == status
        assert updated.paid_seats == 4
        assert updated.free_seats == before.free_seats
        assert [%{kind: :seats_added, seat_delta: 2}] = events
      end
    end
  end

  test "failure and cancellation notifications preserve unaffected states and avoid duplicate events" do
    for event <- ["subscription.pending", "subscription.halted", "subscription.cancelled"],
        status <- [:free, :active, :past_due, :cancel_at_period_end, :cancelled] do
      subscription_id = "sub_#{event}_#{status}"
      paid_seats = if status in [:free, :cancelled], do: 0, else: 2

      billing =
        insert(:business_billing,
          status: status,
          paid_seats: paid_seats,
          razorpay_subscription_id: subscription_id
        )

      expected =
        case {event, status} do
          {"subscription.cancelled", :cancelled} -> {status, paid_seats, []}
          {"subscription.cancelled", _} -> {:cancelled, 0, [:subscription_cancelled]}
          {_, state} when state in [:active, :cancel_at_period_end] -> {:past_due, paid_seats, [:payment_failed]}
          _ -> {status, paid_seats, []}
        end

      {expected_status, expected_seats, expected_events} = expected

      for attempt <- 1..2 do
        body =
          Jason.encode!(%{
            "event" => event,
            "payload" => %{"subscription" => %{"entity" => %{"id" => subscription_id}}}
          })

        signature = :crypto.mac(:hmac, :sha256, @webhook_secret, body) |> Base.encode16(case: :lower)
        assert :ok = Billing.handle_razorpay_webhook(body, signature, "#{subscription_id}_#{attempt}")
        updated = Repo.get!(BusinessBilling, billing.id)
        assert updated.status == expected_status
        assert updated.paid_seats == expected_seats
        assert updated.free_seats == billing.free_seats
        assert Enum.map(Repo.all(Event.for_business(billing.business_id)), & &1.kind) == expected_events
      end
    end
  end

  describe "grant_free_seats/2" do
    test "bumps free seats (creating the billing row) and the summary reflects it" do
      business = insert(:business)

      assert {:ok, _billing} = Billing.grant_free_seats(ctx_for(business), 10)

      summary = summary(ctx_for(business))
      assert summary.free_seats == 10
      assert summary.seat_limit == 10
      assert summary.available_seats == 10
    end
  end

  describe "get_billing/1" do
    test "keeps billing, client counts and recent events within the context business" do
      businesses =
        for {free, paid, used, waiting} <- [{3, 2, 2, 1}, {7, 4, 3, 2}] do
          business = insert(:business)
          insert(:business_billing, business: business, free_seats: free, paid_seats: paid)
          insert_list(used, :client, business: business, status: :active)
          insert_list(waiting, :client, business: business, status: :inactive, inactive_reason: :awaiting_seat)

          event =
            business.id
            |> Event.insert_changeset(:seats_added, DateTime.utc_now(:second), %{seat_delta: paid})
            |> Repo.insert!()

          {business, event, free, paid, used, waiting}
        end

      for {business, event, free, paid, used, waiting} <- businesses do
        assert {:ok, billing} = Billing.get_billing(ctx_for(business))
        assert billing.free_seats == free
        assert billing.paid_seats == paid
        assert billing.seat_limit == free + paid
        assert billing.used_seats == used
        assert billing.available_seats == free + paid - used
        assert billing.awaiting_seat_count == waiting
        assert Enum.map(billing.recent_events, & &1.id) == [event.id]
      end
    end

    test "a new business has ten free seats and no billing row yet" do
      business = insert(:business)

      summary = summary(ctx_for(business))

      assert summary.free_seats == 10
      assert summary.paid_seats == 0
      assert summary.seat_limit == 10
      assert summary.used_seats == 0
      assert summary.available_seats == 10
      assert summary.status == :free
      assert summary.is_owner == true
    end

    test "active and pending clients count as used seats" do
      business = insert(:business)
      insert(:client, business: business, status: :active)
      insert(:client, business: business, status: :pending)

      assert summary(ctx_for(business)).used_seats == 2
    end

    test "awaiting_seat and manually inactive clients do not count" do
      business = insert(:business)
      insert(:client, business: business, status: :inactive, inactive_reason: :awaiting_seat)
      insert(:client, business: business, status: :inactive, inactive_reason: :manual)

      summary = summary(ctx_for(business))

      assert summary.used_seats == 0
      assert summary.awaiting_seat_count == 1
    end

    test "is_owner is false for a non-owner coach" do
      business = insert(:business)
      other_user = insert(:user)

      refute summary(Ctx.new(business.id, other_user.id)).is_owner
    end
  end

  describe "waiting-client activation (via subscription.charged webhook)" do
    test "activates awaiting_seat rows but leaves manually-inactive rows" do
      business = insert(:business)
      insert(:business_billing, business: business, razorpay_subscription_id: "sub_act", free_seats: 5, status: :active)
      waiting = insert(:client, business: business, status: :inactive, inactive_reason: :awaiting_seat)
      paused = insert(:client, business: business, status: :inactive, inactive_reason: :manual)

      assert :ok = charged_webhook("sub_act", 5)

      assert Repo.get!(Client, waiting.id).status == :active
      assert Repo.get!(Client, waiting.id).inactive_reason == nil
      assert Repo.get!(Client, paused.id).status == :inactive
    end
  end

  describe "owner-only operations" do
    test "reject a non-owner before doing any work" do
      business = insert(:business)
      other = Ctx.new(business.id, insert(:user).id)

      assert {:error, :not_owner} = Billing.checkout(other, 1)
      assert {:error, :not_owner} = Billing.cancel(other)
      assert {:error, :not_owner} = Billing.sync_billing(other)
    end

    test "let the owner past the ownership gate" do
      business = insert(:business)

      # No subscription yet, so the owner clears ensure_owner and reaches
      # :no_subscription — proof the gate passed without a Razorpay call.
      assert {:error, :no_subscription} = Billing.cancel(ctx_for(business))
      assert {:error, :no_subscription} = Billing.sync_billing(ctx_for(business))
    end
  end

  describe "reserve_seat/2 atomicity" do
    # Guards the transaction pattern shared by the payment paths (update_quantity /
    # do_cancel): an earlier local write committed in the same transaction as a
    # later step that fails must roll back together.
    test "an earlier write rolls back when a later step in the same transaction fails" do
      business = insert(:business)
      before = Repo.aggregate(Event, :count, :id)

      result =
        Billing.reserve_seat(ctx_for(business), fn ->
          Repo.insert!(%Event{business_id: business.id, kind: :seats_added, occurred_at: DateTime.utc_now(:second)})
          {:error, :later_step_failed}
        end)

      assert result == {:error, :later_step_failed}
      assert Repo.aggregate(Event, :count, :id) == before
    end

    test "the seat-consuming write is skipped entirely at the limit" do
      business = insert(:business)
      insert(:business_billing, business: business, free_seats: 2)
      insert(:client, business: business, status: :active)
      insert(:client, business: business, status: :active)

      assert {:error, :seat_limit_reached} =
               Billing.reserve_seat(ctx_for(business), fn ->
                 send(self(), :ran)
                 {:ok, :done}
               end)

      refute_received :ran
    end
  end

  describe "razorpay_subscription_id uniqueness" do
    test "the same subscription id can't be stored on two businesses" do
      billing_one = insert(:business_billing, business: insert(:business))
      billing_two = insert(:business_billing, business: insert(:business))

      assert {:ok, _} =
               billing_one |> BusinessBilling.update_changeset(%{razorpay_subscription_id: "sub_dup"}) |> Repo.update()

      assert {:error, changeset} =
               billing_two |> BusinessBilling.update_changeset(%{razorpay_subscription_id: "sub_dup"}) |> Repo.update()

      assert %{razorpay_subscription_id: ["has already been taken"]} = errors_on(changeset)
    end
  end

  describe "recent_events/1" do
    test "returns newest 10" do
      business = insert(:business)

      for i <- 1..12 do
        Repo.insert!(%Event{
          business_id: business.id,
          kind: :seats_added,
          seat_delta: i,
          occurred_at: DateTime.add(DateTime.utc_now(:second), i, :minute)
        })
      end

      events = summary(ctx_for(business)).recent_events

      assert length(events) == 10
      assert hd(events).seat_delta == 12
    end
  end
end
