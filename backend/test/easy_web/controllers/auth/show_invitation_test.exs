defmodule EasyWeb.Auth.ShowInvitationTest do
  use Easy.ConnCase

  describe "GET /v1/auth/invitations/:token" do
    test "returns pending state with business and coach details for a valid token" do
      coach = insert(:coach, first_name: "Rajat")
      business = coach.business

      insert(:client,
        business: business,
        creator: coach,
        email: "vikas@email.com",
        status: :pending,
        invitation_token: "pending-token-xyz",
        invitation_sent_at: DateTime.utc_now(:second),
        user: nil,
        user_id: nil
      )

      conn = build_conn() |> get("/v1/auth/invitations/pending-token-xyz")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["state"] == "pending"
      assert data["business_name"] == business.name
      assert data["coach_first_name"] == "Rajat"
      assert data["prefill_email"] == "vikas@email.com"
      assert data["expires_at"]
    end

    test "prefill_email is null when the pending client has no email (phone-only invite)" do
      coach = insert(:coach)

      insert(:client,
        business: coach.business,
        creator: coach,
        email: nil,
        phone: "+91 99999 11111",
        status: :pending,
        invitation_token: "phone-only-token",
        invitation_sent_at: DateTime.utc_now(:second),
        user: nil,
        user_id: nil
      )

      conn = build_conn() |> get("/v1/auth/invitations/phone-only-token")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["state"] == "pending"
      assert data["prefill_email"] == nil
    end

    test "coach_first_name falls back to 'Coach' when the coach has no first_name" do
      coach = insert(:coach, first_name: nil)

      insert(:client,
        business: coach.business,
        creator: coach,
        status: :pending,
        invitation_token: "nameless-coach-token",
        invitation_sent_at: DateTime.utc_now(:second),
        user: nil,
        user_id: nil
      )

      conn = build_conn() |> get("/v1/auth/invitations/nameless-coach-token")
      assert %{"data" => %{"coach_first_name" => "Coach"}} = json_response(conn, 200)
    end

    test "returns used state for an already-accepted invitation" do
      coach = insert(:coach)

      insert(:client,
        business: coach.business,
        creator: coach,
        status: :active,
        invitation_token: "used-token"
      )

      conn = build_conn() |> get("/v1/auth/invitations/used-token")
      assert %{"data" => %{"state" => "used"} = data} = json_response(conn, 200)

      # Do not leak business/coach details for non-pending states.
      refute Map.has_key?(data, "business_name")
      refute Map.has_key?(data, "coach_first_name")
      refute Map.has_key?(data, "prefill_email")
    end

    test "returns expired state for an invitation older than 30 days" do
      coach = insert(:coach)
      sent_at = DateTime.add(DateTime.utc_now(:second), -31, :day)

      insert(:client,
        business: coach.business,
        creator: coach,
        status: :pending,
        invitation_token: "expired-token",
        invitation_sent_at: sent_at,
        user: nil,
        user_id: nil
      )

      conn = build_conn() |> get("/v1/auth/invitations/expired-token")
      assert %{"data" => %{"state" => "expired"}} = json_response(conn, 200)
    end

    test "returns invalid state for an unknown token" do
      conn = build_conn() |> get("/v1/auth/invitations/nonexistent-token")
      assert %{"data" => %{"state" => "invalid"}} = json_response(conn, 200)
    end

    test "endpoint is public (no auth required)" do
      # No Authorization header in build_conn()
      conn = build_conn() |> get("/v1/auth/invitations/anything")
      assert json_response(conn, 200)
    end
  end
end
