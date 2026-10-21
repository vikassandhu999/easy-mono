defmodule EasyWeb.Auth.ShowInvitationTest do
  use Easy.ConnCase

  describe "GET /v1/auth/invitations/:token" do
    test "returns pending state with business and coach details for a valid token" do
      coach = insert(:coach, full_name: "Rajat Sharma")
      business = coach.business

      insert(:client,
        business: business,
        coach: coach,
        email: "vikas@email.com",
        invite_token: "pending-token-xyz",
        invited_at: DateTime.utc_now(:second),
        user: nil,
        user_id: nil
      )

      conn = build_conn() |> get("/v1/auth/invitations/pending-token-xyz")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["state"] == "pending"
      assert data["business_name"] == business.name
      assert data["coach_name"] == "Rajat Sharma"
      assert data["prefill_email"] == "vikas@email.com"
      assert data["expires_at"]
    end

    test "coach preview uses the preferred name when set" do
      coach = insert(:coach, full_name: "Rajat Sharma", preferred_name: "Raj")

      insert(:client,
        business: coach.business,
        coach: coach,
        invite_token: "nameless-coach-token",
        invited_at: DateTime.utc_now(:second),
        user: nil,
        user_id: nil
      )

      conn = build_conn() |> get("/v1/auth/invitations/nameless-coach-token")
      assert %{"data" => %{"coach_name" => "Raj"}} = json_response(conn, 200)
    end

    test "returns used state for an already-accepted invitation" do
      coach = insert(:coach)

      insert(:client,
        business: coach.business,
        coach: coach,
        invite_token: "used-token"
      )

      conn = build_conn() |> get("/v1/auth/invitations/used-token")
      assert %{"data" => %{"state" => "used"} = data} = json_response(conn, 200)

      # Do not leak business/coach details for non-pending states.
      refute Map.has_key?(data, "business_name")
      refute Map.has_key?(data, "coach_name")
      refute Map.has_key?(data, "prefill_email")
    end

    test "returns expired state for an invitation older than 30 days" do
      coach = insert(:coach)
      sent_at = DateTime.add(DateTime.utc_now(:second), -31, :day)

      insert(:client,
        business: coach.business,
        coach: coach,
        invite_token: "expired-token",
        invited_at: sent_at,
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
