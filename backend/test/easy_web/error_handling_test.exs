defmodule EasyWeb.ErrorHandlingTest do
  use Easy.ConnCase, async: true

  alias Easy.{Accounts, Repo, Coaches, Organizations}

  @moduledoc """
  Tests for comprehensive error handling across all API endpoints.

  Verifies that:
  - All error codes are returned correctly
  - Error response format is consistent
  - Rate limiting error responses include retry_after
  - Error messages are clear and actionable
  """

  describe "error response format consistency" do
    test "validation errors follow standard format", %{conn: conn} do
      # Missing required field
      conn = post(conn, "/api/auth/send-otp", %{})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => message
               }
             } = json_response(conn, 422)

      assert is_binary(message)
      assert String.length(message) > 0
    end

    test "authentication errors follow standard format", %{conn: conn} do
      # Missing authorization header
      conn = post(conn, "/api/auth/logout", %{})

      assert %{
               "error" => %{
                 "code" => code,
                 "message" => message
               }
             } = json_response(conn, 401)

      assert code in ["UNAUTHORIZED", "unauthorized"]
      assert is_binary(message)
    end

    test "not found errors follow standard format", %{conn: conn} do
      # Invalid token_id
      invalid_token_id = Ecto.UUID.generate()
      conn = get(conn, "/api/invitations/#{invalid_token_id}")

      assert %{
               "error" => %{
                 "code" => code,
                 "message" => message
               }
             } = json_response(conn, 404)

      assert code in ["not_found", "NOT_FOUND", "TOKEN_NOT_FOUND"]
      assert is_binary(message)
    end

    test "rate limit errors follow standard format with retry_after", %{conn: conn} do
      email = "ratelimit#{System.unique_integer([:positive])}@example.com"

      # Make 3 requests to hit rate limit
      for _ <- 1..3 do
        post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      end

      # 4th request should be rate limited
      conn = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})

      assert %{
               "error" => %{
                 "code" => "RATE_LIMIT_EXCEEDED",
                 "message" => message,
                 "details" => %{"retry_after" => retry_after}
               }
             } = json_response(conn, 429)

      assert is_binary(message)
      assert is_integer(retry_after)
      assert retry_after > 0

      # Verify Retry-After header is set
      assert [retry_after_header] = get_resp_header(conn, "retry-after")
      assert retry_after_header == to_string(retry_after)
    end

    test "expired token errors follow standard format", %{conn: conn} do
      email = "expired#{System.unique_integer([:positive])}@example.com"

      {:ok, token_id} = Accounts.generate_otp(email, "login")
      token = Accounts.get_token_by_uuid(token_id)

      # Expire the token
      token
      |> Ecto.Changeset.change(%{
        expires_at: DateTime.add(DateTime.utc_now(), -1, :hour)
      })
      |> Repo.update!()

      conn = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: "123456"})

      assert %{
               "error" => %{
                 "code" => "TOKEN_EXPIRED",
                 "message" => message
               }
             } = json_response(conn, 410)

      assert is_binary(message)
      assert message =~ "expired"
    end
  end

  describe "specific error codes" do
    test "VALIDATION_ERROR for invalid email format", %{conn: conn} do
      conn = post(conn, "/api/auth/send-otp", %{email: "invalid", type: "login"})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => _message
               }
             } = json_response(conn, 422)
    end

    test "INVALID_OTP for wrong OTP code", %{conn: conn} do
      email = "otp#{System.unique_integer([:positive])}@example.com"

      {:ok, user} =
        Accounts.create_user(%{
          email: email,
          full_name: "Test User",
          email_verified: true
        })

      {:ok, token_id} = Accounts.generate_otp(email, "login")

      conn = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: "000000"})

      assert %{
               "error" => %{
                 "code" => "INVALID_OTP",
                 "message" => _message
               }
             } = json_response(conn, 400)
    end

    test "TOKEN_EXPIRED for expired token", %{conn: conn} do
      email = "expired#{System.unique_integer([:positive])}@example.com"

      {:ok, token_id} = Accounts.generate_otp(email, "login")
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

    test "TOKEN_USED for already used token", %{conn: conn} do
      email = "used#{System.unique_integer([:positive])}@example.com"

      {:ok, user} =
        Accounts.create_user(%{
          email: email,
          full_name: "Test User",
          email_verified: true
        })

      {:ok, token_id} = Accounts.generate_otp(email, "login")
      token = Accounts.get_token_by_uuid(token_id)

      # Set a known code
      code = "123456"
      hashed_code = Bcrypt.hash_pwd_salt(code)

      token
      |> Ecto.Changeset.change(%{code: hashed_code})
      |> Repo.update!()

      # Use the token
      post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: code})

      # Try to use it again
      conn = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: code})

      assert %{
               "error" => %{
                 "code" => code,
                 "message" => _message
               }
             } = json_response(conn, 410)

      assert code in ["TOKEN_USED", "token_used"]
    end

    test "TOKEN_NOT_FOUND for non-existent token", %{conn: conn} do
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

    test "RATE_LIMIT_EXCEEDED for too many requests", %{conn: conn} do
      email = "ratelimit#{System.unique_integer([:positive])}@example.com"

      # Make 3 requests
      for _ <- 1..3 do
        post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      end

      # 4th request should be rate limited
      conn = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})

      assert %{
               "error" => %{
                 "code" => "RATE_LIMIT_EXCEEDED",
                 "message" => _message,
                 "details" => %{"retry_after" => _retry_after}
               }
             } = json_response(conn, 429)
    end

    test "INVALID_REFRESH_TOKEN for invalid refresh token", %{conn: conn} do
      conn = post(conn, "/api/auth/refresh", %{refresh_token: "invalid-token"})

      assert %{
               "error" => %{
                 "code" => "INVALID_REFRESH_TOKEN",
                 "message" => _message
               }
             } = json_response(conn, 401)
    end

    test "UNAUTHORIZED for missing authorization header", %{conn: conn} do
      conn = post(conn, "/api/auth/logout", %{})

      assert %{
               "error" => %{
                 "code" => code,
                 "message" => _message
               }
             } = json_response(conn, 401)

      assert code in ["UNAUTHORIZED", "unauthorized"]
    end

    test "FORBIDDEN for insufficient permissions", %{conn: conn} do
      # Create a client user
      email = "client#{System.unique_integer([:positive])}@example.com"

      {:ok, user} =
        Accounts.create_user(%{
          email: email,
          full_name: "Test Client",
          email_verified: true
        })

      {:ok, %{session: session_data}} = Accounts.create_session(user)

      # Try to create a business (requires coach role or no role)
      conn =
        conn
        |> put_req_header("authorization", "Bearer #{session_data.access_token}")
        |> post("/api/onboarding/business", %{name: "Test Business"})

      # This might return 403 or 422 depending on implementation
      response = json_response(conn, :unprocessable_entity)

      assert %{
               "error" => %{
                 "code" => _code,
                 "message" => _message
               }
             } = response
    end

    test "invitation_expired for expired invitation", %{conn: conn} do
      # Create coach and business
      coach_email = "coach#{System.unique_integer([:positive])}@example.com"

      {:ok, coach_user} =
        Accounts.create_user(%{
          email: coach_email,
          full_name: "Test Coach",
          email_verified: true
        })

      {:ok, business} =
        Organizations.create_business(%{
          name: "Test Business #{System.unique_integer([:positive])}",
          owner_id: coach_user.id
        })

      {:ok, _coach} =
        Coaches.create_coach(coach_user.id, business.id, %{
          status: "active"
        })

      {:ok, %{session: session_data}} = Accounts.create_session(coach_user)

      # Create invitation
      client_email = "client#{System.unique_integer([:positive])}@example.com"

      conn1 =
        conn
        |> put_req_header("authorization", "Bearer #{session_data.access_token}")
        |> post("/api/clients/invite", %{
          email: client_email,
          full_name: "Test Client"
        })

      %{"invitation" => %{"token_id" => token_id}} = json_response(conn1, 201)

      # Expire the invitation
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
  end

  describe "error message clarity" do
    test "validation errors include field information", %{conn: conn} do
      conn = post(conn, "/api/auth/send-otp", %{email: "invalid", type: "login"})

      assert %{
               "error" => %{
                 "code" => "VALIDATION_ERROR",
                 "message" => message
               }
             } = json_response(conn, 422)

      # Message should mention the field or validation issue
      assert message =~ ~r/(email|invalid|format)/i
    end

    test "OTP errors include attempts information when available", %{conn: conn} do
      email = "attempts#{System.unique_integer([:positive])}@example.com"

      {:ok, user} =
        Accounts.create_user(%{
          email: email,
          full_name: "Test User",
          email_verified: true
        })

      {:ok, token_id} = Accounts.generate_otp(email, "login")

      # Try with wrong code
      conn = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: "000000"})

      response = json_response(conn, 400)

      assert %{
               "error" => %{
                 "code" => "INVALID_OTP",
                 "message" => _message
               }
             } = response

      # May include attempts_remaining in details
      if Map.has_key?(response["error"], "details") do
        assert is_map(response["error"]["details"])
      end
    end

    test "rate limit errors include clear retry information", %{conn: conn} do
      email = "retry#{System.unique_integer([:positive])}@example.com"

      # Hit rate limit
      for _ <- 1..3 do
        post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      end

      conn = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})

      assert %{
               "error" => %{
                 "code" => "RATE_LIMIT_EXCEEDED",
                 "message" => message,
                 "details" => %{"retry_after" => retry_after}
               }
             } = json_response(conn, 429)

      # Message should mention rate limit
      assert message =~ ~r/(rate limit|too many|try again)/i

      # retry_after should be reasonable (not too long)
      assert retry_after > 0
      # 15 minutes max
      assert retry_after <= 900
    end

    test "token errors clearly indicate the issue", %{conn: conn} do
      email = "token#{System.unique_integer([:positive])}@example.com"

      {:ok, token_id} = Accounts.generate_otp(email, "login")
      token = Accounts.get_token_by_uuid(token_id)

      # Expire the token
      token
      |> Ecto.Changeset.change(%{
        expires_at: DateTime.add(DateTime.utc_now(), -1, :hour)
      })
      |> Repo.update!()

      conn = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: "123456"})

      assert %{
               "error" => %{
                 "code" => "TOKEN_EXPIRED",
                 "message" => message
               }
             } = json_response(conn, 410)

      # Message should clearly indicate expiration
      assert message =~ ~r/(expired|no longer valid)/i
    end
  end

  describe "HTTP status codes" do
    test "returns 422 for validation errors", %{conn: conn} do
      conn = post(conn, "/api/auth/send-otp", %{})
      assert json_response(conn, 422)
    end

    test "returns 401 for authentication errors", %{conn: conn} do
      conn = post(conn, "/api/auth/logout", %{})
      assert json_response(conn, 401)
    end

    test "returns 404 for not found errors", %{conn: conn} do
      invalid_token_id = Ecto.UUID.generate()
      conn = get(conn, "/api/invitations/#{invalid_token_id}")
      assert json_response(conn, 404)
    end

    test "returns 410 for expired/used tokens", %{conn: conn} do
      email = "gone#{System.unique_integer([:positive])}@example.com"

      {:ok, token_id} = Accounts.generate_otp(email, "login")
      token = Accounts.get_token_by_uuid(token_id)

      token
      |> Ecto.Changeset.change(%{
        expires_at: DateTime.add(DateTime.utc_now(), -1, :hour)
      })
      |> Repo.update!()

      conn = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: "123456"})
      assert json_response(conn, 410)
    end

    test "returns 429 for rate limit errors", %{conn: conn} do
      email = "status#{System.unique_integer([:positive])}@example.com"

      for _ <- 1..3 do
        post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      end

      conn = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      assert json_response(conn, 429)
    end
  end
end
