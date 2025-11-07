defmodule EasyWeb.AuthEndpointsTest do
  use Easy.ConnCase, async: true

  alias Easy.{Accounts, Repo}

  @moduledoc """
  Tests for the new simplified authentication endpoints.

  Tests the following endpoints:
  - POST /api/auth/send-otp
  - POST /api/auth/verify-otp
  - POST /api/auth/refresh
  - POST /api/auth/logout
  """

  describe "POST /api/auth/send-otp" do
    test "generates OTP and returns token_id for existing user", %{conn: conn} do
      email = "user#{System.unique_integer([:positive])}@example.com"

      # Create user first
      {:ok, _user} =
        Accounts.create_user(%{
          email: email,
          full_name: "Test User",
          email_verified: true
        })

      conn = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})

      assert %{
               "token_id" => token_id,
               "expires_at" => expires_at,
               "status" => "pending"
             } = json_response(conn, 201)

      # Verify token_id is a valid UUID string
      assert is_binary(token_id)
      assert String.length(token_id) == 36

      assert String.match?(
               token_id,
               ~r/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
             )

      # Verify expires_at is a valid ISO 8601 timestamp
      assert is_binary(expires_at)
      {:ok, _datetime, _offset} = DateTime.from_iso8601(expires_at)
    end

    test "generates OTP for new user email", %{conn: conn} do
      email = "newuser#{System.unique_integer([:positive])}@example.com"

      conn = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})

      assert %{
               "token_id" => token_id,
               "expires_at" => _expires_at,
               "status" => "pending"
             } = json_response(conn, 201)

      assert is_binary(token_id)
      assert String.length(token_id) == 36
    end

    test "returns validation error for missing email", %{conn: conn} do
      conn = post(conn, "/api/auth/send-otp", %{type: "login"})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => _message
               }
             } = json_response(conn, 422)
    end

    test "returns validation error for invalid email format", %{conn: conn} do
      conn = post(conn, "/api/auth/send-otp", %{email: "invalid-email", type: "login"})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => _message
               }
             } = json_response(conn, 422)
    end

    test "returns validation error for missing type", %{conn: conn} do
      conn = post(conn, "/api/auth/send-otp", %{email: "test@example.com"})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => _message
               }
             } = json_response(conn, 422)
    end

    test "returns validation error for invalid type", %{conn: conn} do
      conn = post(conn, "/api/auth/send-otp", %{email: "test@example.com", type: "invalid"})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => _message
               }
             } = json_response(conn, 422)
    end

    test "returns same token_id for duplicate requests within 60 seconds (idempotency)", %{
      conn: conn
    } do
      email = "idempotent#{System.unique_integer([:positive])}@example.com"

      # First request
      conn1 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      %{"token_id" => token_id1} = json_response(conn1, 201)

      # Second request immediately after
      conn2 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      %{"token_id" => token_id2} = json_response(conn2, 201)

      # Should return the same token_id
      assert token_id1 == token_id2
    end
  end

  describe "POST /api/auth/verify-otp" do
    setup do
      email = "verify#{System.unique_integer([:positive])}@example.com"

      {:ok, user} =
        Accounts.create_user(%{
          email: email,
          full_name: "Test User",
          email_verified: true
        })

      {:ok, token_id} = Accounts.generate_otp(email, "login")
      token = Accounts.get_token_by_uuid(token_id)

      # Set a known OTP code for testing
      code = "123456"
      hashed_code = Bcrypt.hash_pwd_salt(code)

      token
      |> Ecto.Changeset.change(%{code: hashed_code})
      |> Repo.update!()

      %{email: email, user: user, token_id: token_id, code: code}
    end

    test "verifies OTP and returns user profile with session tokens", %{
      conn: conn,
      token_id: token_id,
      code: code,
      email: email
    } do
      conn = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: code})

      assert %{
               "user" => user_data,
               "session" => session_data
             } = json_response(conn, 200)

      # Verify user data structure
      assert %{
               "id" => user_id,
               "email" => ^email,
               "full_name" => "Test User",
               "email_verified" => true,
               "roles" => roles
             } = user_data

      # Verify user_id is a valid UUID string
      assert is_binary(user_id)
      assert String.length(user_id) == 36

      # Verify roles is a list
      assert is_list(roles)

      # Verify session data structure
      assert %{
               "access_token" => access_token,
               "refresh_token" => refresh_token,
               "expires_at" => expires_at,
               "expires_in" => expires_in
             } = session_data

      assert is_binary(access_token)
      assert is_binary(refresh_token)
      assert is_binary(expires_at)
      assert is_integer(expires_in)
      assert expires_in > 0

      # Verify expires_at is a valid ISO 8601 timestamp
      {:ok, _datetime, _offset} = DateTime.from_iso8601(expires_at)
    end

    test "returns error for invalid OTP code", %{conn: conn, token_id: token_id} do
      conn = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: "000000"})

      assert %{
               "error" => %{
                 "code" => "INVALID_OTP",
                 "message" => message
               }
             } = json_response(conn, 400)

      assert message =~ "invalid"
    end

    test "returns error for invalid token_id", %{conn: conn} do
      invalid_token_id = Ecto.UUID.generate()

      conn = post(conn, "/api/auth/verify-otp", %{token_id: invalid_token_id, code: "123456"})

      assert %{
               "error" => %{
                 "code" => code,
                 "message" => _message
               }
             } = json_response(conn, 404)

      assert code in ["TOKEN_NOT_FOUND", "not_found"]
    end

    test "returns error for expired token", %{conn: conn, token_id: token_id} do
      # Expire the token
      token = Accounts.get_token_by_uuid(token_id)

      token
      |> Ecto.Changeset.change(%{
        expires_at: DateTime.add(DateTime.utc_now(), -1, :hour)
      })
      |> Repo.update!()

      conn = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: "123456"})

      assert %{
               "error" => %{
                 "code" => "TOKEN_EXPIRED",
                 "message" => _message
               }
             } = json_response(conn, 410)
    end

    test "returns error for already used token", %{conn: conn, token_id: token_id, code: code} do
      # Use the token first
      post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: code})

      # Try to use it again
      conn2 = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: code})

      assert %{
               "error" => %{
                 "code" => code,
                 "message" => _message
               }
             } = json_response(conn2, 410)

      assert code in ["TOKEN_USED", "token_used"]
    end

    test "returns validation error for missing token_id", %{conn: conn} do
      conn = post(conn, "/api/auth/verify-otp", %{code: "123456"})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => _message
               }
             } = json_response(conn, 422)
    end

    test "returns validation error for missing code", %{conn: conn, token_id: token_id} do
      conn = post(conn, "/api/auth/verify-otp", %{token_id: token_id})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => _message
               }
             } = json_response(conn, 422)
    end
  end

  describe "POST /api/auth/refresh" do
    setup do
      email = "refresh#{System.unique_integer([:positive])}@example.com"

      {:ok, user} =
        Accounts.create_user(%{
          email: email,
          full_name: "Test User",
          email_verified: true
        })

      {:ok, %{session: session_data}} = Accounts.create_session(user)

      %{user: user, session_data: session_data}
    end

    test "returns new access token for valid refresh token", %{
      conn: conn,
      session_data: session_data
    } do
      conn =
        post(conn, "/api/auth/refresh", %{
          refresh_token: session_data.refresh_token
        })

      assert %{
               "access_token" => new_access_token,
               "expires_at" => expires_at,
               "expires_in" => expires_in
             } = json_response(conn, 200)

      assert is_binary(new_access_token)
      assert is_binary(expires_at)
      assert is_integer(expires_in)
      assert expires_in > 0

      # Verify new token is different from old token
      assert new_access_token != session_data.access_token

      # Verify expires_at is a valid ISO 8601 timestamp
      {:ok, _datetime, _offset} = DateTime.from_iso8601(expires_at)
    end

    test "returns error for invalid refresh token", %{conn: conn} do
      conn = post(conn, "/api/auth/refresh", %{refresh_token: "invalid-token"})

      assert %{
               "error" => %{
                 "code" => "INVALID_REFRESH_TOKEN",
                 "message" => _message
               }
             } = json_response(conn, 401)
    end

    test "returns error for missing refresh token", %{conn: conn} do
      conn = post(conn, "/api/auth/refresh", %{})

      # Should return 422 for validation error
      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => _message
               }
             } = json_response(conn, 422)
    end

    test "returns error for revoked session", %{conn: conn, session_data: session_data} do
      # Revoke the session
      session = Repo.get_by(Accounts.Session, refresh_token: session_data.refresh_token)

      session
      |> Ecto.Changeset.change(%{revoked_at: DateTime.utc_now()})
      |> Repo.update!()

      conn = post(conn, "/api/auth/refresh", %{refresh_token: session_data.refresh_token})

      assert %{
               "error" => %{
                 "code" => "INVALID_REFRESH_TOKEN",
                 "message" => _message
               }
             } = json_response(conn, 401)
    end
  end

  describe "POST /api/auth/logout" do
    setup do
      email = "logout#{System.unique_integer([:positive])}@example.com"

      {:ok, user} =
        Accounts.create_user(%{
          email: email,
          full_name: "Test User",
          email_verified: true
        })

      {:ok, %{session: session_data}} = Accounts.create_session(user)

      %{user: user, session_data: session_data}
    end

    test "revokes session and returns success", %{conn: conn, session_data: session_data} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{session_data.access_token}")
        |> post("/api/auth/logout", %{})

      assert %{"status" => "logged_out"} = json_response(conn, 200)

      # Verify session is revoked
      session = Repo.get_by(Accounts.Session, token: session_data.access_token)
      assert session.revoked_at != nil
    end

    test "returns error for missing authorization header", %{conn: conn} do
      conn = post(conn, "/api/auth/logout", %{})

      assert %{
               "error" => %{
                 "code" => code,
                 "message" => _message
               }
             } = json_response(conn, 401)

      assert code in ["UNAUTHORIZED", "unauthorized"]
    end

    test "returns error for invalid token", %{conn: conn} do
      conn =
        conn
        |> put_req_header("authorization", "Bearer invalid-token")
        |> post("/api/auth/logout", %{})

      assert %{
               "error" => %{
                 "code" => code,
                 "message" => _message
               }
             } = json_response(conn, 401)

      assert code in ["UNAUTHORIZED", "SESSION_NOT_FOUND", "unauthorized"]
    end

    test "returns error for already revoked session", %{conn: conn, session_data: session_data} do
      # Revoke the session first
      session = Repo.get_by(Accounts.Session, token: session_data.access_token)

      session
      |> Ecto.Changeset.change(%{revoked_at: DateTime.utc_now()})
      |> Repo.update!()

      # Try to logout again
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{session_data.access_token}")
        |> post("/api/auth/logout", %{})

      assert %{
               "error" => %{
                 "code" => code,
                 "message" => _message
               }
             } = json_response(conn, 401)

      assert code in ["UNAUTHORIZED", "SESSION_NOT_FOUND", "unauthorized"]
    end
  end
end
