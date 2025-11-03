defmodule Easy.Notifications.Email do
  @moduledoc """
  Email delivery helpers used by the Notifications context.
  """

  import Swoosh.Email
  alias Easy.Mailer

  @from_email "Easycoach <support@easycoach.com>"

  def send_verification_email(to_email, passcode) do
    email =
      new()
      |> to(to_email)
      |> from(@from_email)
      |> subject("Verify your email - EasyCoach")
      |> html_body(verification_email_html(passcode))
      |> text_body(verification_email_text(passcode))

    deliver(email)
  end

  def send_login_email(to_email, passcode) do
    email =
      new()
      |> to(to_email)
      |> from(@from_email)
      |> subject("Your login code - EasyCoach")
      |> html_body(login_email_html(passcode))
      |> text_body(login_email_text(passcode))

    deliver(email)
  end

  def send_password_reset_email(to_email, passcode) do
    email =
      new()
      |> to(to_email)
      |> from(@from_email)
      |> subject("Reset your password - EasyCoach")
      |> html_body(password_reset_email_html(passcode))
      |> text_body(password_reset_email_text(passcode))

    deliver(email)
  end

  defp deliver(email) do
    case Mailer.deliver(email) do
      {:ok, _metadata} -> :ok
      {:error, reason} -> {:error, reason}
    end
  end

  defp verification_email_html(passcode) do
    """
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="color: #333;">Welcome to EasyCoach!</h1>
          <p style="font-size: 16px; color: #666;">
            Please verify your email address by using the following code:
          </p>
          <div style="background: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h2 style="color: #333; font-size: 32px; margin: 0; letter-spacing: 4px;">#{passcode}</h2>
          </div>
          <p style="color: #666; font-size: 14px;">
            This code will expire in 15 minutes. If you didn't request this, please ignore this email.
          </p>
        </div>
      </body>
    </html>
    """
  end

  defp verification_email_text(passcode) do
    """
    Welcome to EasyCoach!

    Please verify your email address by using the following code: #{passcode}

    This code will expire in 15 minutes. If you didn't request this, please ignore this email.
    """
  end

  defp login_email_html(passcode) do
    """
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="color: #333;">Login to EasyCoach</h1>
          <p style="font-size: 16px; color: #666;">
            Use the following code to complete your login:
          </p>
          <div style="background: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h2 style="color: #333; font-size: 32px; margin: 0; letter-spacing: 4px;">#{passcode}</h2>
          </div>
          <p style="color: #666; font-size: 14px;">
            This code will expire in 15 minutes. If you didn't request this, please ignore this email.
          </p>
        </div>
      </body>
    </html>
    """
  end

  defp login_email_text(passcode) do
    """
    Login to EasyCoach

    Use the following code to complete your login: #{passcode}

    This code will expire in 15 minutes. If you didn't request this, please ignore this email.
    """
  end

  defp password_reset_email_html(passcode) do
    """
    <html>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; padding: 20px;">
          <h1 style="color: #333;">Reset Your Password</h1>
          <p style="font-size: 16px; color: #666;">
            Use the following code to reset your password:
          </p>
          <div style="background: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h2 style="color: #333; font-size: 32px; margin: 0; letter-spacing: 4px;">#{passcode}</h2>
          </div>
          <p style="color: #666; font-size: 14px;">
            This code will expire in 15 minutes. If you didn't request this, please ignore this email.
          </p>
        </div>
      </body>
    </html>
    """
  end

  defp password_reset_email_text(passcode) do
    """
    Reset Your Password

    Use the following code to reset your password: #{passcode}

    This code will expire in 15 minutes. If you didn't request this, please ignore this email.
    """
  end
end
