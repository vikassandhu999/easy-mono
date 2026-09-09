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

    assert {:error, :billing_disabled} = Billing.checkout(Ctx.new(business.id, business.owner_id), 1)
  end
end
