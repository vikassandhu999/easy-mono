defmodule EasyWeb.WebhookControllerTest do
  use Easy.ConnCase, async: true

  import Ecto.Query

  alias Easy.Billing.BusinessBilling
  alias Easy.Repo

  import Easy.Factory

  @secret "test_webhook_secret"

  defp billing_for(business_id), do: Repo.get_by!(BusinessBilling, business_id: business_id)

  defp sign(body), do: :crypto.mac(:hmac, :sha256, @secret, body) |> Base.encode16(case: :lower)

  defp post_webhook(conn, payload, opts \\ []) do
    body = Jason.encode!(payload)

    conn
    |> put_req_header("content-type", "application/json")
    |> put_req_header("x-razorpay-signature", Keyword.get(opts, :signature, sign(body)))
    |> put_req_header("x-razorpay-event-id", Keyword.get(opts, :event_id, "evt_#{System.unique_integer([:positive])}"))
    |> post("/v1/webhooks/razorpay", body)
  end

  defp charged_payload(sub_id, quantity, amount_paise) do
    %{
      "event" => "subscription.charged",
      "payload" => %{
        "subscription" => %{"entity" => %{"id" => sub_id, "quantity" => quantity, "current_end" => 1_790_000_000}},
        "payment" => %{"entity" => %{"amount" => amount_paise, "currency" => "INR"}}
      }
    }
  end

  setup do
    business = insert(:business, billing: build(:business_billing, business: nil, free_seats: 2))
    billing = business.billing |> Ecto.Changeset.change(razorpay_subscription_id: "sub_wh", status: :free) |> Easy.Repo.update!()
    %{business: business, billing: billing}
  end

  test "webhook signature is required", %{conn: conn} do
    conn = post_webhook(conn, charged_payload("sub_wh", 3, 149_700), signature: "bad")

    assert conn.status == 401
  end

  test "successful payment updates paid seats and writes billing events", %{conn: conn, business: business} do
    conn = post_webhook(conn, charged_payload("sub_wh", 3, 149_700))

    assert conn.status == 200
    billing = billing_for(business.id)
    assert billing.paid_seats == 3
    assert billing.status == :active
    assert billing.current_period_end
    assert BusinessBilling.seat_limit(billing_for(business.id)) == 5

    kinds = business.id |> events_for() |> Enum.map(& &1.kind)
    assert :payment_succeeded in kinds
    assert :seats_added in kinds
  end

  test "duplicate webhook is ignored", %{conn: conn, business: business} do
    payload = charged_payload("sub_wh", 3, 149_700)
    post_webhook(conn, payload, event_id: "evt_dup")
    conn2 = post_webhook(build_conn(), payload, event_id: "evt_dup")

    # acked 200, but applied once
    assert conn2.status == 200
    assert business.id |> events_for() |> Enum.count(&(&1.kind == :payment_succeeded)) == 1
  end

  test "payment success adds capacity without starting joined clients", %{conn: conn, business: business} do
    insert_list(2, :client, business: business)
    joined = insert(:client, business: business, terms: [])

    assert post_webhook(conn, charged_payload("sub_wh", 2, 99_800)).status == 200
    assert BusinessBilling.seat_limit(billing_for(business.id)) == 4
    assert Easy.CoachingTerms.used_seats(%Easy.Ctx{business_id: business.id, user_id: business.owner_user_id}) == {:ok, 2}

    assert %{"data" => %{"state" => "joined", "current_term" => nil, "terms" => []}} =
             build_conn() |> authenticate_client(joined) |> get("/v1/client/me") |> json_response(200)
  end

  test "payment failure sets past_due", %{conn: conn, business: business} do
    post_webhook(conn, charged_payload("sub_wh", 3, 149_700))

    conn2 =
      post_webhook(build_conn(), %{
        "event" => "subscription.pending",
        "payload" => %{"subscription" => %{"entity" => %{"id" => "sub_wh"}}}
      })

    assert conn2.status == 200
    billing = billing_for(business.id)
    assert billing.status == :past_due
    assert business.id |> events_for() |> Enum.any?(&(&1.kind == :payment_failed))
  end

  test "cancellation below usage clears paid seats but existing clients keep access", %{conn: conn, business: business} do
    active_clients = insert_list(3, :client, business: business)
    post_webhook(conn, charged_payload("sub_wh", 3, 149_700))

    conn2 =
      post_webhook(build_conn(), %{
        "event" => "subscription.cancelled",
        "payload" => %{"subscription" => %{"entity" => %{"id" => "sub_wh"}}}
      })

    assert conn2.status == 200
    billing = billing_for(business.id)
    assert billing.status == :cancelled
    assert billing.paid_seats == 0
    assert BusinessBilling.seat_limit(billing_for(business.id)) == 2
    assert Easy.CoachingTerms.used_seats(%Easy.Ctx{business_id: business.id, user_id: business.owner_user_id}) == {:ok, 3}

    for client <- active_clients do
      assert %{"data" => %{"state" => "active", "current_term" => %{"ends_on" => nil}}} =
               build_conn() |> authenticate_client(client) |> get("/v1/client/me") |> json_response(200)
    end
  end

  test "events for an unknown subscription are acked and ignored", %{conn: conn} do
    conn = post_webhook(conn, charged_payload("sub_unknown", 3, 100))

    assert conn.status == 200
  end

  test "a recognized event missing the subscription entity is rejected 422 and stays retryable", %{
    conn: conn,
    business: business
  } do
    event_id = "evt_malformed_retry"

    malformed = %{
      "event" => "subscription.charged",
      "payload" => %{"payment" => %{"entity" => %{"amount" => 100, "currency" => "INR"}}}
    }

    bad = post_webhook(conn, malformed, event_id: event_id)

    assert bad.status == 422
    billing = billing_for(business.id)
    assert billing.status == :free
    assert billing.paid_seats == 0
    assert events_for(business.id) == []

    # The receipt was rolled back (not claimed), so the same event id can be
    # retried once the payload is well-formed.
    good = post_webhook(build_conn(), charged_payload("sub_wh", 3, 149_700), event_id: event_id)

    assert good.status == 200
    assert billing_for(business.id).paid_seats == 3
  end

  test "a charge while cancellation is scheduled keeps cancel_at_period_end", %{conn: conn, business: business} do
    billing_for(business.id)
    |> Ecto.Changeset.change(status: :cancel_at_period_end)
    |> Repo.update!()

    post_webhook(conn, charged_payload("sub_wh", 3, 149_700))

    billing = billing_for(business.id)
    assert billing.status == :cancel_at_period_end
    assert billing.paid_seats == 3
  end

  defp events_for(business_id) do
    Repo.all(from(e in Easy.Billing.Event, where: e.business_id == ^business_id))
  end
end
