defmodule EasyWeb.RateLimitingTest do
  use Easy.ConnCase, async: true

  alias Easy.Accounts

  @moduledoc """
  Tests for rate limiting functionality with the new token system.

  Verifies that:
  - Rate limiting works correctly with token_id responses
  - retry_after is returned correctly in error responses
  - Rate limits are enforced per email address
  """

  describe "OTP generation rate limiting" do
    test "returns token_id for first 3 requests within 15 minutes", %{conn: conn} do
      email = "ratelimit#{System.unique_integer([:positive])}@example.com"

      # First request should succeed
      conn1 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      assert %{"token_id" => token_id1} = json_response(conn1, 201)
      assert is_binary(token_id1)

      # Second request should succeed
      conn2 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      assert %{"token_id" => token_id2} = json_response(conn2, 201)
      assert is_binary(token_id2)

      # Third request should succeed
      conn3 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      assert %{"token_id" => token_id3} = json_response(conn3, 201)
      assert is_binary(token_id3)
    end

    test "returns rate limit error with retry_after on 4th request", %{conn: conn} do
      email = "ratelimit#{System.unique_integer([:positive])}@example.com"

      # Make 3 successful requests
      for _ <- 1..3 do
        conn_req = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
        assert json_response(conn_req, 201)
      end

      # 4th request should be rate limited
      conn4 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})

      assert %{
               "error" => %{
                 "code" => "RATE_LIMIT_EXCEEDED",
                 "message" => message,
                 "details" => %{"retry_after" => retry_after}
               }
             } = json_response(conn4, 429)

      # Verify message mentions retry_after
      assert message =~ "Rate limit exceeded"

      # Verify retry_after is a positive integer
      assert is_integer(retry_after)
      assert retry_after > 0

      # Verify Retry-After header is set
      assert [retry_after_header] = get_resp_header(conn4, "retry-after")
      assert retry_after_header == to_string(retry_after)
    end

    test "rate limiting is per email address", %{conn: conn} do
      email1 = "ratelimit1#{System.unique_integer([:positive])}@example.com"
      email2 = "ratelimit2#{System.unique_integer([:positive])}@example.com"

      # Make 3 requests for email1
      for _ <- 1..3 do
        conn_req = post(conn, "/api/auth/send-otp", %{email: email1, type: "login"})
        assert json_response(conn_req, 201)
      end

      # 4th request for email1 should be rate limited
      conn4 = post(conn, "/api/auth/send-otp", %{email: email1, type: "login"})
      assert %{"error" => %{"code" => "RATE_LIMIT_EXCEEDED"}} = json_response(conn4, 429)

      # But email2 should still work
      conn5 = post(conn, "/api/auth/send-otp", %{email: email2, type: "login"})
      assert %{"token_id" => _token_id} = json_response(conn5, 201)
    end

    test "idempotency returns same token_id within 60 seconds without counting toward rate limit",
         %{conn: conn} do
      email = "idempotent#{System.unique_integer([:positive])}@example.com"

      # First request
      conn1 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      assert %{"token_id" => token_id1} = json_response(conn1, 201)

      # Immediate retry should return same token_id (idempotency)
      conn2 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      assert %{"token_id" => token_id2} = json_response(conn2, 201)
      assert token_id1 == token_id2

      # Should still be able to make more requests (idempotent requests don't count)
      conn3 = post(conn, "/api/auth/send-otp", %{email: email, type: "login"})
      assert %{"token_id" => token_id3} = json_response(conn3, 201)
      assert token_id1 == token_id3
    end
  end

  describe "registration rate limiting" do
    test "returns rate limit error with retry_after on excessive registration attempts", %{
      conn: conn
    } do
      email = "register#{System.unique_integer([:positive])}@example.com"

      # Make 3 successful registration requests
      for _ <- 1..3 do
        conn_req = post(conn, "/api/auth/register", %{email: email, full_name: "Test User"})

        # First one creates user, subsequent ones fail validation but still count toward rate limit
        json_response(conn_req, :created)
      end

      # 4th request should be rate limited
      conn4 = post(conn, "/api/auth/register", %{email: email, full_name: "Test User"})

      assert %{
               "error" => %{
                 "code" => "RATE_LIMIT_EXCEEDED",
                 "message" => _message,
                 "details" => %{"retry_after" => retry_after}
               }
             } = json_response(conn4, 429)

      assert is_integer(retry_after)
      assert retry_after > 0
    end
  end

  describe "rate limit context functions" do
    test "check_rate_limit/1 returns allowed for new email" do
      email = "new#{System.unique_integer([:positive])}@example.com"

      assert {:ok, :allowed} = Accounts.check_rate_limit(email)
    end

    test "check_rate_limit/1 returns rate_limited after 3 requests" do
      email = "limited#{System.unique_integer([:positive])}@example.com"

      # Generate 3 tokens
      for _ <- 1..3 do
        {:ok, _token_id} = Accounts.generate_otp(email, "login")
      end

      # 4th check should be rate limited
      assert {:error, :rate_limited, retry_after} = Accounts.check_rate_limit(email)
      assert is_integer(retry_after)
      assert retry_after > 0
    end
  end
end
