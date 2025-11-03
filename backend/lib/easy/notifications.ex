defmodule Easy.Notifications do
  @moduledoc """
  Notifications context manages outbound email and SMS delivery.
  """

  alias Easy.Notifications.{Email, SMS}

  def deliver_email_verification(email, passcode) do
    Email.send_verification_email(email, passcode)
  end

  def deliver_login_email(email, passcode) do
    Email.send_login_email(email, passcode)
  end

  def deliver_password_reset(email, passcode) do
    Email.send_password_reset_email(email, passcode)
  end

  def deliver_phone_verification(phone_number, otp) do
    SMS.send_phone_verification(phone_number, otp)
  end

  def deliver_phone_login(phone_number, otp) do
    SMS.send_phone_login_otp(phone_number, otp)
  end
end
