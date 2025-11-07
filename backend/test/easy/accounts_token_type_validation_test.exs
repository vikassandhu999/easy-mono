defmodule Easy.AccountsTokenTypeValidationTest do
  use Easy.DataCase, async: true

  alias Easy.Accounts
  alias Easy.Accounts.OneTimeToken

  describe "token type validation" do
    setup do
      email = "test@example.com"
      {:ok, email: email}
    end

    test "validate_token_type/2 returns :ok when types match", %{email: email} do
      {:ok, token_uuid} = Accounts.generate_otp(email, "login")
      token = Accounts.get_token_by_uuid(token_uuid)

      assert :ok = Accounts.validate_token_type(token, "login")
    end

    test "validate_token_type/2 returns error when types don't match", %{email: email} do
      {:ok, token_uuid} = Accounts.generate_otp(email, "email_verification")
      token = Accounts.get_token_by_uuid(token_uuid)

      assert {:error, :invalid_token_type, message} =
               Accounts.validate_token_type(token, "login")

      assert message =~ "Cannot use email verification token for login"
    end

    test "get_token_type_mismatch_message/2 returns clear error messages" do
      message = Accounts.get_token_type_mismatch_message("email_verification", "login")
      assert message =~ "Cannot use email verification token for login"

      message = Accounts.get_token_type_mismatch_message("login", "email_verification")
      assert message =~ "Cannot use login token for email verification"

      message = Accounts.get_token_type_mismatch_message("client_invitation", "login")
      assert message =~ "Cannot use client invitation token for login"
    end

    test "verify_otp/3 validates token type when expected_type is provided", %{
      email: email
    } do
      # Generate a login token
      {:ok, token_uuid} = Accounts.generate_otp(email, "login")
      token = Accounts.get_token_by_uuid(token_uuid)

      # Get the OTP code from the token (we need to extract it for testing)
      # In a real scenario, this would be sent via email
      code = "123456"

      # Try to verify with wrong expected type
      result = Accounts.verify_otp(token.id, code, "email_verification")
      assert {:error, :invalid_token_type} = result
    end

    test "verify_otp/3 allows verification when expected_type matches", %{
      email: email
    } do
      # Create a user first
      {:ok, _user} = Accounts.create_user(%{email: email, full_name: "Test User"})

      # Generate a login token
      {:ok, token_uuid} = Accounts.generate_otp(email, "login")
      token = Accounts.get_token_by_uuid(token_uuid)

      # For testing, we need to get the actual OTP code before it's hashed
      # In production, this would be sent via email
      # We'll verify with the correct type
      result = Accounts.verify_otp(token.id, "wrong_code", "login")

      # Should fail due to wrong code, not wrong type
      assert {:error, :invalid_otp} = result
    end

    test "verify_otp_by_email/4 validates token type when expected_type differs from type", %{
      email: email
    } do
      # Generate an email_verification token
      {:ok, _token_uuid} = Accounts.generate_otp(email, "email_verification")

      # Try to verify with different expected type
      result = Accounts.verify_otp_by_email(email, "123456", "email_verification", "login")
      assert {:error, :invalid_token_type} = result
    end
  end
end
