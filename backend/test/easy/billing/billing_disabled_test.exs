# async: false — mutates the global Easy.Razorpay app env.
defmodule Easy.BillingDisabledTest do
  use Easy.DataCase, async: false

  alias Easy.{Billing, Ctx}

  import Easy.Factory

  test "checkout returns {:error, :billing_disabled} when Razorpay keys are unset" do
    razorpay_config = Application.get_env(:easy, Easy.Razorpay)
    on_exit(fn -> Application.put_env(:easy, Easy.Razorpay, razorpay_config) end)
    Application.put_env(:easy, Easy.Razorpay, Keyword.put(razorpay_config, :key_id, nil))

    business = insert(:business)

    assert {:error, :billing_disabled} = Billing.checkout(Ctx.new(business.id, business.owner_id), 1)
  end
end
