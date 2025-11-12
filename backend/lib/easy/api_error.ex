defmodule Easy.ApiError do
  @moduledoc """
  Standardized API error structure and helpers for all API endpoints.

  This module provides a consistent error response format for all API endpoints.

  ## Error Response Format

  All API errors follow this JSON structure:
  ```json
  {
    "error": {
      "message": "Human-readable error message",
      "code": "MACHINE_READABLE_ERROR_CODE",
      "details": {
        "field_name": ["error message"]
      }
    }
  }
  ```

  ## HTTP Status Codes

  - 400 Bad Request: Invalid request parameters or malformed data
  - 401 Unauthorized: Authentication required (includes WWW-Authenticate header)
  - 403 Forbidden: Authenticated but insufficient permissions
  - 404 Not Found: Resource does not exist
  - 410 Gone: Resource existed but is no longer available (expired tokens)
  - 422 Unprocessable Entity: Validation errors or business logic failures
  - 429 Too Many Requests: Rate limit exceeded (includes Retry-After header)
  - 500 Internal Server Error: Unexpected server errors

  ## Usage

      # Validation error from changeset
      error = ApiError.validation_error(changeset)

      # Not found error
      error = ApiError.not_found("Business")

      # Authorization error
      error = ApiError.forbidden("You do not have permission to access this resource")

      # Rate limit error
      error = ApiError.rate_limited(300)
  """

  defstruct [:status, :code, :message, :details, :headers]

  @type t :: %__MODULE__{
          status: integer(),
          code: String.t(),
          message: String.t(),
          details: map() | nil,
          headers: [{String.t(), String.t()}] | nil
        }

  @doc """
  Creates a new ApiError struct.

  ## Examples

      iex> ApiError.new(404, "NOT_FOUND", "Resource not found")
      %ApiError{status: 404, code: "NOT_FOUND", message: "Resource not found"}
  """
  @spec new(integer(), String.t(), String.t(), map() | nil, list() | nil) :: t()
  def new(status, code, message, details \\ nil, headers \\ nil) do
    %__MODULE__{
      status: status,
      code: code,
      message: message,
      details: details,
      headers: headers
    }
  end

  @doc """
  Creates a bad request error (400).

  Used when the request is malformed or contains invalid parameters.

  ## Examples

      iex> ApiError.bad_request("Invalid email format")
      %ApiError{status: 400, code: "BAD_REQUEST", message: "Invalid email format"}

      iex> ApiError.bad_request("Missing parameters", %{required: ["email", "name"]})
      %ApiError{status: 400, code: "BAD_REQUEST", message: "Missing parameters", details: %{required: ["email", "name"]}}
  """
  @spec bad_request(String.t(), map() | nil) :: t()
  def bad_request(message, details \\ nil) do
    new(400, "BAD_REQUEST", message, details)
  end

  @doc """
  Creates an unauthorized error (401).

  Used when authentication is required but not provided or invalid.
  Automatically includes WWW-Authenticate: Bearer header.

  ## Examples

      iex> ApiError.unauthorized()
      %ApiError{status: 401, code: "UNAUTHORIZED", message: "Authentication required"}

      iex> ApiError.unauthorized("Invalid token")
      %ApiError{status: 401, code: "UNAUTHORIZED", message: "Invalid token"}
  """
  @spec unauthorized(String.t()) :: t()
  def unauthorized(message \\ "Authentication required") do
    new(401, "UNAUTHORIZED", message, nil, [{"www-authenticate", "Bearer"}])
  end

  @doc """
  Creates a forbidden error (403).

  Used when the user is authenticated but lacks permission for the requested action.

  ## Examples

      iex> ApiError.forbidden()
      %ApiError{status: 403, code: "FORBIDDEN", message: "Access denied"}

      iex> ApiError.forbidden("You do not have permission to update this resource")
      %ApiError{status: 403, code: "FORBIDDEN", message: "You do not have permission to update this resource"}
  """
  @spec forbidden(String.t()) :: t()
  def forbidden(message \\ "Access denied") do
    new(403, "FORBIDDEN", message)
  end

  @doc """
  Creates a not found error (404).

  Used when the requested resource does not exist.

  ## Examples

      iex> ApiError.not_found()
      %ApiError{status: 404, code: "NOT_FOUND", message: "Resource not found"}

      iex> ApiError.not_found("Business")
      %ApiError{status: 404, code: "NOT_FOUND", message: "Business not found"}
  """
  @spec not_found(String.t()) :: t()
  def not_found(resource \\ "Resource") do
    new(404, "NOT_FOUND", "#{resource} not found")
  end

  @doc """
  Creates a conflict error (409).

  Used when the request conflicts with the current state of the resource.

  ## Examples

      iex> ApiError.conflict("Email already exists")
      %ApiError{status: 409, code: "CONFLICT", message: "Email already exists"}
  """
  @spec conflict(String.t(), map() | nil) :: t()
  def conflict(message, details \\ nil) do
    new(409, "CONFLICT", message, details)
  end

  @doc """
  Creates an unprocessable entity error (422).

  Used for business logic errors that are not validation errors.

  ## Examples

      iex> ApiError.unprocessable_entity("Cannot delete active subscription")
      %ApiError{status: 422, code: "UNPROCESSABLE_ENTITY", message: "Cannot delete active subscription"}
  """
  @spec unprocessable_entity(String.t(), map() | nil) :: t()
  def unprocessable_entity(message, details \\ nil) do
    new(422, "UNPROCESSABLE_ENTITY", message, details)
  end

  @doc """
  Creates a rate limit error (429).

  Used when the client has exceeded rate limits.
  Automatically includes Retry-After header.

  ## Examples

      iex> ApiError.rate_limited(300)
      %ApiError{
        status: 429,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Rate limit exceeded. Please try again in 300 seconds",
        details: %{retry_after: 300},
        headers: [{"retry-after", "300"}]
      }

      iex> ApiError.rate_limited("Too many requests")
      %ApiError{status: 429, code: "RATE_LIMIT_EXCEEDED", message: "Too many requests"}
  """
  @spec rate_limited(String.t() | integer()) :: t()
  def rate_limited(retry_after) when is_integer(retry_after) do
    new(
      429,
      "RATE_LIMIT_EXCEEDED",
      "Rate limit exceeded. Please try again in #{retry_after} seconds",
      %{retry_after: retry_after},
      [{"retry-after", to_string(retry_after)}]
    )
  end

  def rate_limited(message) when is_binary(message) do
    new(429, "RATE_LIMIT_EXCEEDED", message)
  end

  @doc """
  Creates an internal server error (500).

  Used for unexpected server errors. The message should be sanitized
  to avoid leaking sensitive information.

  ## Examples

      iex> ApiError.internal_server_error()
      %ApiError{status: 500, code: "INTERNAL_ERROR", message: "Internal server error"}

      iex> ApiError.internal_server_error("Database connection failed")
      %ApiError{status: 500, code: "INTERNAL_ERROR", message: "Database connection failed"}
  """
  @spec internal_server_error(String.t()) :: t()
  def internal_server_error(message \\ "Internal server error") do
    new(500, "INTERNAL_ERROR", message)
  end

  @doc """
  Creates a validation error (422) from an Ecto changeset.

  Extracts field-level validation errors from the changeset and formats them
  in a structured way for the API response.

  ## Examples

      iex> changeset = User.changeset(%User{}, %{})
      iex> ApiError.validation_error(changeset)
      %ApiError{
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: %{
          email: ["can't be blank"],
          full_name: ["can't be blank"]
        }
      }
  """
  @spec validation_error(Ecto.Changeset.t()) :: t()
  def validation_error(%Ecto.Changeset{} = changeset) do
    details = changeset_errors_to_map(changeset)
    new(422, "VALIDATION_ERROR", "Validation failed", details)
  end

  @doc """
  Converts an ApiError struct to a JSON-serializable map.

  ## Examples

      iex> error = ApiError.not_found("Business")
      iex> ApiError.to_json(error)
      %{
        error: %{
          message: "Business not found",
          code: "not_found",
          details: nil
        }
      }
  """
  @spec to_json(t()) :: map()
  def to_json(%__MODULE__{} = api_error) do
    %{
      error: %{
        message: api_error.message,
        code: api_error.code,
        details: api_error.details
      }
    }
  end

  @doc """
  Returns the HTTP status code for the error.

  ## Examples

      iex> error = ApiError.not_found("Business")
      iex> ApiError.status(error)
      404
  """
  @spec status(t()) :: integer()
  def status(%__MODULE__{status: status}), do: status

  @doc """
  Returns the HTTP headers for the error (if any).

  ## Examples

      iex> error = ApiError.unauthorized()
      iex> ApiError.headers(error)
      [{"www-authenticate", "Bearer"}]

      iex> error = ApiError.not_found()
      iex> ApiError.headers(error)
      nil
  """
  @spec headers(t()) :: [{String.t(), String.t()}] | nil
  def headers(%__MODULE__{headers: headers}), do: headers

  # Private helper to convert changeset errors to a map
  defp changeset_errors_to_map(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)
  end
end
