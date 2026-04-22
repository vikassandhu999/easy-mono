defmodule Easy.Identity.Mailer do
  @spec send_otp(String.t(), String.t()) :: :ok
  def send_otp(email, code) do
    email
    |> Easy.Emails.otp_verification_email(code)
    |> Easy.MailerDelivery.deliver_async(metadata: %{email: email})

    :ok
  end

  @spec send_invitation_otp(String.t(), String.t()) :: :ok
  def send_invitation_otp(email, code) do
    email
    |> Easy.Emails.login_otp_email(code)
    |> Easy.MailerDelivery.deliver_async(
      metadata: %{email: email, purpose: :invitation_acceptance}
    )

    :ok
  end
end
