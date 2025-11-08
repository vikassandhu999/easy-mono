defmodule EasyWeb.CoachRegistrationFlowTest do
  use Easy.ConnCase, async: true

  alias Easy.{Accounts, Repo}

  @moduledoc """
  Integration test for the complete coach registration flow.

  This test verifies that the coach registration requires only 3 API calls:
  1. POST /api/auth/register - Register with email and full_name
  2. POST /api/auth/verify-otp - Verify OTP and get session tokens
  3. POST /api/onboarding/business - Create business and coach profile

  Each response should include all necessary data to avoid additional API calls.
  """

  describe "complete coach registration flow" do
    test "completes registration in 3 API calls with all necessary data", %{conn: conn} do
      email = "coach#{System.unique_integer([:positive])}@example.com"
      full_name = "Test Coach"
      business_name = "Test Coaching Business"

      # ============================================
      # STEP 1: Register
      # ============================================
      conn1 =
        post(conn, "/api/auth/register", %{
          email: email,
          full_name: full_name
        })

      assert %{
               "token_id" => token_id,
               "status" => "verification_pending",
               "expires_at" => _expires_at
             } = json_response(conn1, 201)

      # Verify token_id is a valid UUID string
      assert is_binary(token_id)
      assert String.length(token_id) == 36

      # ============================================
      # STEP 2: Verify OTP
      # ============================================
      # Get the OTP token to extract the code for testing
      token =
        Accounts.get_token_by_id(token_id) ||
          Accounts.get_token_by_uuid(token_id)

      assert token != nil

      # For testing, we need to get the actual OTP code
      # In production, this would be sent via email
      # We'll use a test helper to get the code
      code = get_test_otp_code(token)

      conn2 =
        post(conn, "/api/auth/verify-otp", %{
          token_id: token_id,
          code: code
        })

      assert %{
               "user" => user_data,
               "session" => session_data
             } = json_response(conn2, 200)

      # Verify user data includes all necessary fields
      assert %{
               "id" => user_id,
               "email" => ^email,
               "full_name" => ^full_name,
               "email_verified" => true,
               "roles" => []
             } = user_data

      # Verify user_id is a valid UUID string
      assert is_binary(user_id)
      assert String.length(user_id) == 36

      # Verify session data includes tokens
      assert %{
               "access_token" => access_token,
               "refresh_token" => _refresh_token,
               "expires_at" => _expires_at,
               "expires_in" => _expires_in
             } = session_data

      assert is_binary(access_token)

      # ============================================
      # STEP 3: Create Business
      # ============================================
      conn3 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/onboarding/business", %{
          name: business_name,
          description: "Professional coaching services"
        })

      assert %{
               "business" => business_data,
               "coach_profile" => coach_data,
               "subscription" => subscription_data
             } = json_response(conn3, 201)

      # Verify business data includes all necessary fields
      assert %{
               "id" => business_id,
               "name" => ^business_name,
               "slug" => _slug,
               "description" => "Professional coaching services",
               "owner_id" => ^user_id,
               "status" => "active"
             } = business_data

      # Verify business_id is a valid UUID string
      assert is_binary(business_id)
      assert String.length(business_id) == 36

      # Verify coach profile data
      assert %{
               "id" => coach_id,
               "user_id" => ^user_id,
               "business_id" => ^business_id,
               "status" => "active",
               "bio" => nil,
               "specialties" => [],
               "credentials" => %{}
             } = coach_data

      # Verify coach_id is a valid UUID string
      assert is_binary(coach_id)
      assert String.length(coach_id) == 36

      # Verify subscription data includes plan information
      assert %{
               "id" => subscription_id,
               "business_id" => ^business_id,
               "plan_id" => _plan_id,
               "status" => "active",
               "plan" => plan_data
             } = subscription_data

      # Verify subscription_id is a valid UUID string
      assert is_binary(subscription_id)
      assert String.length(subscription_id) == 36

      # Verify plan data is included (no additional API call needed)
      assert %{
               "id" => _plan_id,
               "name" => "Free",
               "slug" => "free",
               "price_cents" => 0,
               "billing_interval" => "month"
             } = plan_data

      # ============================================
      # VERIFICATION: All data is complete
      # ============================================
      # The test has verified that:
      # 1. Registration returns token_id for OTP verification
      # 2. OTP verification returns complete user profile and session tokens
      # 3. Business creation returns business, coach profile, and subscription with plan
      #
      # No additional API calls are needed to fetch related data
    end

    test "business creation is idempotent - returns existing business on retry", %{conn: conn} do
      email = "coach#{System.unique_integer([:positive])}@example.com"
      full_name = "Test Coach"
      business_name = "Test Coaching Business"

      # Complete registration flow
      conn1 = post(conn, "/api/auth/register", %{email: email, full_name: full_name})
      %{"token_id" => token_id} = json_response(conn1, 201)

      token =
        Accounts.get_token_by_id(token_id) ||
          Accounts.get_token_by_uuid(token_id)

      code = get_test_otp_code(token)

      conn2 = post(conn, "/api/auth/verify-otp", %{token_id: token_id, code: code})
      %{"session" => %{"access_token" => access_token}} = json_response(conn2, 200)

      # Create business first time
      conn3 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/onboarding/business", %{name: business_name})

      assert %{
               "business" => %{"id" => business_id},
               "coach_profile" => %{"id" => coach_id}
             } = json_response(conn3, 201)

      # Try to create business again (idempotent)
      conn4 =
        conn
        |> put_req_header("authorization", "Bearer #{access_token}")
        |> post("/api/onboarding/business", %{name: "Different Name"})

      # Should return existing business with 200 OK
      assert %{
               "business" => %{"id" => ^business_id},
               "coach_profile" => %{"id" => ^coach_id}
             } = json_response(conn4, 200)
    end
  end

  # ============================================
  # TEST HELPERS
  # ============================================

  # Helper to get OTP code for testing
  # In production, this would be sent via email
  defp get_test_otp_code(token) do
    # For testing, we generate a code and hash it to match the token
    # In a real scenario, we'd need to intercept the email or use a test code
    # For now, we'll create a new token with a known code
    code = "123456"

    # Update the token with a known hashed code for testing
    hashed_code = Bcrypt.hash_pwd_salt(code)

    token
    |> Ecto.Changeset.change(%{code: hashed_code})
    |> Repo.update!()

    code
  end
end
