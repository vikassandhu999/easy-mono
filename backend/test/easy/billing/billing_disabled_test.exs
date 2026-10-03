# async: false — mutates the global Easy.Razorpay app env.
defmodule Easy.BillingDisabledTest do
  use Easy.DataCase, async: false

  alias Easy.{Billing, Ctx}

  import Easy.Factory

  test "webhooks are rejected when the signing secret is unset or empty" do
    razorpay_config = Application.get_env(:easy, Easy.Razorpay)
    on_exit(fn -> Application.put_env(:easy, Easy.Razorpay, razorpay_config) end)

    body = Jason.encode!(%{"event" => "subscription.charged"})
    signature = :crypto.mac(:hmac, :sha256, "", body) |> Base.encode16(case: :lower)

    for secret <- [nil, ""] do
      Application.put_env(:easy, Easy.Razorpay, Keyword.put(razorpay_config, :webhook_secret, secret))

      assert {:error, :invalid_webhook_signature} =
               Billing.handle_razorpay_webhook(body, signature, "evt_disabled")
    end
  end

  test "checkout returns {:error, :billing_disabled} when Razorpay keys are unset" do
    razorpay_config = Application.get_env(:easy, Easy.Razorpay)
    on_exit(fn -> Application.put_env(:easy, Easy.Razorpay, razorpay_config) end)
    Application.put_env(:easy, Easy.Razorpay, Keyword.put(razorpay_config, :key_id, nil))

    business = insert(:business)

    assert {:error, :billing_disabled} = Billing.checkout(Ctx.new(business.id, business.owner_user_id), 1)
  end

  test "billing needs non-empty Razorpay credentials, a plan, and a price" do
    razorpay_config = Application.get_env(:easy, Easy.Razorpay)
    on_exit(fn -> Application.put_env(:easy, Easy.Razorpay, razorpay_config) end)

    business = insert(:business)
    ctx = Ctx.new(business.id, business.owner_user_id)

    unavailable_configs = [
      key_id: nil,
      key_id: "",
      key_secret: nil,
      key_secret: "",
      plan_id: nil,
      plan_id: "",
      seat_price_inr: nil
    ]

    for {key, value} <- unavailable_configs do
      Application.put_env(:easy, Easy.Razorpay, Keyword.put(razorpay_config, key, value))

      assert {:ok, summary} = Billing.get_billing(ctx)
      assert summary.monthly_seat_price_inr == nil
      assert summary.monthly_total_inr == nil
      refute summary.billing_enabled
      refute summary.can_add_seats
      refute summary.can_cancel
      refute summary.can_sync
      assert {:error, :billing_disabled} = Billing.checkout(ctx, 1)
      assert {:error, :billing_disabled} = Billing.cancel(ctx)
      assert {:error, :billing_disabled} = Billing.sync_billing(ctx)
    end
  end
end
