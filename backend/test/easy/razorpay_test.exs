defmodule Easy.RazorpayTest do
  use ExUnit.Case, async: true

  alias Easy.Razorpay

  import ExUnit.CaptureLog

  test "a successful HTTP status with a non-object body is a provider error" do
    for body <- [nil, [], "upstream maintenance", 123] do
      Req.Test.stub(Easy.Razorpay, fn conn -> Req.Test.json(conn, body) end)

      assert capture_log(fn ->
               assert {:error, :razorpay_error} = Razorpay.get_subscription("sub_1")
             end) =~ "unexpected response status=200"
    end
  end

  test "provider error bodies do not enter application logs" do
    Req.Test.stub(Easy.Razorpay, fn conn ->
      conn
      |> Plug.Conn.put_status(400)
      |> Req.Test.json(%{"error" => %{"description" => "sensitive-customer-data"}})
    end)

    log = capture_log(fn -> assert {:error, :razorpay_error} = Razorpay.create_subscription(1) end)
    assert log =~ "status=400"
    refute log =~ "sensitive-customer-data"
  end

  test "create_subscription returns a normalized subscription on 2xx" do
    period_end = DateTime.utc_now(:second)

    Req.Test.stub(Easy.Razorpay, fn conn ->
      assert conn.method == "POST"
      assert conn.request_path == "/v1/subscriptions"

      Req.Test.json(conn, %{
        "id" => "sub_123",
        "plan_id" => "plan_test",
        "quantity" => 3,
        "status" => "created",
        "current_end" => DateTime.to_unix(period_end),
        "provider_only_field" => "not part of the application contract"
      })
    end)

    assert Razorpay.create_subscription(3) ==
             {:ok, %{id: "sub_123", plan_id: "plan_test", quantity: 3, status: "created", current_period_end: period_end}}
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

    assert {:ok, %{quantity: 5}} = Razorpay.update_subscription_quantity("sub_1", 5)
    assert {:ok, _} = Razorpay.cancel_subscription_at_period_end("sub_1")
  end

  test "read, update, and cancellation reject a response for another subscription" do
    Req.Test.stub(Easy.Razorpay, fn conn -> Req.Test.json(conn, %{"id" => "sub_someone_else"}) end)

    capture_log(fn ->
      assert {:error, :razorpay_error} = Razorpay.get_subscription("sub_1")
      assert {:error, :razorpay_error} = Razorpay.update_subscription_quantity("sub_1", 5)
      assert {:error, :razorpay_error} = Razorpay.cancel_subscription_at_period_end("sub_1")
    end)
  end

  test "webhook signature verification" do
    body = ~s({"event":"subscription.charged"})
    good = :crypto.mac(:hmac, :sha256, "test_webhook_secret", body) |> Base.encode16(case: :lower)

    assert Razorpay.valid_webhook_signature?(body, good)
    refute Razorpay.valid_webhook_signature?(body, "deadbeef")
    refute Razorpay.valid_webhook_signature?(body, nil)
  end
end
