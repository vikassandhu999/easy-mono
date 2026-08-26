defmodule EasyWeb.Coaches.BillingControllerTest do
  use Easy.ConnCase, async: true

  import Easy.Factory

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

      Easy.Repo.insert!(%Easy.Billing.Event{
        business_id: business.id,
        kind: :payment_failed,
        occurred_at: DateTime.utc_now(:second)
      })

      conn = get(conn, "/v1/coach/billing")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["free_seats"] == 10
      assert data["used_seats"] == 1
      assert data["seat_limit"] == 10
      assert data["is_owner"] == true
      assert [event] = data["recent_events"]

      assert event == %{
               "amount_paid" => nil,
               "currency" => nil,
               "id" => event["id"],
               "kind" => "payment_failed",
               "occurred_at" => event["occurred_at"],
               "seat_delta" => nil
             }
    end

    test "returns signed available seats when usage exceeds the limit", %{conn: conn, business: business} do
      insert(:business_billing, business: business, free_seats: 0, paid_seats: 0)
      insert(:client, business: business, status: :active)

      assert %{"data" => %{"available_seats" => -1}} =
               conn |> get("/v1/coach/billing") |> json_response(200)
    end
  end

  describe "POST /v1/coach/billing/checkout" do
    test "rejects missing, invalid, excessive, and unknown checkout fields", %{conn: conn} do
      invalid_bodies = [
        {%{}, "seats_to_add", "is required"},
        {%{seats_to_add: 0}, "seats_to_add", "is invalid"},
        {%{seats_to_add: -1}, "seats_to_add", "is invalid"},
        {%{seats_to_add: "two"}, "seats_to_add", "is invalid"},
        {%{seats_to_add: 101}, "seats_to_add", "must be less than or equal to 100"},
        {%{seats_to_add: 1, unexpected: true}, "unexpected", "is unknown"}
      ]

      for {body, field, message} <- invalid_bodies do
        response = conn |> post("/v1/coach/billing/checkout", body) |> json_response(422)

        assert %{"error_code" => "invalid_input", "error_detail" => %{"fields" => fields}} = response
        assert fields[field] == [message]
      end
    end

    test "first purchase returns a checkout payload", %{conn: conn} do
      Req.Test.stub(Easy.Razorpay, fn req_conn ->
        Req.Test.json(req_conn, %{"id" => "sub_x", "plan_id" => "plan_test"})
      end)

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/billing/checkout", %{seats_to_add: 2})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["action"] == "checkout"
      assert data["checkout"] == %{"key_id" => "rzp_test_key", "subscription_id" => "sub_x"}
      assert data["billing"]["status"] == "free"
      assert data["billing"]["recent_events"] == nil
    end

    test "an active subscription returns the updated discriminant without checkout", %{
      conn: conn,
      business: business
    } do
      insert(:business_billing,
        business: business,
        paid_seats: 2,
        status: :active,
        razorpay_subscription_id: "sub_active"
      )

      Req.Test.stub(Easy.Razorpay, fn req_conn ->
        Req.Test.json(req_conn, %{"id" => "sub_active", "quantity" => 3, "status" => "active"})
      end)

      assert %{
               "data" => %{
                 "action" => "updated",
                 "checkout" => nil,
                 "billing" => %{"paid_seats" => 3, "recent_events" => nil, "status" => "active"}
               }
             } =
               conn
               |> post("/v1/coach/billing/checkout", %{seats_to_add: 1})
               |> json_response(200)
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
    test "rejects a non-empty body", %{conn: conn, business: business} do
      insert(:business_billing,
        business: business,
        paid_seats: 2,
        status: :active,
        razorpay_subscription_id: "sub_c"
      )

      Req.Test.stub(Easy.Razorpay, fn req_conn ->
        Req.Test.json(req_conn, %{"id" => "sub_c", "status" => "cancelled"})
      end)

      response = conn |> post("/v1/coach/billing/cancel", %{unexpected: true}) |> json_response(422)

      assert response["error_detail"]["fields"]["$"] == ["must be empty"]
    end

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

      conn = post(conn, "/v1/coach/billing/cancel", %{})

      assert %{"data" => %{"recent_events" => nil, "status" => "cancel_at_period_end"}} =
               json_response(conn, 200)
    end
  end

  describe "POST /v1/coach/billing/sync" do
    test "rejects a non-empty body", %{conn: conn} do
      response = conn |> post("/v1/coach/billing/sync", %{unexpected: true}) |> json_response(422)

      assert response["error_detail"]["fields"]["$"] == ["must be empty"]
    end

    test "reconciles from Razorpay and renders the summary", %{conn: conn, business: business} do
      insert(:business_billing,
        business: business,
        status: :free,
        paid_seats: 0,
        razorpay_subscription_id: "sub_sync"
      )

      Req.Test.stub(Easy.Razorpay, fn req_conn ->
        Req.Test.json(req_conn, %{
          "id" => "sub_sync",
          "status" => "active",
          "quantity" => 3,
          "current_end" => 1_790_000_000
        })
      end)

      conn = post(conn, "/v1/coach/billing/sync")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "active"
      assert data["paid_seats"] == 3
      assert is_list(data["recent_events"])
    end

    test "non-owner coach gets 403", %{business: business} do
      other_coach = insert(:coach, business: business)

      conn =
        build_conn()
        |> authenticate_coach(other_coach)
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/billing/sync")

      assert json_response(conn, 403)
    end
  end

  describe "seat-limit conflict on invite" do
    test "invite at the limit returns 409 with the seat summary", %{conn: conn, business: business} do
      insert(:business_billing, business: business, free_seats: 2)
      insert(:client, business: business, status: :active)
      insert(:client, business: business, status: :active)

      Easy.Repo.insert!(%Easy.Billing.Event{
        business_id: business.id,
        kind: :seats_added,
        seat_delta: 1,
        occurred_at: DateTime.utc_now(:second)
      })

      conn =
        conn
        |> put_req_header("content-type", "application/json")
        |> post("/v1/coach/clients/invite", params_for(:client_attrs))

      body = json_response(conn, 409)
      assert body["seat_summary"]["used_seats"] == 2
      assert body["seat_summary"]["available_seats"] == 0
      refute Map.has_key?(body["seat_summary"], "recent_events")
    end
  end

  test "403 without auth token" do
    conn = build_conn() |> get("/v1/coach/billing")
    assert conn.status in [401, 403]
  end
end
