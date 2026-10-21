defmodule Easy.Razorpay.PayloadTest do
  use ExUnit.Case, async: true

  alias Easy.Razorpay.Payload

  test "normalizes provider fields and units for billing transitions" do
    period_end = DateTime.utc_now(:second)
    subscription = %{"id" => "sub_123", "quantity" => 5, "current_end" => DateTime.to_unix(period_end)}
    payment = %{"amount" => 120_099, "currency" => "INR"}

    assert {:ok,
            %{
              event: "subscription.charged",
              subscription: %{id: "sub_123", quantity: 5, status: nil, current_period_end: ^period_end},
              payment: %{amount_paid: 1200, currency: "INR"}
            }} =
             Payload.parse_webhook(%{
               "event" => "subscription.charged",
               "payload" => %{"subscription" => %{"entity" => subscription}, "payment" => %{"entity" => payment}}
             })

    assert {:ok, %{payment: %{amount_paid: nil, currency: nil}}} =
             Payload.parse_webhook(%{
               "event" => "subscription.charged",
               "payload" => %{"subscription" => %{"entity" => subscription}}
             })
  end

  test "rejects malformed recognized events before they reach state transitions" do
    for payload <- [
          nil,
          %{},
          %{"subscription" => %{"entity" => %{"id" => "sub_123", "quantity" => -1}}},
          %{"subscription" => %{"entity" => %{"id" => "sub_123"}}, "payment" => nil}
        ] do
      assert {:error, :invalid_webhook_payload} =
               Payload.parse_webhook(%{"event" => "subscription.charged", "payload" => payload})
    end
  end

  test "unknown events retain their receipt name without exposing unvalidated entities" do
    assert {:ok, %{event: "future.event", subscription: nil, payment: nil}} =
             Payload.parse_webhook(%{"event" => "future.event", "payload" => "unrecognized"})

    for invalid <- [nil, [], %{}, %{"event" => ""}, %{"event" => 1}] do
      assert {:error, :invalid_webhook_payload} = Payload.parse_webhook(invalid)
    end
  end
end
