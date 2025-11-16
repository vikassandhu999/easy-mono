defmodule Easy.Auth.OTP do
  require Logger

  @otp_validity_window_seconds 30

  def validity_window, do: @otp_validity_window_seconds

  def bypass_code, do: "123456"

  def generate(secret) do
    code = NimbleTOTP.verification_code(secret)

    if log_enabled?() do
      Logger.info("Generated OTP: #{code} (valid for #{validity_window()}s)")
    end

    code
  end

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

    NimbleTOTP.valid?(secret, code, time: current_time) or
      NimbleTOTP.valid?(secret, code, time: previous_time)
  end

  defp bypass_enabled? do
    System.get_env("OTP_BYPASS_ENABLED") == "true" or
      Application.get_env(:easy, :otp_bypass_enabled, false)
  end

  defp log_enabled? do
    System.get_env("OTP_LOG_ENABLED") == "true" or
      Application.get_env(:easy, :otp_log_enabled, false)
  end
end
