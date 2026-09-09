defmodule Easy.Billing.TransactionTest do
  use Easy.DataCase, async: false

  alias Easy.Billing
  alias Easy.Billing.{BusinessBilling, Event, WebhookReceipt}
  alias Easy.Clients.Client
  alias Easy.Ctx

  for {operation, kind} <- [checkout: :seats_added, cancel: :cancellation_scheduled, sync: :seats_added] do
    test "#{operation} rolls back local writes when its event fails after provider success" do
      business = insert(:business)

      billing =
        insert(:business_billing,
          business: business,
          status: :active,
          paid_seats: 1,
          razorpay_subscription_id: "sub_rollback"
        )

      before = Repo.get!(BusinessBilling, billing.id)
      reject_event(unquote(kind))
      parent = self()

      Req.Test.stub(Easy.Razorpay, fn conn ->
        send(parent, {:provider_called, conn.method, conn.request_path})
        Req.Test.json(conn, %{id: "sub_rollback", quantity: 2, status: "active"})
      end)

      ctx = Ctx.new(business.id, business.owner_id)

      result =
        case unquote(operation) do
          :checkout -> Billing.checkout(ctx, 1)
          :cancel -> Billing.cancel(ctx)
          :sync -> Billing.sync_billing(ctx)
        end

      assert {:error, %Ecto.Changeset{}} = result
      assert_received {:provider_called, _, _}
      assert Repo.get!(BusinessBilling, billing.id) == before
      refute Repo.exists?(Event.for_business(business.id))
    end
  end

  test "a failed payment event rolls back the charge and leaves the webhook retryable" do
    business = insert(:business)
    billing = insert(:business_billing, business: business, free_seats: 0, razorpay_subscription_id: "sub_rollback")
    client = insert(:client, business: business, status: :inactive, inactive_reason: :awaiting_seat)
    before = Repo.get!(BusinessBilling, billing.id)
    event_id = Ecto.UUID.generate()
    reject_event(:payment_succeeded)

    assert {:error, %Ecto.Changeset{}} = charged_webhook(event_id)
    assert Repo.get!(BusinessBilling, billing.id) == before
    assert Repo.get!(Client, client.id).status == :inactive
    assert Repo.get!(Client, client.id).inactive_reason == :awaiting_seat
    refute Repo.exists?(Event.for_business(business.id))
    refute Repo.get_by(WebhookReceipt, razorpay_event_id: event_id)

    Repo.query!("DROP TRIGGER reject_test_billing_event ON billing_events")

    assert :ok = charged_webhook(event_id)
    assert Repo.get!(BusinessBilling, billing.id).paid_seats == 1
    assert Repo.get!(Client, client.id).status == :active
    assert Repo.aggregate(Event.for_business(business.id), :count, :id) == 2
    assert Repo.get_by!(WebhookReceipt, razorpay_event_id: event_id)
  end

  defp reject_event(kind) do
    # Test-local DDL rolls back with the sandbox transaction.
    Repo.query!("""
    CREATE FUNCTION pg_temp.reject_test_billing_event() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION 'test billing event failure'
        USING ERRCODE = '23503', CONSTRAINT = 'billing_events_business_id_fkey';
    END;
    $$;
    """)

    Repo.query!("""
    CREATE TRIGGER reject_test_billing_event BEFORE INSERT ON billing_events
    FOR EACH ROW WHEN (NEW.kind = '#{kind}')
    EXECUTE FUNCTION pg_temp.reject_test_billing_event()
    """)
  end

  defp charged_webhook(event_id) do
    body =
      Jason.encode!(%{
        event: "subscription.charged",
        payload: %{subscription: %{entity: %{id: "sub_rollback", quantity: 1}}}
      })

    signature = :crypto.mac(:hmac, :sha256, "test_webhook_secret", body) |> Base.encode16(case: :lower)
    Billing.handle_razorpay_webhook(body, signature, event_id)
  end
end
