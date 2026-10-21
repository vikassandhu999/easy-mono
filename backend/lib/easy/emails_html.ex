defmodule Easy.Emails.HTML do
  @spec otp_verification(String.t()) :: String.t()
  def otp_verification(code) do
    code = escape(code)

    layout("Verify your email", """
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
    """)
  end

  @spec login_otp(String.t()) :: String.t()
  def login_otp(code) do
    code = escape(code)

    layout("Your login code", """
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
    """)
  end

  @spec client_invitation(String.t(), String.t(), String.t()) :: String.t()
  def client_invitation(coach_name, business_name, invitation_url) do
    coach_name = escape(coach_name)
    business_name = escape(business_name)
    invitation_url = escape(invitation_url)

    layout("You've been invited", """
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
    """)
  end

  @spec trainer_invitation(String.t(), String.t()) :: String.t()
  def trainer_invitation(business_name, invitation_url) do
    business_name = escape(business_name)
    invitation_url = escape(invitation_url)

    layout("You've been invited", """
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
    """)
  end

  defp layout(title, content) do
    """
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>#{escape(title)}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    #{content}
      <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
        <p>Coach Easy</p>
      </div>
    </body>
    </html>
    """
  end

  defp escape(value), do: value |> to_string() |> Plug.HTML.html_escape()
end
