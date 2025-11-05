defmodule Easy.Auth.OTP do
  @moduledoc """
  OTP (One-Time Password) generation and verification.

  Handles TOTP-based one-time passwords with:
  - Time-based verification with validity windows
  - Development bypass mode for testing
  - Logging mode for debugging
  """

  require Logger

  @otp_validity_window_seconds 30


  @doc """
  Returns the OTP validity window in seconds.
  """
  def validity_window, do: @otp_validity_window_seconds

  @doc """
  Returns the bypass code used in development.
  """
  def bypass_code, do: "123456"


  @doc """
  Generates an OTP code from a secret.

  In development/staging, will log the code if OTP_LOG_ENABLED=true.
  """
  def generate(secret) do
    code = NimbleTOTP.verification_code(secret)

    if log_enabled?() do
      Logger.info("Generated OTP: #{code} (valid for #{validity_window()}s)")
    end

    code
  end

  @doc """
  Verifies an OTP code against a secret.

  Checks both current and previous time windows (total ~60s validity).

  In development/staging:
  - If OTP_BYPASS_ENABLED=true, accepts "123456" as valid code
  - Logs bypass usage for audit purposes
  """
  def verify(secret, code) when is_binary(secret) and is_binary(code) do
    cond do
      bypass_enabled?() and code == bypass_code() ->
        Logger.info("OTP bypass used with code: #{bypass_code()}")
        true

      true ->
        verify_totp(secret, code)
    end
  end


  defp verify_totp(secret, code) do
    current_time = System.os_time(:second)
    previous_time = current_time - @otp_validity_window_seconds

    # Check current window and previous window (total ~60s validity)
    NimbleTOTP.valid?(secret, code, time: current_time) or
      NimbleTOTP.valid?(secret, code, time: previous_time)
  end

  # Configuration Helpers
  defp bypass_enabled? do
    System.get_env("OTP_BYPASS_ENABLED") == "true" or
      Application.get_env(:easy, :otp_bypass_enabled, false)
  end

  defp log_enabled? do
    System.get_env("OTP_LOG_ENABLED") == "true" or
      Application.get_env(:easy, :otp_log_enabled, false)
  end
end
