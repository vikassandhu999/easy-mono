defmodule Easy.Emails do
  import Swoosh.Email

  # Get from email from configuration
  defp from_email do
    Application.get_env(:easy, :email)[:from_email] ||
      {"Coach Easy", "noreply@coacheasy.app"}
  end

  @spec otp_verification_email(String.t(), String.t()) :: Swoosh.Email.t()
  def otp_verification_email(email, code) do
    new()
    |> to(email)
    |> from(from_email())
    |> subject("Verify your email - Coach Easy")
    |> text_body(otp_verification_text(code))
    |> html_body(otp_verification_html(code))
  end

  @spec login_otp_email(String.t(), String.t()) :: Swoosh.Email.t()
  def login_otp_email(email, code) do
    new()
    |> to(email)
    |> from(from_email())
    |> subject("Your login code - Coach Easy")
    |> text_body(login_otp_text(code))
    |> html_body(login_otp_html(code))
  end

  @spec client_invitation_email(String.t(), String.t(), String.t(), String.t()) :: Swoosh.Email.t()
  def client_invitation_email(email, invitation_token, coach_name, business_name) do
    invitation_url = build_invitation_url(invitation_token)

    new()
    |> to(email)
    |> from(from_email())
    |> subject("You've been invited to #{business_name} - Coach Easy")
    |> text_body(client_invitation_text(coach_name, business_name, invitation_url))
    |> html_body(client_invitation_html(coach_name, business_name, invitation_url))
  end

  @spec trainer_invitation_email(String.t(), String.t(), String.t()) :: Swoosh.Email.t()
  def trainer_invitation_email(email, invitation_token, business_name) do
    invitation_url = build_trainer_invitation_url(invitation_token)

    new()
    |> to(email)
    |> from(from_email())
    |> subject("You've been invited to join #{business_name} on Coach Easy")
    |> text_body(trainer_invitation_text(business_name, invitation_url))
    |> html_body(trainer_invitation_html(business_name, invitation_url))
  end

  @spec check_in_due_email(String.t(), String.t(), String.t()) :: Swoosh.Email.t()
  def check_in_due_email(email, client_name, assignment_id) do
    url = check_in_url(assignment_id)

    new()
    |> to(email)
    |> from(from_email())
    |> subject("Your check-in is due")
    |> text_body("Hi #{client_name}, your check-in is due today: #{url}")
    |> html_body("<p>Hi #{client_name}, your check-in is due today: <a href=\"#{url}\">Open check-in</a></p>")
  end

  @spec check_in_overdue_email(String.t(), String.t(), String.t()) :: Swoosh.Email.t()
  def check_in_overdue_email(email, client_name, assignment_id) do
    url = check_in_url(assignment_id)

    new()
    |> to(email)
    |> from(from_email())
    |> subject("Your check-in is overdue")
    |> text_body("Hi #{client_name}, your check-in is overdue: #{url}")
    |> html_body("<p>Hi #{client_name}, your check-in is overdue: <a href=\"#{url}\">Open check-in</a></p>")
  end

  # Private functions for text templates

  defp check_in_url(assignment_id) do
    base_url = Application.get_env(:easy, :client_frontend_url, "http://localhost:1314")
    "#{base_url}/check-ins/#{assignment_id}"
  end

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

  defp trainer_invitation_text(business_name, invitation_url) do
    """
    Hello!

    You've been invited to join #{business_name} as a trainer on Coach Easy.

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

  defp trainer_invitation_html(business_name, invitation_url) do
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
          You've been invited to join <strong>#{business_name}</strong> as a trainer on Coach Easy.
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

  # Trainer invitation links open the COACH app's /accept-invite route — use the
  # coach frontend URL (:easy, :frontend_url), NOT the client frontend URL.
  defp build_trainer_invitation_url(token) do
    base_url = Application.get_env(:easy, :frontend_url, "http://localhost:2020")
    "#{base_url}/accept-invite?token=#{token}"
  end
end
