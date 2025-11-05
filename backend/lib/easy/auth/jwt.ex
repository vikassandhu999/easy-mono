defmodule Easy.Auth.JWT do
  @moduledoc """
  JWT (JSON Web Token) creation and validation.

  Handles access token generation for authenticated sessions.
  Uses HS256 signing algorithm with configured secret key.
  """

  @access_token_expiry_minutes 60 * 2

  @doc """
  Creates a JWT access token for a user and session.

  ## Options
  - `:expiry_minutes` - Token expiry in minutes (default: 60)
  - `:issuer` - Token issuer (default: "easy_backend")
  - `:audience` - Token audience (default: "easy_app")
  """
  def create_access_token(user, session, opts \\ []) do
    expiry_minutes = Keyword.get(opts, :expiry_minutes, @access_token_expiry_minutes)
    issuer = Keyword.get(opts, :issuer, "easy_backend")
    audience = Keyword.get(opts, :audience, "easy_app")

    signer = Joken.Signer.create("HS256", get_jwt_secret())

    claims = build_claims(user, session, expiry_minutes, issuer, audience)

    case Joken.encode_and_sign(claims, signer) do
      {:ok, token, _claims} -> {:ok, token}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Validates a JWT access token.

  Returns {:ok, claims} if valid, {:error, reason} if invalid.
  """
  def validate_token(token) when is_binary(token) do
    signer = Joken.Signer.create("HS256", get_jwt_secret())

    case Joken.verify(token, signer) do
      {:ok, claims} ->
        if token_expired?(claims) do
          {:error, :token_expired}
        else
          {:ok, claims}
        end

      {:error, _reason} ->
        {:error, :invalid_token}
    end
  end

  @doc """
  Extracts claims from a token without verification.

  WARNING: Only use for debugging or when signature verification
  is not required. Always use validate_token/1 in production.
  """
  def peek_claims(token) when is_binary(token) do
    case Joken.peek_claims(token) do
      {:ok, claims} -> {:ok, claims}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Returns the default access token expiry in minutes.
  """
  def default_expiry_minutes, do: @access_token_expiry_minutes



  defp build_claims(user, session, expiry_minutes, issuer, audience) do
    now = DateTime.utc_now()
    exp_time = DateTime.add(now, expiry_minutes * 60, :second)

    %{
      "sub" => user.id,
      "email" => user.email,
      "session_id" => session.id,
      "iat" => DateTime.to_unix(now),
      "exp" => DateTime.to_unix(exp_time),
      "iss" => issuer,
      "aud" => audience
    }
  end

  defp token_expired?(claims) do
    case Map.get(claims, "exp") do
      nil ->
        false

      exp ->
        now = DateTime.utc_now() |> DateTime.to_unix()
        now >= exp
    end
  end

  defp get_jwt_secret do
    Application.get_env(:easy, :jwt_secret) ||
      raise """
      JWT secret not configured!
      Add to config/runtime.exs:
      config :easy, jwt_secret: System.get_env("JWT_SECRET") || "your-secret-key-min-32-chars"
      """
  end
end
