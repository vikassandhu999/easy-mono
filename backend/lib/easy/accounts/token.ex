defmodule Easy.Accounts.Token do
  @moduledoc """
  JWT token generation and validation using Joken.

  This module handles:
  - Access token generation (7 days expiry)
  - Refresh token generation (30 days expiry)
  - Token validation and verification
  - Claims extraction

  Tokens are signed using HS256 (HMAC with SHA-256) with a secret key
  configured in the application environment.
  """

  use Joken.Config

  # Token TTL is configured in config/config.exs under :easy, :jwt
  defp access_token_ttl do
    days = Application.get_env(:easy, :jwt)[:access_token_ttl_days] || 7
    days * 24 * 60 * 60
  end

  defp refresh_token_ttl do
    days = Application.get_env(:easy, :jwt)[:refresh_token_ttl_days] || 30
    days * 24 * 60 * 60
  end

  @doc """
  Generates an access token for a user with their roles.

  ## Parameters
    - user: The user struct
    - session_id: The session ID (jti claim)
    - roles: List of user roles (e.g., ["coach", "client"])

  ## Returns
    - {:ok, token} on success
    - {:error, reason} on failure

  ## Examples

      iex> generate_access_token(user, 123, ["coach"])
      {:ok, "eyJhbGc..."}
  """
  def generate_access_token(user, session_id, roles) do
    extra_claims = %{
      "sub" => to_string(user.id),
      "email" => user.email,
      "roles" => roles,
      "jti" => to_string(session_id),
      "type" => "access"
    }

    case generate_and_sign(extra_claims, signer(), access_token_ttl()) do
      {:ok, token, _claims} -> {:ok, token}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Generates a refresh token for a user.

  ## Parameters
    - user: The user struct
    - session_id: The session ID (jti claim)

  ## Returns
    - {:ok, token} on success
    - {:error, reason} on failure

  ## Examples

      iex> generate_refresh_token(user, 123)
      {:ok, "eyJhbGc..."}
  """
  def generate_refresh_token(user, session_id) do
    extra_claims = %{
      "sub" => to_string(user.id),
      "jti" => to_string(session_id),
      "type" => "refresh"
    }

    case generate_and_sign(extra_claims, signer(), refresh_token_ttl()) do
      {:ok, token, _claims} -> {:ok, token}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Verifies and validates a JWT token.

  ## Parameters
    - token: The JWT token string

  ## Returns
    - {:ok, claims} on success
    - {:error, reason} on failure

  ## Examples

      iex> verify_token("eyJhbGc...")
      {:ok, %{"sub" => "123", "email" => "user@example.com"}}
  """
  def verify_token(token) do
    verify_and_validate(token, signer())
  end

  @doc """
  Extracts the user ID from token claims.

  ## Examples

      iex> get_user_id(%{"sub" => "123"})
      123
  """
  def get_user_id(%{"sub" => sub}) when is_binary(sub) do
    String.to_integer(sub)
  end

  @doc """
  Extracts the session ID from token claims.

  ## Examples

      iex> get_session_id(%{"jti" => "456"})
      456
  """
  def get_session_id(%{"jti" => jti}) when is_binary(jti) do
    String.to_integer(jti)
  end

  # Private functions

  defp generate_and_sign(extra_claims, signer, ttl) do
    now = System.system_time(:second)

    claims =
      %{
        "iat" => now,
        "exp" => now + ttl
      }
      |> Map.merge(extra_claims)

    Joken.generate_and_sign(%{}, claims, signer)
  end

  defp signer do
    secret_key =
      Application.get_env(:easy, :jwt_secret) ||
        raise "JWT secret not configured"

    Joken.Signer.create("HS256", secret_key)
  end
end
