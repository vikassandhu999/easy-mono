defmodule EasyWeb.Coaches.BillingControllerTest do
  use Easy.ConnCase, async: true

  import Easy.Factory
  import OpenApiSpex.TestAssertions

  setup do
    user = insert(:user)
    business = insert(:business, owner: user)
    coach = insert(:coach, user: user, business: business)
    conn = build_conn() |> authenticate_coach(coach) |> put_req_header("content-type", "application/json")

    %{conn: conn, coach: coach, business: business}
  end

  describe "GET /v1/coach/billing" do
    test "returns the seat summary with recent events", %{conn: conn, business: business} do
      insert(:client, business: business, status: :active)

      conn = get(conn, "/v1/coach/billing")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["free_seats"] == 2
      assert data["used_seats"] == 1
      assert data["seat_limit"] == 2
      assert data["is_owner"] == true
      assert is_list(data["recent_events"])
      # RM-002: rendered entity matches the OpenApiSpex schema
      assert_schema(data, "BillingSummary", EasyWeb.ApiSpec.spec())
    end
  end

  describe "POST /v1/coach/billing/checkout" do
    test "first purchase returns a checkout payload", %{conn: conn} do
      Req.Test.stub(Easy.Razorpay, fn req_conn ->
        Req.Test.json(req_conn, %{"id" => "sub_x", "plan_id" => "plan_test"})
      end)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/billing/checkout", %{seats_to_add: 2})

      assert %{"data" => %{"action" => "checkout", "checkout" => %{"subscription_id" => "sub_x"}}} =
               json_response(conn, 200)
    end

    test "non-owner coach gets 403", %{conn: _conn, business: business} do
      other_coach = insert(:coach, business: business)

      conn =
        build_conn()
        |> authenticate_coach(other_coach)
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/billing/checkout", %{seats_to_add: 2})

      assert json_response(conn, 403)
    end
  end

  describe "POST /v1/coach/billing/cancel" do
    test "schedules cancellation", %{conn: conn, business: business} do
      insert(:business_billing,
        business: business,
        paid_seats: 2,
        status: :active,
        razorpay_subscription_id: "sub_c"
      )

      Req.Test.stub(Easy.Razorpay, fn req_conn ->
        Req.Test.json(req_conn, %{"id" => "sub_c", "status" => "cancelled"})
      end)

      conn = conn |> put_req_header("content-type", "application/json") |> post("/v1/coach/billing/cancel")

      assert %{"data" => %{"status" => "cancel_at_period_end"}} = json_response(conn, 200)
    end
  end

  describe "seat-limit conflict on invite" do
    test "invite at the limit returns 409 with the seat summary", %{conn: conn, business: business} do
      insert(:client, business: business, status: :active)
      insert(:client, business: business, status: :active)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/clients/invite", params_for(:client_attrs))

      body = json_response(conn, 409)
      assert body["seat_summary"]["used_seats"] == 2
      assert body["seat_summary"]["available_seats"] == 0
      assert_schema(body["seat_summary"], "BillingSummary", EasyWeb.ApiSpec.spec())
    end
  end

  test "403 without auth token" do
    conn = build_conn() |> get("/v1/coach/billing")
    assert conn.status in [401, 403]
  end
end
