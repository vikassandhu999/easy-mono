defmodule EasyWeb.Auth.AcceptInviteTest do
  use Easy.ConnCase

  describe "POST /v1/auth/accept-invite" do
    test "accepts invitation with same email as invite" do
      coach = insert(:coach)

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          email: "invited@test.com",
          status: :pending,
          invitation_token: "test-invite-token-123",
          invitation_sent_at: DateTime.utc_now(:second),
          user: nil,
          user_id: nil
        )

      conn =
        build_conn()
        |> post("/v1/auth/accept-invite", %{
          "invitation_token" => "test-invite-token-123",
          "email" => "invited@test.com"
        })

      assert %{"id" => _user_id, "email" => "invited@test.com"} = json_response(conn, 201)

      updated_client = Easy.Repo.get!(Easy.Clients.Client, client.id)
      assert updated_client.status == :active
      assert is_nil(updated_client.invitation_token)
      assert not is_nil(updated_client.user_id)
    end

    test "accepts invitation with a different email than invite" do
      coach = insert(:coach)

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          email: "work@company.com",
          status: :pending,
          invitation_token: "diff-email-token",
          invitation_sent_at: DateTime.utc_now(:second),
          user: nil,
          user_id: nil
        )

      conn =
        build_conn()
        |> post("/v1/auth/accept-invite", %{
          "invitation_token" => "diff-email-token",
          "email" => "personal@gmail.com"
        })

      assert %{"id" => _user_id, "email" => "personal@gmail.com"} = json_response(conn, 201)

      updated_client = Easy.Repo.get!(Easy.Clients.Client, client.id)
      assert updated_client.status == :active
      assert not is_nil(updated_client.user_id)
    end

    test "links to existing confirmed user when email matches" do
      coach = insert(:coach)

      user =
        insert(:user, email: "existing@test.com", email_confirmed_at: DateTime.utc_now(:second))

      _client =
        insert(:client,
          business: coach.business,
          creator: coach,
          email: "work@company.com",
          status: :pending,
          invitation_token: "existing-user-token",
          invitation_sent_at: DateTime.utc_now(:second),
          user: nil,
          user_id: nil
        )

      conn =
        build_conn()
        |> post("/v1/auth/accept-invite", %{
          "invitation_token" => "existing-user-token",
          "email" => "existing@test.com"
        })

      assert %{"id" => user_id, "email_confirmed" => true} = json_response(conn, 201)
      assert user_id == user.id
    end

    test "returns error for invalid token" do
      conn =
        build_conn()
        |> post("/v1/auth/accept-invite", %{
          "invitation_token" => "nonexistent-token",
          "email" => "test@test.com"
        })

      assert json_response(conn, 404)
    end

    test "returns error for already-accepted invitation" do
      coach = insert(:coach)

      _client =
        insert(:client,
          business: coach.business,
          creator: coach,
          status: :active,
          invitation_token: nil
        )

      conn =
        build_conn()
        |> post("/v1/auth/accept-invite", %{
          "invitation_token" => "some-token",
          "email" => "test@test.com"
        })

      assert json_response(conn, 404)
    end
  end
end
