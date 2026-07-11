defmodule EasyWeb.Auth.AcceptInviteTest do
  use Easy.ConnCase

  alias Easy.Clients.Client
  alias Easy.Identity.OneTimeToken
  alias Easy.Identity.OneTimeTokens
  alias Easy.Identity.User
  alias Easy.Identity.Users
  alias Easy.Repo

  import Ecto.Query

  @valid_token "valid-invite-token-xyz"

  defp json_conn do
    Phoenix.ConnTest.build_conn()
    |> put_req_header("content-type", "application/json")
  end

  defp insert_pending_client(opts \\ []) do
    coach = opts[:coach] || insert(:coach)

    attrs =
      [
        business: coach.business,
        creator: coach,
        email: "invited@test.com",
        status: :pending,
        invitation_token: @valid_token,
        invitation_sent_at: DateTime.utc_now(:second),
        user: nil,
        user_id: nil
      ]
      |> Keyword.merge(Keyword.drop(opts, [:coach]))

    insert(:client, attrs)
  end

  defp request_otp(token, email) do
    json_conn()
    |> post("/v1/auth/accept-invite", %{
      "invitation_token" => token,
      "email" => email
    })
  end

  defp last_otp_for(email) do
    # Tests can't read the actual OTP from the email, so for testing verify-phase
    # we generate a known OTP out-of-band by seeding the OneTimeToken directly.
    Repo.one(
      from(t in OneTimeToken,
        where: t.relates_to == ^email and t.token_type == ^:invitation_acceptance,
        order_by: [desc: t.inserted_at],
        limit: 1
      )
    )
  end

  # Helper that seeds a known OTP deterministically for verify-phase tests.
  defp seed_invitation_otp(email, invitation_token, otp) do
    {:ok, _} =
      OneTimeTokens.create_invitation_acceptance_token(otp, email, invitation_token)
  end

  describe "POST /v1/auth/accept-invite (request phase)" do
    test "returns 200 and sends OTP for a valid pending invitation" do
      client = insert_pending_client()
      conn = request_otp(@valid_token, "invited@test.com")

      assert %{"message" => _} = json_response(conn, 200)

      # The Client is NOT mutated — still pending, no user_id set.
      unchanged = Repo.get!(Client, client.id)
      assert unchanged.status == :pending
      assert is_nil(unchanged.user_id)
      assert unchanged.email == "invited@test.com"

      # A one_time_token was persisted.
      assert %OneTimeToken{token_type: :invitation_acceptance} = last_otp_for("invited@test.com")
    end

    test "sends OTP when client accepts with a different email than coach entered" do
      client = insert_pending_client(email: "work@company.com")
      conn = request_otp(@valid_token, "personal@gmail.com")

      assert json_response(conn, 200)

      # Client's email NOT overwritten at request phase.
      unchanged = Repo.get!(Client, client.id)
      assert unchanged.email == "work@company.com"
      assert unchanged.status == :pending

      # OTP is bound to the accepted (personal) email.
      assert %OneTimeToken{} = last_otp_for("personal@gmail.com")
      refute last_otp_for("work@company.com")
    end

    test "sends OTP when email matches an existing confirmed user" do
      insert(:user,
        email: "existing@test.com",
        email_confirmed_at: DateTime.utc_now(:second)
      )

      insert_pending_client(email: "work@company.com")
      conn = request_otp(@valid_token, "existing@test.com")

      assert json_response(conn, 200)
    end

    test "returns 404 for invalid/unknown token" do
      conn = request_otp("nonexistent-token", "test@test.com")
      assert %{"error_code" => "invitation_invalid"} = json_response(conn, 404)
    end

    test "returns 410 (used) for a previously-accepted invitation" do
      coach = insert(:coach)

      insert(:client,
        business: coach.business,
        creator: coach,
        status: :active,
        invitation_token: "used-token"
      )

      conn = request_otp("used-token", "test@test.com")
      assert %{"error_code" => "invitation_used"} = json_response(conn, 410)
    end

    test "returns 410 (expired) when invitation is older than 30 days" do
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

      conn = request_otp("expired-token", "test@test.com")
      assert %{"error_code" => "invitation_expired"} = json_response(conn, 410)
    end

    test "does not leak whether the email maps to an already-active client elsewhere" do
      # Privacy: a public endpoint must not tell an unauthenticated caller whether
      # an email belongs to any active client. The "one active Client per User"
      # check is enforced at verify time, once OTP proves email ownership.
      user = insert(:user, email: "vikas@test.com")
      other_coach = insert(:coach)

      insert(:client,
        business: other_coach.business,
        creator: other_coach,
        user: user,
        status: :active
      )

      insert_pending_client(email: "whatever@test.com")
      conn = request_otp(@valid_token, "vikas@test.com")

      # Request phase responds the same whether or not the email is in use.
      assert json_response(conn, 200)
    end

    test "re-requesting OTP invalidates the prior one for the same email" do
      insert_pending_client()

      _ = request_otp(@valid_token, "invited@test.com")
      first = last_otp_for("invited@test.com")

      _ = request_otp(@valid_token, "invited@test.com")
      second = last_otp_for("invited@test.com")

      assert second.id != first.id
      # Old token row is deleted.
      refute Repo.get(OneTimeToken, first.id)
    end
  end

  describe "POST /v1/auth/accept-invite/verify" do
    test "verifies OTP, flips client to active, and returns an auth token" do
      client = insert_pending_client()
      seed_invitation_otp("invited@test.com", @valid_token, "111222")

      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "invited@test.com",
          "otp" => "111222"
        })

      assert %{
               "access_token" => _,
               "refresh_token" => _,
               "token_type" => "Bearer",
               "scope" => "client"
             } = json_response(conn, 200)

      updated = Repo.get!(Client, client.id)
      assert updated.status == :active
      assert updated.email == "invited@test.com"
      assert not is_nil(updated.user_id)
    end

    test "overwrites client.email with the accepted email when they differ" do
      client = insert_pending_client(email: "work@company.com")
      seed_invitation_otp("personal@gmail.com", @valid_token, "222333")

      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "personal@gmail.com",
          "otp" => "222333"
        })

      assert json_response(conn, 200)

      updated = Repo.get!(Client, client.id)
      assert updated.email == "personal@gmail.com"
    end

    test "links to an existing confirmed user without creating a duplicate" do
      user =
        insert(:user,
          email: "existing@test.com",
          email_confirmed_at: DateTime.utc_now(:second)
        )

      client = insert_pending_client(email: "work@company.com")
      seed_invitation_otp("existing@test.com", @valid_token, "333444")

      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "existing@test.com",
          "otp" => "333444"
        })

      assert json_response(conn, 200)

      updated = Repo.get!(Client, client.id)
      assert updated.user_id == user.id

      # No new User was created.
      assert Repo.aggregate(
               from(u in User, where: u.email == ^"existing@test.com"),
               :count
             ) == 1
    end

    test "confirms an existing unconfirmed user's email as a side effect" do
      user =
        insert(:user, email: "unconfirmed@test.com", email_confirmed_at: nil)

      refute User.email_confirmed?(user)

      insert_pending_client()
      seed_invitation_otp("unconfirmed@test.com", @valid_token, "444555")

      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "unconfirmed@test.com",
          "otp" => "444555"
        })

      assert json_response(conn, 200)

      refreshed = Repo.get!(User, user.id)
      assert User.email_confirmed?(refreshed)
    end

    test "creates a new confirmed user when the email is unknown" do
      insert_pending_client(first_name: "Vikas", last_name: "K.")
      seed_invitation_otp("brand-new@test.com", @valid_token, "555666")

      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "brand-new@test.com",
          "otp" => "555666"
        })

      assert json_response(conn, 200)

      {:ok, user} = Users.get_by_email("brand-new@test.com")
      assert User.email_confirmed?(user)
      # Client's name seeds the new User's name.
      assert user.first_name == "Vikas"
      assert user.last_name == "K."
    end

    test "returns 401 for a wrong OTP" do
      client = insert_pending_client()
      seed_invitation_otp("invited@test.com", @valid_token, "111222")

      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "invited@test.com",
          "otp" => "999999"
        })

      assert %{"error_code" => "invalid_otp"} = json_response(conn, 400)

      # Client is still pending.
      assert Repo.get!(Client, client.id).status == :pending
    end

    test "returns 410 (otp_expired) if the OTP is older than 10 minutes" do
      client = insert_pending_client()
      seed_invitation_otp("invited@test.com", @valid_token, "666777")

      # Back-date the token beyond the 10 minute window.
      ott = last_otp_for("invited@test.com")
      stale = NaiveDateTime.add(NaiveDateTime.utc_now(), -11 * 60, :second)
      Repo.update_all(from(t in OneTimeToken, where: t.id == ^ott.id), set: [inserted_at: stale])

      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "invited@test.com",
          "otp" => "666777"
        })

      assert %{"error_code" => "otp_expired"} = json_response(conn, 410)
      assert Repo.get!(Client, client.id).status == :pending
    end

    test "OTP issued for one invitation cannot be used with a different invitation_token" do
      coach = insert(:coach)

      insert(:client,
        business: coach.business,
        creator: coach,
        email: "dup@test.com",
        status: :pending,
        invitation_token: "token-A",
        invitation_sent_at: DateTime.utc_now(:second),
        user: nil,
        user_id: nil
      )

      insert(:client,
        business: coach.business,
        creator: coach,
        email: "other@test.com",
        status: :pending,
        invitation_token: "token-B",
        invitation_sent_at: DateTime.utc_now(:second),
        user: nil,
        user_id: nil
      )

      # OTP bound to token-A
      seed_invitation_otp("dup@test.com", "token-A", "777888")

      # Attempt to verify using token-B
      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => "token-B",
          "email" => "dup@test.com",
          "otp" => "777888"
        })

      assert %{"error_code" => "invalid_otp"} = json_response(conn, 400)
    end

    test "OTP issued for one email cannot be used with a different email" do
      insert_pending_client()
      seed_invitation_otp("invited@test.com", @valid_token, "888999")

      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "different@test.com",
          "otp" => "888999"
        })

      assert %{"error_code" => "invalid_otp"} = json_response(conn, 400)
    end

    test "returns 410 (used) if the invitation was accepted (by someone else) between request and verify" do
      coach = insert(:coach)
      first_user = insert(:user, email: "race-winner@test.com")

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          email: "race@test.com",
          status: :pending,
          invitation_token: "race-verify-token",
          invitation_sent_at: DateTime.utc_now(:second),
          user: nil,
          user_id: nil
        )

      # Pretend the request-phase succeeded
      seed_invitation_otp("race@test.com", "race-verify-token", "121212")

      # Another writer wins the race and flips the client to active.
      {1, _} =
        Repo.update_all(from(c in Client, where: c.id == ^client.id),
          set: [status: :active, user_id: first_user.id]
        )

      # Now verify tries to proceed — should see the Client is no longer pending.
      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => "race-verify-token",
          "email" => "race@test.com",
          "otp" => "121212"
        })

      assert %{"error_code" => "invitation_used"} = json_response(conn, 410)
    end

    test "returns 409 (already_active_client) if the user became active elsewhere between request and verify" do
      # Seed: existing confirmed user, no active client yet
      user =
        insert(:user,
          email: "jumpy@test.com",
          email_confirmed_at: DateTime.utc_now(:second)
        )

      insert_pending_client(email: "pending-for-jumpy@test.com")
      seed_invitation_otp("jumpy@test.com", @valid_token, "131313")

      # Between request and verify, the user becomes active in another business.
      other_coach = insert(:coach)

      insert(:client,
        business: other_coach.business,
        creator: other_coach,
        user: user,
        status: :active
      )

      conn =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "jumpy@test.com",
          "otp" => "131313"
        })

      assert %{"error_code" => "already_active_client"} = json_response(conn, 409)
    end

    test "OTP is consumed on successful verify (second call fails)" do
      insert_pending_client()
      seed_invitation_otp("invited@test.com", @valid_token, "141414")

      conn1 =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "invited@test.com",
          "otp" => "141414"
        })

      assert json_response(conn1, 200)

      conn2 =
        json_conn()
        |> post("/v1/auth/accept-invite/verify", %{
          "invitation_token" => @valid_token,
          "email" => "invited@test.com",
          "otp" => "141414"
        })

      # OTP row is gone after success → looks like invalid.
      assert %{"error_code" => "invalid_otp"} = json_response(conn2, 400)
    end
  end
end
