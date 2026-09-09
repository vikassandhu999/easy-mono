defmodule Easy.BillingWebhookValidationTest do
  use Easy.DataCase, async: true

  alias Easy.Billing
  alias Easy.Billing.{BusinessBilling, Event, WebhookReceipt}

  test "invalid subscription and payment fields leave billing and the receipt unchanged" do
    billing = insert(:business_billing, razorpay_subscription_id: "sub_fields", status: :free)
    event_id = "invalid-fields-#{Ecto.UUID.generate()}"
    payload = charged_payload()

    invalid_fields = [
      {"subscription", "id", 42},
      {"subscription", "id", ""},
      {"subscription", "quantity", "3"},
      {"subscription", "quantity", -1},
      {"subscription", "quantity", 2_147_483_648},
      {"subscription", "current_end", "tomorrow"},
      {"subscription", "current_end", 999_999_999_999_999},
      {"payment", "amount", "149700"},
      {"payment", "amount", -100},
      {"payment", "amount", 214_748_364_800},
      {"payment", "currency", []}
    ]

    for {entity, field, value} <- invalid_fields do
      invalid = put_in(payload, ["payload", entity, "entity", field], value)
      assert {:error, :invalid_webhook_payload} = deliver(invalid, event_id)
      refute Repo.get_by(WebhookReceipt, razorpay_event_id: event_id)
      assert Repo.get!(BusinessBilling, billing.id).status == :free
      assert Repo.get!(BusinessBilling, billing.id).paid_seats == 0
      refute Repo.exists?(from e in Event, where: e.business_id == ^billing.business_id)
    end

    assert :ok = deliver(payload, event_id)
    assert Repo.get!(BusinessBilling, billing.id).paid_seats == 3
    assert Repo.get_by(WebhookReceipt, razorpay_event_id: event_id)
  end

  test "recognized events require a subscription payload even when the payload key is absent" do
    for event <- ~w(subscription.charged subscription.pending subscription.halted subscription.cancelled subscription.updated),
        payload <- [%{"event" => event}, %{"event" => event, "payload" => []}] do
      assert {:error, :invalid_webhook_payload} = deliver(payload, Ecto.UUID.generate())
    end
  end

  test "signed JSON requires an object with a nonempty string event before claiming a receipt" do
    event_id = "invalid-shape-#{Ecto.UUID.generate()}"

    for payload <- [nil, [], 42, "event", %{}, %{"event" => nil}, %{"event" => []}, %{"event" => ""}] do
      body = Jason.encode!(payload)

      signature =
        :crypto.mac(:hmac, :sha256, "test_webhook_secret", body)
        |> Base.encode16(case: :lower)

      assert {:error, :invalid_webhook_payload} = Billing.handle_razorpay_webhook(body, signature, event_id)
      refute Repo.get_by(WebhookReceipt, razorpay_event_id: event_id)
    end
  end

  defp charged_payload do
    %{
      "event" => "subscription.charged",
      "payload" => %{
        "subscription" => %{"entity" => %{"id" => "sub_fields", "quantity" => 3}},
        "payment" => %{"entity" => %{"amount" => 149_700, "currency" => "INR"}}
      }
    }
  end

  defp deliver(payload, event_id) do
    body = Jason.encode!(payload)
    signature = :crypto.mac(:hmac, :sha256, "test_webhook_secret", body) |> Base.encode16(case: :lower)
    Billing.handle_razorpay_webhook(body, signature, event_id)
  end
end
