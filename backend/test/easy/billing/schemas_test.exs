defmodule Easy.Billing.SchemasTest do
  use Easy.DataCase, async: true

  alias Easy.Billing.{BusinessBilling, Event, WebhookReceipt}
  alias Easy.Repo

  import Easy.Factory

  test "business_billing defaults to 2 free seats, 0 paid, status free" do
    business = insert(:business)

    billing = Repo.insert!(%BusinessBilling{business_id: business.id})

    assert billing.free_seats == 2
    assert billing.paid_seats == 0
    assert billing.status == :free
  end

  test "one billing row per business" do
    business = insert(:business)
    Repo.insert!(%BusinessBilling{business_id: business.id})

    assert_raise Ecto.ConstraintError, fn ->
      Repo.insert!(%BusinessBilling{business_id: business.id})
    end
  end

  test "duplicate webhook receipt is rejected by unique index" do
    Repo.insert!(%WebhookReceipt{razorpay_event_id: "evt_1", event_type: "subscription.charged"})

    assert_raise Ecto.ConstraintError, fn ->
      Repo.insert!(%WebhookReceipt{razorpay_event_id: "evt_1", event_type: "subscription.charged"})
    end
  end

  test "billing event stores kind and seat delta" do
    business = insert(:business)

    event =
      Repo.insert!(%Event{
        business_id: business.id,
        kind: :seats_added,
        seat_delta: 3,
        occurred_at: DateTime.utc_now(:second)
      })

    assert event.kind == :seats_added
  end

  test "client status enum includes awaiting_seat" do
    assert :awaiting_seat in Ecto.Enum.values(Easy.Clients.Client, :status)
  end

  test "awaiting_seat client may be archived but not manually activated" do
    client = insert(:client, status: :awaiting_seat)

    assert Easy.Clients.Client.update_changeset(client, %{status: :archived}).valid?
    refute Easy.Clients.Client.update_changeset(client, %{status: :active}).valid?
  end
end
