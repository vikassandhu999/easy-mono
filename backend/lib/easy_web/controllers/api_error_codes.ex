defmodule EasyWeb.ApiErrorCodes do
  @moduledoc """
  Centralized error code definitions for the API.

  This module defines all error codes used across the API, ensuring consistency
  and providing a single source of truth for error handling.

  ## Error Code Categories

  - Validation Errors (VALIDATION_*)
  - Authentication Errors (INVALID_*, TOKEN_*, SESSION_*)
  - Authorization Errors (UNAUTHORIZED, FORBIDDEN)
  - Resource Errors (NOT_FOUND, CONFLICT, ALREADY_*)
  - Rate Limiting Errors (RATE_LIMIT_*, MAX_ATTEMPTS_*)
  - Business Logic Errors (BUSINESS_*, INVITATION_*, METADATA_*)
  - Server Errors (INTERNAL_ERROR, *_FAILED)

  ## Usage

      alias EasyWeb.ApiErrorCodes

      # Get error details
      {code, message, status} = ApiErrorCodes.validation_error()

      # Create error with custom message
      {code, message, status} = ApiErrorCodes.token_expired("Your session has expired")
  """

  # ============================================
  # VALIDATION ERRORS (422)
  # ============================================

  @doc "Validation error - request data failed validation"
  def validation_error(message \\ "Validation failed") do
    {"VALIDATION_ERROR", message, 422}
  end

  # ============================================
  # AUTHENTICATION ERRORS
  # ============================================

  @doc "Invalid OTP code provided (400)"
  def invalid_otp(message \\ "The provided code is invalid or has expired") do
    {"INVALID_OTP", message, 400}
  end

  @doc "Token has expired (410)"
  def token_expired(message \\ "The token has expired") do
    {"TOKEN_EXPIRED", message, 410}
  end

  @doc "Token has already been used (410)"
  def token_used(message \\ "The token has already been used") do
    {"TOKEN_USED", message, 410}
  end

  @doc "Token not found (404)"
  def token_not_found(message \\ "Token not found") do
    {"TOKEN_NOT_FOUND", message, 404}
  end

  @doc "Invalid token type for operation (400)"
  def invalid_token_type(
        message \\ "Token type mismatch. This token cannot be used for this operation."
      ) do
    {"INVALID_TOKEN_TYPE", message, 400}
  end

  @doc "Invalid refresh token (401)"
  def invalid_refresh_token(message \\ "The refresh token is invalid or has expired") do
    {"INVALID_REFRESH_TOKEN", message, 401}
  end

  @doc "Invalid access token (401)"
  def invalid_token(message \\ "The access token is invalid or has expired") do
    {"INVALID_TOKEN", message, 401}
  end

  # ============================================
  # SESSION ERRORS
  # ============================================

  @doc "Session not found or revoked (401)"
  def session_not_found(message \\ "Session not found or has been revoked") do
    {"SESSION_NOT_FOUND", message, 401}
  end

  # ============================================
  # RATE LIMITING ERRORS (429)
  # ============================================

  @doc "Rate limit exceeded (429)"
  def rate_limit_exceeded(retry_after) when is_integer(retry_after) do
    message = "Rate limit exceeded. Please try again in #{retry_after} seconds"
    {"RATE_LIMIT_EXCEEDED", message, 429}
  end

  def rate_limit_exceeded(message) when is_binary(message) do
    {"RATE_LIMIT_EXCEEDED", message, 429}
  end

  @doc "Maximum OTP verification attempts exceeded (429)"
  def max_attempts_exceeded(message \\ "Maximum verification attempts exceeded") do
    {"MAX_ATTEMPTS_EXCEEDED", message, 429}
  end

  # ============================================
  # AUTHORIZATION ERRORS
  # ============================================

  @doc "Authentication required (401)"
  def unauthorized(message \\ "Authentication required") do
    {"UNAUTHORIZED", message, 401}
  end

  @doc "Insufficient permissions (403)"
  def forbidden(message \\ "Access denied") do
    {"FORBIDDEN", message, 403}
  end

  @doc "Business context mismatch (403)"
  def business_mismatch(message \\ "Resource does not belong to your business context") do
    {"BUSINESS_MISMATCH", message, 403}
  end

  @doc "Missing business context (403)"
  def missing_context(message \\ "Business context required for this operation") do
    {"MISSING_CONTEXT", message, 403}
  end

  @doc "Missing or invalid authorization header (401)"
  def missing_token(message \\ "Missing or invalid authorization header") do
    {"MISSING_TOKEN", message, 401}
  end

  @doc "Token has expired (401)"
  def expired_token(message \\ "The access token has expired") do
    {"EXPIRED_TOKEN", message, 401}
  end

  # ============================================
  # RESOURCE ERRORS
  # ============================================

  @doc "Resource not found (404)"
  def not_found(resource \\ "Resource") do
    message = "#{resource} not found"
    {"NOT_FOUND", message, 404}
  end

  @doc "User not found (404)"
  def user_not_found(message \\ "User not found") do
    {"USER_NOT_FOUND", message, 404}
  end

  @doc "Resource conflict (409)"
  def conflict(message) do
    {"CONFLICT", message, 409}
  end

  @doc "Resource already exists (422)"
  def already_exists(resource, message \\ nil) do
    msg = message || "#{resource} already exists"
    {"ALREADY_EXISTS", msg, 422}
  end

  @doc "Client already assigned to coach (422)"
  def already_assigned(message \\ "Client is already assigned to this coach") do
    {"ALREADY_ASSIGNED", message, 422}
  end

  # ============================================
  # BUSINESS LOGIC ERRORS
  # ============================================

  @doc "User already owns a business (422)"
  def business_exists(message \\ "User already owns a business") do
    {"BUSINESS_EXISTS", message, 422}
  end

  @doc "Invitation has expired (410)"
  def invitation_expired(message \\ "This invitation has expired") do
    {"INVITATION_EXPIRED", message, 410}
  end

  @doc "Invitation has been used (410)"
  def invitation_used(message \\ "This invitation has already been used") do
    {"INVITATION_USED", message, 410}
  end

  @doc "Invitation metadata validation failed (400)"
  def metadata_validation_failed(reason) do
    message = "Invitation metadata validation failed: #{reason}"
    {"METADATA_VALIDATION_FAILED", message, 400}
  end

  # ============================================
  # OPERATION ERRORS
  # ============================================

  @doc "OTP generation failed (422)"
  def otp_generation_failed(reason \\ "Failed to generate OTP") do
    {"OTP_GENERATION_FAILED", reason, 422}
  end

  @doc "OTP verification failed (422)"
  def otp_verification_failed(reason \\ "Failed to verify OTP") do
    {"OTP_VERIFICATION_FAILED", reason, 422}
  end

  @doc "Registration failed (422)"
  def registration_error(reason \\ "Registration failed") do
    {"REGISTRATION_ERROR", reason, 422}
  end

  @doc "Token refresh failed (401)"
  def refresh_failed(reason \\ "Failed to refresh token") do
    {"REFRESH_FAILED", reason, 401}
  end

  @doc "Logout failed (422)"
  def logout_failed(reason \\ "Failed to logout") do
    {"LOGOUT_FAILED", reason, 422}
  end

  # ============================================
  # SERVER ERRORS (500)
  # ============================================

  @doc "Internal server error (500)"
  def internal_error(message \\ "An error occurred while processing your request") do
    {"INTERNAL_ERROR", message, 500}
  end

  # ============================================
  # HELPER FUNCTIONS
  # ============================================

  @doc """
  Returns a list of all defined error codes.

  Useful for documentation and testing purposes.
  """
  def all_error_codes do
    [
      "VALIDATION_ERROR",
      "INVALID_OTP",
      "TOKEN_EXPIRED",
      "TOKEN_USED",
      "TOKEN_NOT_FOUND",
      "INVALID_TOKEN_TYPE",
      "INVALID_REFRESH_TOKEN",
      "INVALID_TOKEN",
      "SESSION_NOT_FOUND",
      "RATE_LIMIT_EXCEEDED",
      "MAX_ATTEMPTS_EXCEEDED",
      "UNAUTHORIZED",
      "FORBIDDEN",
      "BUSINESS_MISMATCH",
      "MISSING_CONTEXT",
      "MISSING_TOKEN",
      "EXPIRED_TOKEN",
      "NOT_FOUND",
      "USER_NOT_FOUND",
      "CONFLICT",
      "ALREADY_EXISTS",
      "ALREADY_ASSIGNED",
      "BUSINESS_EXISTS",
      "INVITATION_EXPIRED",
      "INVITATION_USED",
      "METADATA_VALIDATION_FAILED",
      "OTP_GENERATION_FAILED",
      "OTP_VERIFICATION_FAILED",
      "REGISTRATION_ERROR",
      "REFRESH_FAILED",
      "LOGOUT_FAILED",
      "INTERNAL_ERROR"
    ]
  end

  @doc """
  Checks if an error code is defined.

  ## Examples

      iex> ApiErrorCodes.valid_error_code?("VALIDATION_ERROR")
      true

      iex> ApiErrorCodes.valid_error_code?("UNKNOWN_ERROR")
      false
  """
  def valid_error_code?(code) do
    code in all_error_codes()
  end
end
