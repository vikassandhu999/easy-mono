defmodule EasyWeb.ClientInvitationFlowTest do
  use Easy.ConnCase, async: true

  alias Easy.{Accounts, Repo, Coaches, Organizations}

  @moduledoc """
  Integration test for the complete client invitation flow.

  This test verifies that the client invitation requires only 3 API calls:
  1. POST /api/clients/invite - Coach creates invitation (returns token_id)
  2. GET /api/invitations/:token_id - Client views invitation details
  3. POST /api/invitations/:token_id/accept - Client accepts with OTP code

  Each response should include all necessary data to avoid additional API calls.
  """

  describe "complete client invitation flow" do
    setup do
      # Create a coach user and business for testing
      coach_email = "coach#{System.unique_integer([:positive])}@example.com"

      {:ok, coach_user} =
        Accounts.create_user(%{
          email: coach_email,
          full_name: "Test Coach",
          email_verified: true,
          email_verified_at: DateTime.utc_now() |> DateTime.truncate(:second)
        })

      {:ok, business} =
        Organizations.create_business(%{
          name: "Test Business #{System.unique_integer([:positive])}",
          owner_id: coach_user.id
        })

      {:ok, coach} =
        Coaches.create_coach(coach_user.id, business.id, %{
          status: "active"
        })

      # Create session for coach
      {:ok, %{session: session_data}} = Accounts.create_session(coach_user)

      %{
        coach: coach,
        coach_user: coach_user,
        business: business,
        access_token: session_data.access_token
      }
    end

    test "completes invitation flow in 3 API calls with all necessary data", %{
      conn: conn,
      access_token: access_token,
      business: business,
      coach_user: coach_user
    } do
      client_email = "client#{System.unique_integer([:positive])}@example.com"
      client_name = "Test Client"

      # ============================================
      # STEP 1: Coach Creates Invitation
      # ============================================
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: client_name,
          phone: "+1234567890",
          notes: "New client from referral"
        })

      assert %{
               "client" => client_data,
               "invitation" => invitation_data
             } = json_response(conn1, 201)

      # Verify client data
      assert %{
               "id" => client_id,
               "email" => ^client_email,
               "full_name" => ^client_name,
               "phone" => "+1234567890",
               "status" => "pending",
               "business_id" => business_id,
               "notes" => "New client from referral"
             } = client_data

      # Verify client_id and business_id are valid UUID strings
      assert is_binary(client_id)
      assert String.length(client_id) == 36
      assert is_binary(business_id)
      assert String.length(business_id) == 36

      # Verify invitation data includes token_id, URL, and expiration
      assert %{
               "token_id" => token_id,
               "invitation_url" => invitation_url,
               "expires_at" => expires_at
             } = invitation_data

      # Verify token_id is a valid UUID string
      assert is_binary(token_id)
      assert String.length(token_id) == 36

      # Verify invitation URL contains the token_id
      assert String.contains?(invitation_url, token_id)

      # Verify expires_at is a valid ISO 8601 timestamp
      assert is_binary(expires_at)
      {:ok, _datetime, _offset} = DateTime.from_iso8601(expires_at)

      # ============================================
      # STEP 2: Client Views Invitation
      # ============================================
      conn2 = get(conn, "/api/invitations/#{token_id}")

      assert %{
               "invitation" => invitation_info,
               "client" => client_info,
               "business" => business_info,
               "inviting_coach" => coach_info
             } = json_response(conn2, 200)

      # Verify invitation info
      assert %{
               "token_id" => ^token_id,
               "status" => "valid",
               "expires_at" => ^expires_at
             } = invitation_info

      # Verify client info (no sensitive data like notes)
      assert %{
               "email" => ^client_email,
               "full_name" => ^client_name
             } = client_info

      # Verify business info
      assert %{
               "id" => ^business_id,
               "name" => business_name
             } = business_info

      assert is_binary(business_name)

      # Verify inviting coach info
      assert %{
               "full_name" => coach_full_name
             } = coach_info

      assert coach_full_name == coach_user.full_name

      # ============================================
      # STEP 3: Client Accepts Invitation with OTP
      # ============================================
      # Get the invitation token to extract the OTP code for testing
      invitation_token = Accounts.get_token_by_uuid(token_id)
      assert invitation_token != nil

      # For testing, we need to get the actual OTP code
      code = get_test_otp_code(invitation_token)

      conn3 =
        post(conn, "/api/invitations/#{token_id}/accept", %{
          code: code
        })

      assert %{
               "user" => user_data,
               "session" => session_data
             } = json_response(conn3, 200)

      # Verify user data includes all necessary fields
      assert %{
               "id" => user_id,
               "email" => ^client_email,
               "full_name" => ^client_name,
               "email_verified" => true,
               "roles" => ["client"],
               "client_profile" => client_profile_data
             } = user_data

      # Verify user_id is a valid UUID string
      assert is_binary(user_id)
      assert String.length(user_id) == 36

      # Verify client profile includes assigned coaches
      assert %{
               "id" => ^client_id,
               "business_id" => ^business_id,
               "status" => "active",
               "assigned_coaches" => assigned_coaches
             } = client_profile_data

      # Verify at least one coach is assigned (the inviting coach)
      assert is_list(assigned_coaches)
      assert length(assigned_coaches) > 0

      # Verify coach data structure
      [first_coach | _] = assigned_coaches

      assert %{
               "id" => coach_id,
               "user" => %{
                 "full_name" => ^coach_full_name
               }
             } = first_coach

      # Verify coach_id is a valid UUID string
      assert is_binary(coach_id)
      assert String.length(coach_id) == 36

      # Verify session data includes tokens
      assert %{
               "access_token" => client_access_token,
               "refresh_token" => _refresh_token,
               "expires_at" => _session_expires_at,
               "expires_in" => _expires_in
             } = session_data

      assert is_binary(client_access_token)

      # ============================================
      # VERIFICATION: All data is complete
      # ============================================
      # The test has verified that:
      # 1. Invitation creation returns client data, token_id, URL, and expiration
      # 2. Invitation view returns all necessary context (client, business, coach)
      # 3. Invitation acceptance returns complete user profile with client profile,
      #    assigned coaches, and session tokens
      #
      # No additional API calls are needed to fetch related data
    end

    test "invitation creation is idempotent - returns existing invitation on retry", %{
      conn: conn,
      access_token: access_token
    } do
      client_email = "client#{System.unique_integer([:positive])}@example.com"
      client_name = "Test Client"

      # Create invitation first time
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: client_name
        })

      assert %{
               "client" => %{"id" => client_id},
               "invitation" => %{"token_id" => token_id}
             } = json_response(conn1, 201)

      # Try to create invitation again for same email (idempotent)
      conn2 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Different Name"
        })

      # Should return existing invitation
      assert %{
               "client" => %{"id" => ^client_id},
               "invitation" => %{"token_id" => ^token_id}
             } = json_response(conn2, 201)
    end

    test "returns error for invalid token_id", %{conn: conn} do
      invalid_token_id = Ecto.UUID.generate()

      conn1 = get(conn, "/api/invitations/#{invalid_token_id}")

      assert %{
               "error" => %{
                 "code" => "not_found",
                 "message" => _message
               }
             } = json_response(conn1, 404)
    end

    test "returns error for expired invitation", %{
      conn: conn,
      access_token: access_token
    } do
      client_email = "client#{System.unique_integer([:positive])}@example.com"

      # Create invitation
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Test Client"
        })

      %{"invitation" => %{"token_id" => token_id}} = json_response(conn1, 201)

      # Manually expire the token
      invitation_token = Accounts.get_token_by_uuid(token_id)

      invitation_token
      |> Ecto.Changeset.change(%{
        expires_at: DateTime.add(DateTime.utc_now(), -1, :day)
      })
      |> Repo.update!()

      # Try to view expired invitation
      conn2 = get(conn, "/api/invitations/#{token_id}")

      assert %{
               "error" => %{
                 "code" => "invitation_expired",
                 "message" => _message
               }
             } = json_response(conn2, 410)
    end

    test "returns error for invalid OTP code", %{
      conn: conn,
      access_token: access_token
    } do
      client_email = "client#{System.unique_integer([:positive])}@example.com"

      # Create invitation
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Test Client"
        })

      %{"invitation" => %{"token_id" => token_id}} = json_response(conn1, 201)

      # Try to accept with wrong code
      conn2 =
        post(conn, "/api/invitations/#{token_id}/accept", %{
          code: "000000"
        })

      assert %{
               "error" => %{
                 "code" => "invalid_otp",
                 "message" => _message
               }
             } = json_response(conn2, 400)
    end
  end

  # ============================================
  # TEST HELPERS
  # ============================================

  # Helper to get OTP code for testing
  defp get_test_otp_code(token) do
    code = "123456"
    hashed_code = Bcrypt.hash_pwd_salt(code)

    token
    |> Ecto.Changeset.change(%{code: hashed_code})
    |> Repo.update!()

    code
  end
end
