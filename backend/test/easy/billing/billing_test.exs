defmodule Easy.BillingTest do
  use Easy.DataCase, async: true

  alias Easy.{Billing, Ctx}

  import Easy.Factory

  defp ctx_for(business), do: Ctx.new(business.id, business.owner_id)

  describe "seat_summary/1" do
    test "a new business has two free seats and no billing row yet" do
      business = insert(:business)

      summary = Billing.seat_summary(ctx_for(business))

      assert summary.free_seats == 2
      assert summary.paid_seats == 0
      assert summary.seat_limit == 2
      assert summary.used_seats == 0
      assert summary.available_seats == 2
      assert summary.status == :free
      assert summary.is_owner == true
    end

    test "active and pending clients count as used seats" do
      business = insert(:business)
      insert(:client, business: business, status: :active)
      insert(:client, business: business, status: :pending)

      assert Billing.seat_summary(ctx_for(business)).used_seats == 2
    end

    test "awaiting_seat, inactive, and archived clients do not count" do
      business = insert(:business)
      insert(:client, business: business, status: :awaiting_seat)
      insert(:client, business: business, status: :inactive)
      insert(:client, business: business, status: :archived)

      summary = Billing.seat_summary(ctx_for(business))

      assert summary.used_seats == 0
      assert summary.awaiting_seat_count == 1
    end

    test "is_owner is false for a non-owner coach" do
      business = insert(:business)
      other_user = insert(:user)

      refute Billing.seat_summary(Ctx.new(business.id, other_user.id)).is_owner
    end
  end

  describe "ensure_seat_available/1" do
    test "ok below the limit, seat_limit_reached at the limit" do
      business = insert(:business)
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

  describe "ensure_owner/1" do
    test "owner passes, non-owner gets :not_owner" do
      business = insert(:business)
      other_user = insert(:user)

      assert :ok = Billing.ensure_owner(ctx_for(business))
      assert {:error, :not_owner} = Billing.ensure_owner(Ctx.new(business.id, other_user.id))
    end
  end

  describe "recent_events/1" do
    test "returns newest 10" do
      business = insert(:business)

      for i <- 1..12 do
        Billing.record_event(business.id, :seats_added, %{
          seat_delta: i,
          occurred_at: DateTime.add(DateTime.utc_now(:second), i, :minute)
        })
      end

      events = Billing.recent_events(ctx_for(business))

      assert length(events) == 10
      assert hd(events).seat_delta == 12
    end
  end
end
