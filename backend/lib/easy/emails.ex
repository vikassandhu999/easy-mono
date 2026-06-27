defmodule Easy.Emails do
  import Swoosh.Email

  # Get from email from configuration
  defp from_email do
    Application.get_env(:easy, :email)[:from_email] ||
      {"Coach Easy", "noreply@coacheasy.app"}
  end

  def otp_verification_email(email, code) do
    new()
    |> to(email)
    |> from(from_email())
    |> subject("Verify your email - Coach Easy")
    |> text_body(otp_verification_text(code))
    |> html_body(otp_verification_html(code))
  end

  def login_otp_email(email, code) do
    new()
    |> to(email)
    |> from(from_email())
    |> subject("Your login code - Coach Easy")
    |> text_body(login_otp_text(code))
    |> html_body(login_otp_html(code))
  end

  def client_invitation_email(email, invitation_token, coach_name, business_name) do
    invitation_url = build_invitation_url(invitation_token)

    new()
    |> to(email)
    |> from(from_email())
    |> subject("You've been invited to #{business_name} - Coach Easy")
    |> text_body(client_invitation_text(coach_name, business_name, invitation_url))
    |> html_body(client_invitation_html(coach_name, business_name, invitation_url))
  end

  # Private functions for text templates

  defp otp_verification_text(code) do
    """
    Welcome to Coach Easy!

    Your verification code is: #{code}

    This code will expire in 10 minutes.

    If you didn't request this code, please ignore this email.

    ---
    Coach Easy
    """
  end

  defp login_otp_text(code) do
    """
    Hello!

    Your login code is: #{code}

    This code will expire in 10 minutes.

    If you didn't request this code, please ignore this email and ensure your account is secure.

    ---
    Coach Easy
    """
  end

  defp client_invitation_text(coach_name, business_name, invitation_url) do
    """
    Hello!

    #{coach_name} has invited you to join #{business_name} on Coach Easy.

    To accept this invitation and create your account, please click the link below:

    #{invitation_url}

    This invitation will expire in 30 days.

    If you didn't expect this invitation, you can safely ignore this email.

    ---
    Coach Easy
    """
  end

  # Private functions for HTML templates

  defp otp_verification_html(code) do
    """
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your email</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin-top: 0;">Welcome to Coach Easy!</h1>
        <p style="font-size: 16px; margin-bottom: 20px;">Thank you for registering. To complete your registration, please use the verification code below:</p>

        <div style="background-color: #ffffff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">#{code}</div>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          <strong>This code will expire in 10 minutes.</strong>
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If you didn't request this code, please ignore this email.
        </p>
      </div>

      <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
        <p>Coach Easy</p>
      </div>
    </body>
    </html>
    """
  end

  defp login_otp_html(code) do
    """
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your login code</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin-top: 0;">Your Login Code</h1>
        <p style="font-size: 16px; margin-bottom: 20px;">Use the code below to log in to your Coach Easy account:</p>

        <div style="background-color: #ffffff; border: 2px solid #2563eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">#{code}</div>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          <strong>This code will expire in 10 minutes.</strong>
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If you didn't request this code, please ignore this email and ensure your account is secure.
        </p>
      </div>

      <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
        <p>Coach Easy</p>
      </div>
    </body>
    </html>
    """
  end

  defp client_invitation_html(coach_name, business_name, invitation_url) do
    """
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>You've been invited</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin-top: 0;">You've Been Invited!</h1>
        <p style="font-size: 16px; margin-bottom: 20px;">
          <strong>#{coach_name}</strong> has invited you to join <strong>#{business_name}</strong> on Coach Easy.
        </p>

        <p style="font-size: 16px; margin-bottom: 30px;">
          Coach Easy helps you track your progress and stay connected with your coach.
        </p>

        <div style="text-align: center; margin: 40px 0;">
          <a href="#{invitation_url}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation</a>
        </div>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          Or copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #2563eb; word-break: break-all; background-color: #f1f5f9; padding: 10px; border-radius: 4px;">
          #{invitation_url}
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          <strong>This invitation will expire in 30 days.</strong>
        </p>

        <p style="font-size: 14px; color: #666; margin-top: 20px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>

      <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
        <p>Coach Easy</p>
      </div>
    </body>
    </html>
    """
  end

  # Invitation links open the CLIENT app's /invite/:token route — use the client
  # frontend URL (same base as Client.build_invite_url), NOT the backend app_url.
  defp build_invitation_url(token) do
    base_url = Application.get_env(:easy, :client_frontend_url, "http://localhost:1314")
    "#{base_url}/invite/#{token}"
  end
end
