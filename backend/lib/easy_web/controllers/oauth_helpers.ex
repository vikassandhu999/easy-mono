defmodule EasyWeb.OAuthHelpers do
  @moduledoc """
  Helper functions for OAuth 2.0 controllers.

  Provides utilities for rendering OAuth-compliant error responses
  and handling common OAuth operations.
  """

  import Plug.Conn
  import Phoenix.Controller

  alias Easy.OAuthError

  @doc """
  Renders an OAuth 2.0 compliant error response.

  This function takes an OAuthError struct and renders it as a JSON response
  with the appropriate HTTP status code and RFC 6749 compliant format.

  ## Examples

      error = OAuthError.invalid_grant("The provided OTP code is invalid")
      render_oauth_error(conn, error)

  ## Response Format

  ```json
  {
    "error": "invalid_grant",
    "error_description": "The provided OTP code is invalid"
  }
  ```

  For invalid_token errors, the WWW-Authenticate header is automatically added.
  """
  @spec render_oauth_error(Plug.Conn.t(), OAuthError.t()) :: Plug.Conn.t()
  def render_oauth_error(conn, %OAuthError{} = oauth_error) do
    conn = maybe_add_www_authenticate_header(conn, oauth_error)

    conn
    |> put_status(OAuthError.status(oauth_error))
    |> json(OAuthError.to_json(oauth_error))
  end

  @doc """
  Validates that a required parameter is present in the params map.

  Returns `{:ok, value}` if the parameter exists and is not empty,
  otherwise returns `{:error, OAuthError.t()}` with an invalid_request error.

  ## Examples

      iex> validate_required_param(%{"email" => "test@example.com"}, "email")
      {:ok, "test@example.com"}

      iex> validate_required_param(%{}, "email")
      {:error, %OAuthError{error: "invalid_request", ...}}

      iex> validate_required_param(%{"email" => ""}, "email")
      {:error, %OAuthError{error: "invalid_request", ...}}
  """
  @spec validate_required_param(map(), String.t()) ::
          {:ok, String.t()} | {:error, OAuthError.t()}
  def validate_required_param(params, key) do
    case Map.get(params, key) do
      nil ->
        {:error, OAuthError.invalid_request("Missing required parameter: #{key}")}

      "" ->
        {:error, OAuthError.invalid_request("Parameter cannot be empty: #{key}")}

      value ->
        {:ok, value}
    end
  end

  @doc """
  Extracts the Bearer token from the Authorization header.

  Returns `{:ok, token}` if a valid Bearer token is found,
  otherwise returns `{:error, OAuthError.t()}` with an invalid_token error.

  ## Examples

      iex> conn = put_req_header(conn, "authorization", "Bearer abc123")
      iex> extract_bearer_token(conn)
      {:ok, "abc123"}

      iex> extract_bearer_token(conn)
      {:error, %OAuthError{error: "invalid_token", ...}}
  """
  @spec extract_bearer_token(Plug.Conn.t()) :: {:ok, String.t()} | {:error, OAuthError.t()}
  def extract_bearer_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] ->
        {:ok, token}

      _ ->
        {:error, OAuthError.invalid_token("Missing or invalid authorization header")}
    end
  end

  # Private Functions

  # Adds WWW-Authenticate header for invalid_token errors per RFC 6750
  defp maybe_add_www_authenticate_header(conn, %OAuthError{error: "invalid_token"}) do
    put_resp_header(conn, "www-authenticate", "Bearer")
  end

  defp maybe_add_www_authenticate_header(conn, _oauth_error), do: conn
end
