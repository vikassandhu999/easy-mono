defmodule EasyWeb.FallbackController do
  @moduledoc """
  Centralized error handling for API controllers.

  This controller handles errors returned from controller actions via the
  `action_fallback` mechanism. It provides consistent error responses across
  all API endpoints.

  ## Supported Error Types

  - `{:error, %Ecto.Changeset{}}` - Validation errors (422)
  - `{:error, %Easy.ApiError{}}` - Structured API errors
  - `{:error, atom}` - Common error atoms (404, 401, 403, etc.)
  - `{:error, string}` - Generic error messages (422)

  ## Error Response Format

  All errors are rendered in a consistent format:

  ```json
  {
    "error": {
      "message": "Human-readable error message",
      "code": "machine_readable_error_code",
      "details": {...}
    }
  }
  ```
  """

  use EasyWeb, :controller

  require Logger

  alias Easy.ApiError
  alias EasyWeb.ApiHelpers

  # ============================================
  # STRUCTURED ERROR TYPES
  # ============================================

  @doc """
  Handles Ecto changeset validation errors.

  Returns a 422 Unprocessable Entity response with field-level error details.
  """
  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    ApiHelpers.render_validation_error(conn, changeset)
  end

  # Handles structured ApiError responses
  def call(conn, {:error, %ApiError{} = error}) do
    ApiHelpers.render_api_error(conn, error)
  end

  # ============================================
  # COMMON ERROR ATOMS (400-499)
  # ============================================

  # Handles :bad_request errors (400)
  def call(conn, {:error, :bad_request}) do
    error = ApiError.bad_request("Bad request")
    ApiHelpers.render_api_error(conn, error)
  end

  # Handles :unauthorized errors (401)
  def call(conn, {:error, :unauthorized}) do
    error = ApiError.unauthorized("Authentication required")
    ApiHelpers.render_api_error(conn, error)
  end

  # Handles :forbidden errors (403)
  def call(conn, {:error, :forbidden}) do
    error = ApiError.forbidden("Access denied")
    ApiHelpers.render_api_error(conn, error)
  end

  # Handles :not_found errors (404)
  def call(conn, {:error, :not_found}) do
    error = ApiError.not_found("Resource")
    ApiHelpers.render_api_error(conn, error)
  end

  # Handles :unprocessable_entity errors (422)
  def call(conn, {:error, :unprocessable_entity}) do
    error = ApiError.unprocessable_entity("Unprocessable entity")
    ApiHelpers.render_api_error(conn, error)
  end

  # Handles :rate_limited errors (429)
  def call(conn, {:error, :rate_limited}) do
    error = ApiError.rate_limited("Too many requests. Please try again later.")
    ApiHelpers.render_api_error(conn, error)
  end

  def call(conn, {:error, :rate_limited, retry_after}) when is_integer(retry_after) do
    error = ApiError.rate_limited(retry_after)
    ApiHelpers.render_api_error(conn, error)
  end

  # ============================================
  # DOMAIN-SPECIFIC ERROR ATOMS
  # ============================================

  # Handles token-related errors
  def call(conn, {:error, :token_not_found}) do
    error = ApiError.not_found("Token")
    ApiHelpers.render_api_error(conn, error)
  end

  def call(conn, {:error, :token_expired}) do
    error = ApiError.unprocessable_entity("Token has expired. Please request a new OTP.")
    ApiHelpers.render_api_error(conn, error)
  end

  def call(conn, {:error, :token_already_used}) do
    error =
      ApiError.unprocessable_entity("Token has already been used. Please request a new OTP.")

    ApiHelpers.render_api_error(conn, error)
  end

  def call(conn, {:error, :invalid_otp}) do
    error = ApiError.unauthorized("Invalid OTP code. Please try again.")
    ApiHelpers.render_api_error(conn, error)
  end

  # Handles session-related errors
  def call(conn, {:error, :session_not_found}) do
    error = ApiError.not_found("Session")
    ApiHelpers.render_api_error(conn, error)
  end

  def call(conn, {:error, :session_expired}) do
    error = ApiError.unauthorized("Session has expired")
    ApiHelpers.render_api_error(conn, error)
  end

  def call(conn, {:error, :refresh_failed}) do
    error = ApiError.internal_server_error("Failed to refresh session")
    ApiHelpers.render_api_error(conn, error)
  end

  # Handles role/permission-related errors
  def call(conn, {:error, :role_not_found}) do
    error = ApiError.forbidden("User does not have the required role")
    ApiHelpers.render_api_error(conn, error)
  end

  # ============================================
  # GENERIC ERROR HANDLERS
  # ============================================

  # Handles errors with string messages
  def call(conn, {:error, message}) when is_binary(message) do
    error = ApiError.unprocessable_entity(message)
    ApiHelpers.render_api_error(conn, error)
  end

  # Handles unexpected error formats
  def call(conn, {:error, reason}) do
    Logger.error("Unhandled error in FallbackController: #{inspect(reason)}")

    error = ApiError.internal_server_error("An unexpected error occurred")
    ApiHelpers.render_api_error(conn, error)
  end

  # Handles nil responses (shouldn't happen but provides safety)
  def call(conn, nil) do
    Logger.error("Controller action returned nil")

    error = ApiError.internal_server_error("An unexpected error occurred")
    ApiHelpers.render_api_error(conn, error)
  end

  # Catch-all for any other unexpected responses
  def call(conn, other) do
    Logger.error("Unexpected response in FallbackController: #{inspect(other)}")

    error = ApiError.internal_server_error("An unexpected error occurred")
    ApiHelpers.render_api_error(conn, error)
  end
end
