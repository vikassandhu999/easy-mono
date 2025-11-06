defmodule EasyWeb.Plugs.ApiErrorHandler do
  @moduledoc """
  Custom error handler for API routes that catches exceptions and returns JSON responses.

  This plug wraps the request in a try/catch and ensures that any exceptions
  are converted to proper JSON error responses instead of HTML error pages.

  Use this in your endpoint or router to ensure API routes always return JSON.

  ## Handled Exception Types

  - `Ecto.NoResultsError` - Returns 404 Not Found
  - `Ecto.InvalidChangesetError` - Returns 422 Validation Error
  - `Phoenix.Router.NoRouteError` - Returns 404 Not Found
  - `Ecto.ConstraintError` - Returns 422 Constraint Violation
  - `DBConnection.ConnectionError` - Returns 503 Service Unavailable
  - All other exceptions - Returns 500 Internal Server Error
  """

  require Logger

  alias Easy.ApiError
  alias EasyWeb.ApiHelpers

  def init(opts), do: opts

  def call(conn, _opts) do
    try do
      conn
    catch
      kind, reason ->
        handle_error(conn, kind, reason, __STACKTRACE__)
    end
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  defp handle_error(conn, kind, reason, stack) do
    # Log the error for debugging
    Logger.error("""
    [ApiErrorHandler] Caught #{kind}:
    #{Exception.format(kind, reason, stack)}
    """)

    # Convert exception to ApiError
    error = exception_to_api_error(kind, reason)

    # Send JSON error response
    ApiHelpers.render_api_error(conn, error)
  end

  # Converts exceptions to ApiError structs
  defp exception_to_api_error(:error, %Ecto.NoResultsError{}) do
    ApiError.not_found("Resource")
  end

  defp exception_to_api_error(:error, %Ecto.InvalidChangesetError{changeset: changeset}) do
    ApiError.validation_error(changeset)
  end

  defp exception_to_api_error(:error, %Phoenix.Router.NoRouteError{}) do
    ApiError.not_found("Route")
  end

  defp exception_to_api_error(:error, %ArgumentError{}) do
    # This catches DateTime truncation errors and other argument errors
    ApiError.internal_server_error("Internal server error")
  end

  defp exception_to_api_error(:error, %Ecto.ConstraintError{}) do
    ApiError.unprocessable_entity("Database constraint violation")
  end

  defp exception_to_api_error(:error, %DBConnection.ConnectionError{}) do
    %ApiError{
      status: 503,
      code: "service_unavailable",
      message: "Database connection error",
      details: nil,
      headers: nil
    }
  end

  defp exception_to_api_error(:throw, _value) do
    ApiError.internal_server_error("Internal server error")
  end

  defp exception_to_api_error(:exit, _reason) do
    ApiError.internal_server_error("Internal server error")
  end

  defp exception_to_api_error(_kind, _reason) do
    ApiError.internal_server_error("An unexpected error occurred")
  end
end
