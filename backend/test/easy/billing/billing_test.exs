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

  describe "seat_summary/1" do
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

  describe "ensure_seat_available/1" do
    test "ok below the limit, seat_limit_reached at the limit" do
      business = insert(:business)
      insert(:business_billing, business: business, free_seats: 2)
      insert(:client, business: business, status: :active)

      assert :ok = Billing.ensure_seat_available(ctx_for(business))

      insert(:client, business: business, status: :pending)

      assert {:error, :seat_limit_reached} = Billing.ensure_seat_available(ctx_for(business))
    end

    test "paid seats raise the limit" do
      business = insert(:business)
      insert(:business_billing, business: business, paid_seats: 1, status: :active)
      insert(:client, business: business, status: :active)
      insert(:client, business: business, status: :active)

      assert :ok = Billing.ensure_seat_available(ctx_for(business))
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
