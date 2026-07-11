defmodule EasyWeb.WebhookControllerTest do
  use Easy.ConnCase, async: true

  import Ecto.Query

  alias Easy.Billing.BusinessBilling
  alias Easy.Clients.Client
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
    business = insert(:business)
    billing = insert(:business_billing, business: business, razorpay_subscription_id: "sub_wh", status: :free)
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

  test "payment success activates awaiting_seat clients", %{conn: conn, business: business} do
    insert(:client, business: business, status: :active)
    insert(:client, business: business, status: :active)
    waiting = insert(:client, business: business, status: :inactive, inactive_reason: :awaiting_seat)

    post_webhook(conn, charged_payload("sub_wh", 2, 99_800))

    assert Repo.get!(Client, waiting.id).status == :active
    assert Repo.get!(Client, waiting.id).inactive_reason == nil
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

  test "cancellation clears paid seats but existing clients keep access", %{conn: conn, business: business} do
    active = insert(:client, business: business, status: :active)
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
    assert Repo.get!(Client, active.id).status == :active
  end

  test "events for an unknown subscription are acked and ignored", %{conn: conn} do
    conn = post_webhook(conn, charged_payload("sub_unknown", 3, 100))

    assert conn.status == 200
  end

  test "a payload missing the subscription entity is acked 200 and writes no billing state", %{
    conn: conn,
    business: business
  } do
    conn =
      post_webhook(conn, %{
        "event" => "subscription.charged",
        "payload" => %{"payment" => %{"entity" => %{"amount" => 100, "currency" => "INR"}}}
      })

    assert conn.status == 200
    billing = billing_for(business.id)
    assert billing.status == :free
    assert billing.paid_seats == 0
    assert events_for(business.id) == []
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
