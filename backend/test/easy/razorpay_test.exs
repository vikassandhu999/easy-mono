defmodule Easy.RazorpayTest do
  use ExUnit.Case, async: true

  alias Easy.Razorpay

  test "create_subscription posts plan and quantity, returns body on 2xx" do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      assert conn.method == "POST"
      assert conn.request_path == "/v1/subscriptions"
      Req.Test.json(conn, %{"id" => "sub_123", "plan_id" => "plan_test", "quantity" => 3})
    end)

    assert {:ok, %{"id" => "sub_123"}} = Razorpay.create_subscription(3)
  end

  test "non-2xx normalizes to :razorpay_error" do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      conn |> Plug.Conn.put_status(400) |> Req.Test.json(%{"error" => %{"description" => "bad"}})
    end)

    assert {:error, :razorpay_error} = Razorpay.create_subscription(1)
  end

  test "transport error normalizes to :razorpay_error" do
    Req.Test.stub(Easy.Razorpay, fn conn -> Req.Test.transport_error(conn, :econnrefused) end)

    assert {:error, :razorpay_error} = Razorpay.create_subscription(1)
  end

  test "update and cancel hit the right paths" do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      case {conn.method, conn.request_path} do
        {"PATCH", "/v1/subscriptions/sub_1"} -> Req.Test.json(conn, %{"id" => "sub_1", "quantity" => 5})
        {"POST", "/v1/subscriptions/sub_1/cancel"} -> Req.Test.json(conn, %{"id" => "sub_1", "status" => "cancelled"})
      end
    end)

    assert {:ok, %{"quantity" => 5}} = Razorpay.update_subscription_quantity("sub_1", 5)
    assert {:ok, _} = Razorpay.cancel_subscription_at_period_end("sub_1")
  end

  test "webhook signature verification" do
    body = ~s({"event":"subscription.charged"})
    good = :crypto.mac(:hmac, :sha256, "test_webhook_secret", body) |> Base.encode16(case: :lower)

    assert Razorpay.valid_webhook_signature?(body, good)
    refute Razorpay.valid_webhook_signature?(body, "deadbeef")
    refute Razorpay.valid_webhook_signature?(body, nil)
  end
end
