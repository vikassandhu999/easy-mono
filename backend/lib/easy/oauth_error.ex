defmodule Easy.OAuthError do
  @moduledoc """
  OAuth 2.0 compliant error responses per RFC 6749.

  This module provides standardized error responses for OAuth endpoints,
  ensuring compliance with RFC 6749 Section 5.2 (Error Response).

  ## Error Codes

  - `invalid_request` - The request is missing a required parameter, includes an
    unsupported parameter value, repeats a parameter, or is otherwise malformed.
  - `invalid_grant` - The provided authorization grant (e.g., OTP code) is invalid,
    expired, revoked, or was issued to another client.
  - `invalid_token` - The access token or refresh token is invalid, expired, or revoked.
  - `slow_down` - The client is making requests too frequently (rate limiting).
  - `unauthorized_client` - The client is not authorized to use this grant type.

  ## Response Format

  All OAuth errors follow this JSON structure:
  ```json
  {
    "error": "invalid_grant",
    "error_description": "The provided OTP code is invalid or has expired"
  }
  ```

  ## HTTP Status Codes

  - 400 Bad Request: invalid_request, invalid_grant, unauthorized_client
  - 401 Unauthorized: invalid_token
  - 429 Too Many Requests: slow_down
  """

  defstruct [:error, :error_description, :status]

  @type error_code ::
          :invalid_request
          | :invalid_grant
          | :invalid_token
          | :slow_down
          | :unauthorized_client

  @type t :: %__MODULE__{
          error: String.t(),
          error_description: String.t(),
          status: integer()
        }

  @doc """
  Creates an invalid_request error.

  Used when the request is missing required parameters or is malformed.

  ## Examples

      iex> Easy.OAuthError.invalid_request("Missing required parameter: email")
      %Easy.OAuthError{
        error: "invalid_request",
        error_description: "Missing required parameter: email",
        status: 400
      }
  """
  @spec invalid_request(String.t()) :: t()
  def invalid_request(description) do
    %__MODULE__{
      error: "invalid_request",
      error_description: description,
      status: 400
    }
  end

  @doc """
  Creates an invalid_grant error.

  Used when the OTP code or authorization grant is invalid, expired, or revoked.

  ## Examples

      iex> Easy.OAuthError.invalid_grant("The provided OTP code is invalid")
      %Easy.OAuthError{
        error: "invalid_grant",
        error_description: "The provided OTP code is invalid",
        status: 400
      }
  """
  @spec invalid_grant(String.t()) :: t()
  def invalid_grant(description) do
    %__MODULE__{
      error: "invalid_grant",
      error_description: description,
      status: 400
    }
  end

  @doc """
  Creates an invalid_token error.

  Used when the access token or refresh token is invalid, expired, or revoked.

  ## Examples

      iex> Easy.OAuthError.invalid_token("The access token is invalid or has expired")
      %Easy.OAuthError{
        error: "invalid_token",
        error_description: "The access token is invalid or has expired",
        status: 401
      }
  """
  @spec invalid_token(String.t()) :: t()
  def invalid_token(description) do
    %__MODULE__{
      error: "invalid_token",
      error_description: description,
      status: 401
    }
  end

  @doc """
  Creates a slow_down error for rate limiting.

  Used when the client has exceeded the rate limit for OTP requests.

  ## Examples

      iex> Easy.OAuthError.slow_down("Rate limit exceeded. Please try again in 300 seconds")
      %Easy.OAuthError{
        error: "slow_down",
        error_description: "Rate limit exceeded. Please try again in 300 seconds",
        status: 429
      }

      iex> Easy.OAuthError.slow_down(300)
      %Easy.OAuthError{
        error: "slow_down",
        error_description: "Rate limit exceeded. Please try again in 300 seconds",
        status: 429
      }
  """
  @spec slow_down(String.t() | integer()) :: t()
  def slow_down(description) when is_binary(description) do
    %__MODULE__{
      error: "slow_down",
      error_description: description,
      status: 429
    }
  end

  def slow_down(retry_after_seconds) when is_integer(retry_after_seconds) do
    %__MODULE__{
      error: "slow_down",
      error_description:
        "Rate limit exceeded. Please try again in #{retry_after_seconds} seconds",
      status: 429
    }
  end

  @doc """
  Creates an unauthorized_client error.

  Used when the client is not authorized to use the requested grant type.

  ## Examples

      iex> Easy.OAuthError.unauthorized_client("Client not authorized for this grant type")
      %Easy.OAuthError{
        error: "unauthorized_client",
        error_description: "Client not authorized for this grant type",
        status: 400
      }
  """
  @spec unauthorized_client(String.t()) :: t()
  def unauthorized_client(description) do
    %__MODULE__{
      error: "unauthorized_client",
      error_description: description,
      status: 400
    }
  end

  @doc """
  Converts an OAuthError struct to a JSON-serializable map.

  ## Examples

      iex> error = Easy.OAuthError.invalid_grant("Invalid OTP")
      iex> Easy.OAuthError.to_json(error)
      %{
        error: "invalid_grant",
        error_description: "Invalid OTP"
      }
  """
  @spec to_json(t()) :: map()
  def to_json(%__MODULE__{} = oauth_error) do
    %{
      error: oauth_error.error,
      error_description: oauth_error.error_description
    }
  end

  @doc """
  Returns the HTTP status code for the error.

  ## Examples

      iex> error = Easy.OAuthError.invalid_token("Token expired")
      iex> Easy.OAuthError.status(error)
      401
  """
  @spec status(t()) :: integer()
  def status(%__MODULE__{status: status}), do: status
end
