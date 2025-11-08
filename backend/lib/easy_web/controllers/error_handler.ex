defmodule EasyWeb.ErrorHandler do
  @moduledoc """
  Centralized error handling for controllers.

  This module provides helper functions to handle common error patterns
  from service methods and convert them to appropriate HTTP responses.

  ## Usage

  In your controller:

      use EasyWeb, :controller
      import EasyWeb.ErrorHandler

      def show(conn, %{"id" => id}) do
        scope = conn.assigns[:scope]

        case MyContext.get_resource(scope, id) do
          {:ok, resource} ->
            json(conn, %{resource: resource})

          {:error, reason} ->
            handle_error(conn, reason)
        end
      end

  ## Supported Error Types

  ### Authorization Errors (403 Forbidden)
  - `:forbidden` - General permission denied
  - `:business_mismatch` - Resource belongs to different business
  - `:missing_context` - Business context required but not present

  ### Authentication Errors (401 Unauthorized)
  - `:missing_token` - No authorization header
  - `:invalid_token` - Token signature invalid or malformed
  - `:expired_token` - Token has expired

  ### Resource Errors
  - `:not_found` - Resource does not exist (404)
  - `%Ecto.Changeset{}` - Validation errors (422)

  ### Other Errors
  - Any other atom or string - Unprocessable entity (422)
  """

  import Plug.Conn
  import Phoenix.Controller, only: [json: 2]

  alias Easy.ApiError

  @doc """
  Handles an error from a service method and returns an appropriate HTTP response.

  ## Examples

      # Authorization error
      handle_error(conn, :forbidden)
      # => 403 Forbidden

      # Resource not found
      handle_error(conn, :not_found)
      # => 404 Not Found

      # Validation error
      handle_error(conn, changeset)
      # => 422 Unprocessable Entity with validation details
  """
  @spec handle_error(Plug.Conn.t(), atom() | Ecto.Changeset.t() | String.t()) :: Plug.Conn.t()
  def handle_error(conn, error)

  # ============================================
  # AUTHORIZATION ERRORS (403 Forbidden)
  # ============================================

  def handle_error(conn, :forbidden) do
    error = ApiError.from_code(:forbidden, nil, nil)
    render_error(conn, error)
  end

  def handle_error(conn, {:forbidden, message}) when is_binary(message) do
    error = ApiError.from_code(:forbidden, message, nil)
    render_error(conn, error)
  end

  def handle_error(conn, :business_mismatch) do
    error = ApiError.from_code(:business_mismatch, nil, nil)
    render_error(conn, error)
  end

  def handle_error(conn, {:business_mismatch, details}) when is_map(details) do
    error = ApiError.from_code(:business_mismatch, nil, details)
    render_error(conn, error)
  end

  def handle_error(conn, :missing_context) do
    error = ApiError.from_code(:missing_context, nil, nil)
    render_error(conn, error)
  end

  def handle_error(conn, {:missing_context, message}) when is_binary(message) do
    error = ApiError.from_code(:missing_context, message, nil)
    render_error(conn, error)
  end

  # ============================================
  # AUTHENTICATION ERRORS (401 Unauthorized)
  # ============================================

  def handle_error(conn, :missing_token) do
    error = ApiError.from_code(:missing_token, nil, nil)
    render_error(conn, error)
  end

  def handle_error(conn, :invalid_token) do
    error = ApiError.from_code(:invalid_token, nil, nil)
    render_error(conn, error)
  end

  def handle_error(conn, :expired_token) do
    error = ApiError.from_code(:expired_token, nil, nil)
    render_error(conn, error)
  end

  def handle_error(conn, :unauthorized) do
    error = ApiError.unauthorized()
    render_error(conn, error)
  end

  def handle_error(conn, {:unauthorized, message}) when is_binary(message) do
    error = ApiError.unauthorized(message)
    render_error(conn, error)
  end

  # ============================================
  # RESOURCE ERRORS
  # ============================================

  def handle_error(conn, :not_found) do
    error = ApiError.not_found()
    render_error(conn, error)
  end

  def handle_error(conn, {:not_found, resource}) when is_binary(resource) do
    error = ApiError.not_found(resource)
    render_error(conn, error)
  end

  # ============================================
  # VALIDATION ERRORS (422)
  # ============================================

  def handle_error(conn, %Ecto.Changeset{} = changeset) do
    error = ApiError.validation_error(changeset)
    render_error(conn, error)
  end

  # ============================================
  # GENERIC ERRORS
  # ============================================

  # Handle generic atom errors as unprocessable entity
  def handle_error(conn, reason) when is_atom(reason) do
    error = ApiError.unprocessable_entity("Operation failed", %{reason: Atom.to_string(reason)})
    render_error(conn, error)
  end

  # Handle string errors as unprocessable entity
  def handle_error(conn, reason) when is_binary(reason) do
    error = ApiError.unprocessable_entity(reason)
    render_error(conn, error)
  end

  # Handle tuple errors with details
  def handle_error(conn, {reason, details}) when is_atom(reason) and is_map(details) do
    error =
      ApiError.unprocessable_entity("Operation failed", Map.put(details, :reason, reason))

    render_error(conn, error)
  end

  # Fallback for unknown error types
  def handle_error(conn, _reason) do
    error = ApiError.internal_server_error()
    render_error(conn, error)
  end

  # ============================================
  # PRIVATE HELPERS
  # ============================================

  # Renders an API error response
  defp render_error(conn, %ApiError{} = error) do
    conn = maybe_add_headers(conn, error)

    conn
    |> put_status(error.status)
    |> json(ApiError.to_json(error))
  end

  # Adds headers from ApiError to the connection if present
  defp maybe_add_headers(conn, %ApiError{headers: nil}), do: conn

  defp maybe_add_headers(conn, %ApiError{headers: headers}) do
    Enum.reduce(headers, conn, fn {key, value}, acc ->
      put_resp_header(acc, key, value)
    end)
  end
end
