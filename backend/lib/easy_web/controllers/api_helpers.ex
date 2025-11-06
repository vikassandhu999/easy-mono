defmodule EasyWeb.ApiHelpers do
  @moduledoc """
  Helper functions for API controllers.

  Provides utilities for rendering standardized API error responses
  and handling common API operations.
  """

  import Plug.Conn
  import Phoenix.Controller

  alias Easy.ApiError

  @doc """
  Renders a standardized API error response.

  This function takes an ApiError struct and renders it as a JSON response
  with the appropriate HTTP status code and headers.

  ## Examples

      error = ApiError.not_found("Business")
      render_api_error(conn, error)

  ## Response Format

  ```json
  {
    "error": {
      "message": "Business not found",
      "code": "not_found",
      "details": null
    }
  }
  ```

  For errors with headers (like 401 or 429), the appropriate headers are automatically added.
  """
  @spec render_api_error(Plug.Conn.t(), ApiError.t()) :: Plug.Conn.t()
  def render_api_error(conn, %ApiError{} = api_error) do
    conn = maybe_add_headers(conn, api_error)

    conn
    |> put_status(ApiError.status(api_error))
    |> json(ApiError.to_json(api_error))
  end

  @doc """
  Renders a validation error from an Ecto changeset.

  Convenience function that creates an ApiError from a changeset and renders it.

  ## Examples

      render_validation_error(conn, changeset)

  ## Response Format

  ```json
  {
    "error": {
      "message": "Validation failed",
      "code": "validation_error",
      "details": {
        "email": ["has already been taken"],
        "full_name": ["can't be blank"]
      }
    }
  }
  ```
  """
  @spec render_validation_error(Plug.Conn.t(), Ecto.Changeset.t()) :: Plug.Conn.t()
  def render_validation_error(conn, %Ecto.Changeset{} = changeset) do
    error = ApiError.validation_error(changeset)
    render_api_error(conn, error)
  end

  @doc """
  Renders a not found error.

  Convenience function for rendering 404 errors.

  ## Examples

      render_not_found(conn, "Business")
      render_not_found(conn)  # Uses "Resource" as default
  """
  @spec render_not_found(Plug.Conn.t(), String.t()) :: Plug.Conn.t()
  def render_not_found(conn, resource \\ "Resource") do
    error = ApiError.not_found(resource)
    render_api_error(conn, error)
  end

  @doc """
  Renders a forbidden error.

  Convenience function for rendering 403 errors.

  ## Examples

      render_forbidden(conn, "You do not have permission to access this resource")
      render_forbidden(conn)  # Uses "Access denied" as default
  """
  @spec render_forbidden(Plug.Conn.t(), String.t()) :: Plug.Conn.t()
  def render_forbidden(conn, message \\ "Access denied") do
    error = ApiError.forbidden(message)
    render_api_error(conn, error)
  end

  @doc """
  Renders an unauthorized error.

  Convenience function for rendering 401 errors with WWW-Authenticate header.

  ## Examples

      render_unauthorized(conn, "Invalid token")
      render_unauthorized(conn)  # Uses "Authentication required" as default
  """
  @spec render_unauthorized(Plug.Conn.t(), String.t()) :: Plug.Conn.t()
  def render_unauthorized(conn, message \\ "Authentication required") do
    error = ApiError.unauthorized(message)
    render_api_error(conn, error)
  end

  @doc """
  Renders a bad request error.

  Convenience function for rendering 400 errors.

  ## Examples

      render_bad_request(conn, "Invalid email format")
  """
  @spec render_bad_request(Plug.Conn.t(), String.t(), map() | nil) :: Plug.Conn.t()
  def render_bad_request(conn, message, details \\ nil) do
    error = ApiError.bad_request(message, details)
    render_api_error(conn, error)
  end

  @doc """
  Renders a rate limit error.

  Convenience function for rendering 429 errors with Retry-After header.

  ## Examples

      render_rate_limited(conn, 300)  # Retry after 300 seconds
  """
  @spec render_rate_limited(Plug.Conn.t(), integer()) :: Plug.Conn.t()
  def render_rate_limited(conn, retry_after) when is_integer(retry_after) do
    error = ApiError.rate_limited(retry_after)
    render_api_error(conn, error)
  end

  @doc """
  Validates that a required parameter is present in the params map.

  Returns `{:ok, value}` if the parameter exists and is not empty,
  otherwise returns `{:error, ApiError.t()}` with a bad_request error.

  ## Examples

      iex> validate_required_param(%{"email" => "test@example.com"}, "email")
      {:ok, "test@example.com"}

      iex> validate_required_param(%{}, "email")
      {:error, %ApiError{status: 400, message: "Missing required parameter: email"}}

      iex> validate_required_param(%{"email" => ""}, "email")
      {:error, %ApiError{status: 400, message: "Parameter cannot be empty: email"}}
  """
  @spec validate_required_param(map(), String.t()) ::
          {:ok, String.t()} | {:error, ApiError.t()}
  def validate_required_param(params, key) do
    case Map.get(params, key) do
      nil ->
        {:error, ApiError.bad_request("Missing required parameter: #{key}")}

      "" ->
        {:error, ApiError.bad_request("Parameter cannot be empty: #{key}")}

      value ->
        {:ok, value}
    end
  end

  # Private Functions

  # Adds headers from ApiError to the connection if present
  defp maybe_add_headers(conn, %ApiError{headers: nil}), do: conn

  defp maybe_add_headers(conn, %ApiError{headers: headers}) do
    Enum.reduce(headers, conn, fn {key, value}, acc ->
      put_resp_header(acc, key, value)
    end)
  end
end
