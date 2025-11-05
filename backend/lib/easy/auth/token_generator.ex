defmodule Easy.Auth.TokenGenerator do
  @moduledoc """
  Cryptographic token and secret generation utilities.

  Provides secure random token generation for:
  - OTP secrets (TOTP base secrets)
  - Refresh tokens (session tokens)
  - General purpose secure tokens

  All tokens use cryptographically secure random bytes.
  """

  @doc """
  Generates a cryptographically secure secret for OTP/TOTP use.

  Returns a 32-byte random secret encoded as base64 (URL-safe, no padding).

  ## Examples

      iex> secret = Easy.Auth.TokenGenerator.generate_secret()
      iex> is_binary(secret)
      true
      iex> byte_size(Base.url_decode64!(secret, padding: false))
      32
  """
  def generate_secret do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64(padding: false)
  end

  @doc """
  Generates a cryptographically secure refresh token.

  Returns a 32-byte random token encoded as base64 (URL-safe, no padding).

  ## Examples

      iex> token = Easy.Auth.TokenGenerator.generate_refresh_token()
      iex> is_binary(token)
      true
      iex> String.length(token) > 40
      true
  """
  def generate_refresh_token do
    :crypto.strong_rand_bytes(32)
    |> Base.url_encode64(padding: false)
  end

  @doc """
  Generates a secure random token of specified byte length.

  ## Parameters
  - `bytes` - Number of random bytes to generate (default: 32)

  ## Examples

      iex> token = Easy.Auth.TokenGenerator.generate_token(16)
      iex> byte_size(Base.url_decode64!(token, padding: false))
      16

      iex> token = Easy.Auth.TokenGenerator.generate_token()
      iex> byte_size(Base.url_decode64!(token, padding: false))
      32
  """
  def generate_token(bytes \\ 32) when is_integer(bytes) and bytes > 0 do
    :crypto.strong_rand_bytes(bytes)
    |> Base.url_encode64(padding: false)
  end

  @doc """
  Calculates an expiration datetime based on minutes from now.

  ## Parameters
  - `minutes` - Number of minutes until expiration (default: 15)

  ## Examples

      iex> expires_at = Easy.Auth.TokenGenerator.expires_at(15)
      iex> DateTime.compare(expires_at, DateTime.utc_now())
      :gt

      iex> expires_at = Easy.Auth.TokenGenerator.expires_at(60)
      iex> diff = DateTime.diff(expires_at, DateTime.utc_now(), :minute)
      iex> diff >= 59 and diff <= 61
      true
  """
  def expires_at(minutes \\ 15) when is_integer(minutes) and minutes > 0 do
    DateTime.utc_now()
    |> DateTime.add(minutes * 60, :second)
    |> DateTime.truncate(:second)
  end

  @doc """
  Calculates an expiration datetime based on days from now.

  ## Parameters
  - `days` - Number of days until expiration

  ## Examples

      iex> expires_at = Easy.Auth.TokenGenerator.expires_at_days(30)
      iex> diff = DateTime.diff(expires_at, DateTime.utc_now(), :day)
      iex> diff >= 29 and diff <= 31
      true
  """
  def expires_at_days(days) when is_integer(days) and days > 0 do
    DateTime.utc_now()
    |> DateTime.add(days * 24 * 60 * 60, :second)
    |> DateTime.truncate(:second)
  end

  @doc """
  Generates a secure random UUID v4.

  Note: For time-ordered UUIDs, use `Ecto.UUID.generate()` which creates v4,
  or use a library that supports UUID v7.

  ## Examples

      iex> uuid = Easy.Auth.TokenGenerator.generate_uuid()
      iex> String.length(uuid)
      36
      iex> String.contains?(uuid, "-")
      true
  """
  def generate_uuid do
    Ecto.UUID.generate()
  end
end
