defmodule Easy.Notifications.SMS do
  @moduledoc """
  SMS delivery helpers for one-time passwords and login codes.
  """

  require Logger

  def send_phone_verification(phone_number, otp) do
    message = "Your EasyCoach verification code is: #{otp}. This code expires in 15 minutes."
    deliver(phone_number, message)
  end

  def send_phone_login_otp(phone_number, otp) do
    message = "Your EasyCoach login code is: #{otp}. This code expires in 15 minutes."
    deliver(phone_number, message)
  end

  defp deliver(phone_number, message) do
    if Mix.env() == :dev do
      Logger.info("SMS to #{phone_number}: #{message}")
      :ok
    else
      deliver_production(phone_number, message)
    end
  end

  defp deliver_production(phone_number, message) do
    Logger.warning("Production SMS not configured. Would send to #{phone_number}: #{message}")
    :ok
  end
end
