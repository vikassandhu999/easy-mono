defmodule EasyWeb.IdempotencyTest do
  use Easy.ConnCase, async: true

  alias Easy.{Accounts, Repo, Coaches, Organizations}

  @moduledoc """
  Tests for idempotency of critical operations.

  Verifies that:
  - Duplicate OTP generation returns same token_id within 60 seconds
  - Duplicate business creation returns existing business
  - Duplicate invitation returns existing invitation
  - Idempotent operations return appropriate HTTP status codes
  """

  defp create_verified_user(email, full_name \\ "Test User") do
    {:ok, user} =
      Accounts.create_user(%{
        email: email,
        full_name: full_name,
        email_verified: true
      })

    user
  end

  defp create_business_for_user(user, attrs) do
    {:ok, business} = Organizations.create_business(user, attrs)
    business
  end

  describe "OTP generation idempotency" do
    test "returns same token_id for duplicate requests within 60 seconds", %{conn: conn} do
      email = "idempotent#{System.unique_integer([:positive])}@example.com"

      _user = create_verified_user(email)

      # First request
      conn1 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})

      assert %{
               "token_id" => token_id1,
               "expires_at" => expires_at1,
               "status" => "pending"
             } = json_response(conn1, 201)

      # Second request immediately after
      conn2 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})

      assert %{
               "token_id" => token_id2,
               "expires_at" => expires_at2,
               "status" => "pending"
             } = json_response(conn2, 201)

      # Should return the same token_id
      assert token_id1 == token_id2
      assert expires_at1 == expires_at2
    end

    test "returns same token_id for multiple rapid requests", %{conn: conn} do
      email = "rapid#{System.unique_integer([:positive])}@example.com"

      _user = create_verified_user(email)

      # Make 5 rapid requests
      responses =
        for _ <- 1..5 do
          conn_req = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
          json_response(conn_req, 201)
        end

      # All should return the same token_id
      token_ids = Enum.map(responses, & &1["token_id"])
      assert Enum.uniq(token_ids) |> length() == 1
    end

    test "generates new token after 60 seconds", %{conn: conn} do
      email = "newtoken#{System.unique_integer([:positive])}@example.com"

      _user = create_verified_user(email)

      # First request
      conn1 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      %{"token_id" => token_id1} = json_response(conn1, 201)

      # Manually update the token's created_at to be 61 seconds ago
      token = Accounts.get_token_by_uuid(token_id1)

      token
      |> Ecto.Changeset.change(%{
        inserted_at:
          DateTime.utc_now()
          |> DateTime.truncate(:second)
          |> DateTime.add(-61, :second)
      })
      |> Repo.update!()

      # Second request should generate a new token
      conn2 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      %{"token_id" => token_id2} = json_response(conn2, 201)

      # Should be different token_ids
      assert token_id1 != token_id2
    end

    test "idempotency works for different token types separately", %{conn: conn} do
      email = "types#{System.unique_integer([:positive])}@example.com"

      _user = create_verified_user(email)

      # Generate login token
      conn1 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      %{"token_id" => login_token_id} = json_response(conn1, 201)

      # Generate registration token (different type)
      conn2 = post(conn, "/api/auth/send-otp", %{email: email, type: "registration"})
      %{"token_id" => verification_token_id} = json_response(conn2, 201)

      # Should be different tokens
      assert login_token_id != verification_token_id

      # Duplicate login request should return same login token
      conn3 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      %{"token_id" => login_token_id2} = json_response(conn3, 201)
      assert login_token_id == login_token_id2

      # Duplicate verification request should return same verification token
      conn4 = post(conn, "/api/auth/send-otp", %{email: email, type: "registration"})
      %{"token_id" => verification_token_id2} = json_response(conn4, 201)
      assert verification_token_id == verification_token_id2
    end

    test "idempotent requests don't count toward rate limit", %{conn: conn} do
      email = "ratelimit#{System.unique_integer([:positive])}@example.com"

      _user = create_verified_user(email)

      # First request
      conn1 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      %{"token_id" => token_id} = json_response(conn1, 201)

      # Make 10 idempotent requests (should all return same token_id)
      for _ <- 1..10 do
        conn_req = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
        %{"token_id" => ^token_id} = json_response(conn_req, 201)
      end

      # Should still be able to make more requests (not rate limited)
      # because idempotent requests don't count
      conn_final = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      assert %{"token_id" => ^token_id} = json_response(conn_final, 201)
    end
  end

  describe "business creation idempotency" do
    setup do
      email = "coach#{System.unique_integer([:positive])}@example.com"

      {:ok, user} =
        Accounts.create_user(%{
          email: email,
          full_name: "Test Coach",
          email_verified: true
        })

      {:ok, %{session: session_data}} = Accounts.create_session(user)

      %{user: user, access_token: session_data.access_token}
    end

    test "returns existing business on duplicate creation attempt", %{
      conn: conn,
      access_token: access_token
    } do
      business_name = "Test Business #{System.unique_integer([:positive])}"

      # First request - creates business
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/onboarding/business", %{
          name: business_name,
          description: "First attempt"
        })

      assert %{
               "business" => %{
                 "id" => business_id1,
                 "name" => ^business_name
               },
               "coach_profile" => %{
                 "id" => coach_id1
               }
             } = json_response(conn1, 201)

      # Second request - should return existing business
      conn2 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/onboarding/business", %{
          name: "Different Name",
          description: "Second attempt"
        })

      assert %{
               "business" => %{
                 "id" => business_id2,
                 "name" => ^business_name
               },
               "coach_profile" => %{
                 "id" => coach_id2
               }
             } = json_response(conn2, 200)

      # Should return the same business and coach IDs
      assert business_id1 == business_id2
      assert coach_id1 == coach_id2
    end

    test "returns 200 OK for existing business, 201 Created for new business", %{
      conn: conn,
      access_token: access_token
    } do
      business_name = "Status Test #{System.unique_integer([:positive])}"

      # First request should return 201 Created
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/onboarding/business", %{name: business_name})

      assert json_response(conn1, 201)

      # Second request should return 200 OK
      conn2 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/onboarding/business", %{name: "Different Name"})

      assert json_response(conn2, 200)
    end

    test "idempotency preserves original business data", %{
      conn: conn,
      access_token: access_token
    } do
      original_name = "Original Business #{System.unique_integer([:positive])}"
      original_description = "Original description"

      # Create business with original data
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/onboarding/business", %{
          name: original_name,
          description: original_description
        })

      assert %{
               "business" => %{
                 "name" => ^original_name,
                 "description" => ^original_description
               }
             } = json_response(conn1, 201)

      # Try to create with different data
      conn2 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/onboarding/business", %{
          name: "Different Name",
          description: "Different description"
        })

      # Should return original data, not new data
      assert %{
               "business" => %{
                 "name" => ^original_name,
                 "description" => ^original_description
               }
             } = json_response(conn2, 200)
    end
  end

  describe "client invitation idempotency" do
    setup do
      coach_email = "coach#{System.unique_integer([:positive])}@example.com"

      {:ok, coach_user} =
        Accounts.create_user(%{
          email: coach_email,
          full_name: "Test Coach",
          email_verified: true
        })

      business =
        create_business_for_user(coach_user, %{
          name: "Test Business #{System.unique_integer([:positive])}"
        })

      {:ok, _coach} =
        Coaches.create_coach(coach_user.id, business.id, %{
          status: "active"
        })

      {:ok, %{session: session_data}} = Accounts.create_session(coach_user)

      %{
        coach_user: coach_user,
        business: business,
        access_token: session_data.access_token
      }
    end

    test "returns existing invitation for duplicate invite to same email", %{
      conn: conn,
      access_token: access_token
    } do
      client_email = "client#{System.unique_integer([:positive])}@example.com"
      client_name = "Test Client"

      # First invitation
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: client_name,
          notes: "First invitation"
        })

      assert %{
               "client" => %{
                 "id" => client_id1,
                 "email" => ^client_email
               },
               "invitation" => %{
                 "token_id" => token_id1
               }
             } = json_response(conn1, 201)

      # Second invitation to same email
      conn2 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Different Name",
          notes: "Second invitation"
        })

      assert %{
               "client" => %{
                 "id" => client_id2,
                 "email" => ^client_email
               },
               "invitation" => %{
                 "token_id" => token_id2
               }
             } = json_response(conn2, 201)

      # Should return the same client and invitation
      assert client_id1 == client_id2
      assert token_id1 == token_id2
    end

    test "idempotency preserves original client data", %{
      conn: conn,
      access_token: access_token
    } do
      client_email = "preserve#{System.unique_integer([:positive])}@example.com"
      original_name = "Original Name"
      original_phone = "+1234567890"
      original_notes = "Original notes"

      # First invitation with original data
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: original_name,
          phone: original_phone,
          notes: original_notes
        })

      assert %{
               "client" => %{
                 "full_name" => ^original_name,
                 "phone" => ^original_phone,
                 "notes" => ^original_notes
               }
             } = json_response(conn1, 201)

      # Second invitation with different data
      conn2 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Different Name",
          phone: "+9876543210",
          notes: "Different notes"
        })

      # Should return original data
      assert %{
               "client" => %{
                 "full_name" => ^original_name,
                 "phone" => ^original_phone,
                 "notes" => ^original_notes
               }
             } = json_response(conn2, 201)
    end

    test "creates new invitation if previous one was accepted", %{
      conn: conn,
      access_token: access_token
    } do
      client_email = "accepted#{System.unique_integer([:positive])}@example.com"

      # First invitation
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Test Client"
        })

      %{
        "client" => %{"id" => client_id},
        "invitation" => %{"token_id" => token_id1}
      } = json_response(conn1, 201)

      # Mark the invitation as used (simulate acceptance)
      invitation_token = Accounts.get_token_by_uuid(token_id1)

      invitation_token
      |> Ecto.Changeset.change(%{used_at: DateTime.utc_now() |> DateTime.truncate(:second)})
      |> Repo.update!()

      # Activate the client (simulate completion)
      client = Repo.get(Easy.Clients.Client, client_id)

      client
      |> Ecto.Changeset.change(%{status: "active"})
      |> Repo.update!()

      # Second invitation should create a new invitation token
      conn2 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Test Client"
        })

      %{"invitation" => %{"token_id" => token_id2}} = json_response(conn2, 201)

      # Should be a different token since the first was used
      assert token_id1 != token_id2
    end

    test "creates new invitation if previous one expired", %{
      conn: conn,
      access_token: access_token
    } do
      client_email = "expired#{System.unique_integer([:positive])}@example.com"

      # First invitation
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Test Client"
        })

      %{"invitation" => %{"token_id" => token_id1}} = json_response(conn1, 201)

      # Expire the invitation
      invitation_token = Accounts.get_token_by_uuid(token_id1)

      invitation_token
      |> Ecto.Changeset.change(%{
        expires_at:
          DateTime.utc_now()
          |> DateTime.add(-1, :day)
          |> DateTime.truncate(:second)
      })
      |> Repo.update!()

      # Second invitation should create a new invitation token
      conn2 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Test Client"
        })

      %{"invitation" => %{"token_id" => token_id2}} = json_response(conn2, 201)

      # Should be a different token since the first expired
      assert token_id1 != token_id2
    end
  end

  describe "idempotency across different operations" do
    test "OTP idempotency is independent per email", %{conn: conn} do
      email1 = "user1#{System.unique_integer([:positive])}@example.com"
      email2 = "user2#{System.unique_integer([:positive])}@example.com"

      # Generate OTP for email1
      conn1 = post(conn, "/api/auth/send-otp", %{email: email1, type: "login"})
      %{"token_id" => token_id1} = json_response(conn1, 201)

      # Generate OTP for email2
      conn2 = post(conn, "/api/auth/send-otp", %{email: email2, type: "login"})
      %{"token_id" => token_id2} = json_response(conn2, 201)

      # Should be different tokens
      assert token_id1 != token_id2

      # Duplicate request for email1 should return same token
      conn3 = post(conn, "/api/auth/send-otp", %{email: email1, type: "login"})
      %{"token_id" => token_id3} = json_response(conn3, 201)
      assert token_id1 == token_id3

      # Duplicate request for email2 should return same token
      conn4 = post(conn, "/api/auth/send-otp", %{email: email2, type: "login"})
      %{"token_id" => token_id4} = json_response(conn4, 201)
      assert token_id2 == token_id4
    end

    test "business idempotency is per user", %{conn: conn} do
      # Create two users
      email1 = "coach1#{System.unique_integer([:positive])}@example.com"
      email2 = "coach2#{System.unique_integer([:positive])}@example.com"

      {:ok, user1} =
        Accounts.create_user(%{
          email: email1,
          full_name: "Coach 1",
          email_verified: true
        })

      {:ok, user2} =
        Accounts.create_user(%{
          email: email2,
          full_name: "Coach 2",
          email_verified: true
        })

      {:ok, %{session: session1}} = Accounts.create_session(user1)
      {:ok, %{session: session2}} = Accounts.create_session(user2)

      # User1 creates business
      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{session1.access_token}")
        |> post("/api/onboarding/business", %{name: "Business 1"})

      %{"business" => %{"id" => business_id1}} = json_response(conn1, 201)

      # User2 creates business (should succeed, different user)
      conn2 =
        conn
        |> put_req_header("authorization", "Bearer #{session2.access_token}")
        |> post("/api/onboarding/business", %{name: "Business 2"})

      %{"business" => %{"id" => business_id2}} = json_response(conn2, 201)

      # Should be different businesses
      assert business_id1 != business_id2

      # User1 tries to create again (should return existing)
      conn3 =
        conn
        |> put_req_header("authorization", "Bearer #{session1.access_token}")
        |> post("/api/onboarding/business", %{name: "Business 3"})

      %{"business" => %{"id" => business_id3}} = json_response(conn3, 200)
      assert business_id1 == business_id3
    end
  end
end
