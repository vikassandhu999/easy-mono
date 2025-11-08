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
  Generates an access token for a user with their roles and business context.

  ## Parameters
    - user: The user struct
    - session_id: The session ID (jti claim)
    - roles: List of user roles (e.g., ["coach", "client"])
    - business_context: Map with business_id, coach_id, client_id (optional, defaults to %{})

  ## Returns
    - {:ok, token} on success
    - {:error, reason} on failure

  ## Examples

      iex> generate_access_token(user, 123, ["coach"], %{business_id: "uuid", coach_id: "uuid"})
      {:ok, "eyJhbGc..."}
  """
  def generate_access_token(user, session_id, roles, business_context \\ %{}) do
    extra_claims = %{
      "sub" => to_string(user.id),
      "email" => user.email,
      "roles" => roles,
      "jti" => to_string(session_id),
      "type" => "access"
    }

    # Add business context claims if present
    extra_claims =
      extra_claims
      |> maybe_add_claim("business_id", business_context[:business_id])
      |> maybe_add_claim("coach_id", business_context[:coach_id])
      |> maybe_add_claim("client_id", business_context[:client_id])

    case generate_and_sign(extra_claims, signer(), access_token_ttl()) do
      {:ok, token, _claims} -> {:ok, token}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Generates a refresh token for a user with business context.

  ## Parameters
    - user: The user struct
    - session_id: The session ID (jti claim)
    - business_context: Map with business_id (optional, defaults to %{})

  ## Returns
    - {:ok, token} on success
    - {:error, reason} on failure

  ## Examples

      iex> generate_refresh_token(user, 123, %{business_id: "uuid"})
      {:ok, "eyJhbGc..."}
  """
  def generate_refresh_token(user, session_id, business_context \\ %{}) do
    extra_claims = %{
      "sub" => to_string(user.id),
      "jti" => to_string(session_id),
      "type" => "refresh"
    }

    # Add business_id to refresh token if present
    extra_claims = maybe_add_claim(extra_claims, "business_id", business_context[:business_id])

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

  Returns the user ID as a UUID string.

  ## Examples

      iex> get_user_id(%{"sub" => "a1b2c3d4-e5f6-7890-abcd-ef1234567890"})
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  """
  def get_user_id(%{"sub" => sub}) when is_binary(sub) do
    sub
  end

  @doc """
  Extracts the session ID from token claims.

  Returns the session ID as a UUID string.

  ## Examples

      iex> get_session_id(%{"jti" => "b2c3d4e5-f6a7-8901-bcde-f12345678901"})
      "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  """
  def get_session_id(%{"jti" => jti}) when is_binary(jti) do
    jti
  end

  @doc """
  Extracts business context from token claims.

  Returns a map with business_id, coach_id, and client_id if present in claims.

  ## Examples

      iex> extract_business_context(%{"business_id" => "uuid1", "coach_id" => "uuid2"})
      %{business_id: "uuid1", coach_id: "uuid2", client_id: nil}

      iex> extract_business_context(%{})
      %{business_id: nil, coach_id: nil, client_id: nil}
  """
  def extract_business_context(claims) when is_map(claims) do
    %{
      business_id: Map.get(claims, "business_id"),
      coach_id: Map.get(claims, "coach_id"),
      client_id: Map.get(claims, "client_id")
    }
  end

  # Private functions

  defp maybe_add_claim(claims, _key, nil), do: claims

  defp maybe_add_claim(claims, key, value) when is_binary(value) do
    Map.put(claims, key, value)
  end

  defp generate_and_sign(extra_claims, signer, ttl) do
    now = System.system_time(:second)

    claims =
      %{
        "iat" => now,
        "exp" => now + ttl,
        "nonce" => Ecto.UUID.generate()
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
