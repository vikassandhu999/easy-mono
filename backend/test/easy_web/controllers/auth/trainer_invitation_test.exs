defmodule EasyWeb.Auth.TrainerInvitationTest do
  use Easy.ConnCase, async: false

  setup do
    Application.put_env(:easy, :fixed_otp, "123456")
    on_exit(fn -> Application.delete_env(:easy, :fixed_otp) end)
    :ok
  end

  defp invited_coach(attrs \\ %{}) do
    insert(
      :coach,
      Map.merge(
        %{
          user: nil,
          email: "trainer-#{System.unique_integer([:positive])}@test.com",
          full_name: "Tara Trainer",
          invite_token: "trainer-tok-#{System.unique_integer([:positive])}",
          invited_at: DateTime.utc_now(:second)
        },
        attrs
      )
    )
  end

  describe "GET /v1/auth/trainer-invitations/:token" do
    test "returns invitation details for a valid token" do
      coach = invited_coach()
      business = coach.business

      conn = build_conn() |> get("/v1/auth/trainer-invitations/#{coach.invite_token}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["business_name"] == business.name
      assert data["email"] == coach.email
      assert data["full_name"] == coach.full_name
    end

    test "returns 404 for an unknown token" do
      conn = build_conn() |> get("/v1/auth/trainer-invitations/nonexistent-token")
      assert json_response(conn, 404)
    end

    test "an accepted invitation's cleared token no longer resolves" do
      coach = invited_coach(%{invite_token: "used-trainer-token"})
      assert {:ok, accepted} = Easy.CoachInvitations.accept_invite(coach, insert(:user).id)
      assert accepted.invite_token == nil

      conn = build_conn() |> get("/v1/auth/trainer-invitations/used-trainer-token")
      assert json_response(conn, 404)
    end

    test "returns 410 for an expired invitation" do
      coach = invited_coach(%{invited_at: DateTime.add(DateTime.utc_now(:second), -31, :day)})

      conn = build_conn() |> get("/v1/auth/trainer-invitations/#{coach.invite_token}")
      assert json_response(conn, 410)
    end
  end

  describe "POST /v1/auth/trainer-accept-invite + verify" do
    test "sends an OTP then verifies and returns auth tokens" do
      coach = invited_coach()

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> post("/v1/auth/trainer-accept-invite", %{
          "invitation_token" => coach.invite_token,
          "email" => coach.email
        })

      assert %{"message" => _} = json_response(conn, 200)

      verify_conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> post("/v1/auth/trainer-accept-invite/verify", %{
          "invitation_token" => coach.invite_token,
          "email" => coach.email,
          "otp" => "123456"
        })

      assert %{"access_token" => _, "refresh_token" => _, "scope" => "coach"} =
               json_response(verify_conn, 200)

      updated = Easy.Repo.get!(Easy.Orgs.Coach, coach.id)
      assert updated.user_id
      assert is_nil(updated.invite_token)
      assert updated.user_id
    end
  end
end
