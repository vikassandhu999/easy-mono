defmodule Easy.Emails do
  import Swoosh.Email

  alias Easy.AppLinks
  alias Easy.Emails.HTML

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
    |> html_body(HTML.otp_verification(code))
  end

  @spec login_otp_email(String.t(), String.t()) :: Swoosh.Email.t()
  def login_otp_email(email, code) do
    new()
    |> to(email)
    |> from(from_email())
    |> subject("Your login code - Coach Easy")
    |> text_body(login_otp_text(code))
    |> html_body(HTML.login_otp(code))
  end

  @spec client_invitation_email(String.t(), String.t(), String.t(), String.t()) :: Swoosh.Email.t()
  def client_invitation_email(email, invitation_token, coach_name, business_name) do
    invitation_url = AppLinks.client_invitation(invitation_token)

    new()
    |> to(email)
    |> from(from_email())
    |> subject("You've been invited to #{business_name} - Coach Easy")
    |> text_body(client_invitation_text(coach_name, business_name, invitation_url))
    |> html_body(HTML.client_invitation(coach_name, business_name, invitation_url))
  end

  @spec trainer_invitation_email(String.t(), String.t(), String.t()) :: Swoosh.Email.t()
  def trainer_invitation_email(email, invitation_token, business_name) do
    invitation_url = AppLinks.coach_invitation(invitation_token)

    new()
    |> to(email)
    |> from(from_email())
    |> subject("You've been invited to join #{business_name} on Coach Easy")
    |> text_body(trainer_invitation_text(business_name, invitation_url))
    |> html_body(HTML.trainer_invitation(business_name, invitation_url))
  end

  @spec check_in_due_email(String.t(), String.t(), String.t()) :: Swoosh.Email.t()
  def check_in_due_email(email, client_name, assignment_id) do
    url = AppLinks.check_in(assignment_id)

    new()
    |> to(email)
    |> from(from_email())
    |> subject("Your check-in is due")
    |> text_body("Hi #{client_name}, your check-in is due today: #{url}")
    |> html_body(HTML.reminder(client_name, "your check-in is due today", url, "Open check-in"))
  end

  @spec check_in_overdue_email(String.t(), String.t(), String.t()) :: Swoosh.Email.t()
  def check_in_overdue_email(email, client_name, assignment_id) do
    url = AppLinks.check_in(assignment_id)

    new()
    |> to(email)
    |> from(from_email())
    |> subject("Your check-in is overdue")
    |> text_body("Hi #{client_name}, your check-in is overdue: #{url}")
    |> html_body(HTML.reminder(client_name, "your check-in is overdue", url, "Open check-in"))
  end

  @spec intake_reminder_email(String.t(), String.t(), String.t()) :: Swoosh.Email.t()
  def intake_reminder_email(email, client_name, assignment_id) do
    url = AppLinks.check_in(assignment_id)

    new()
    |> to(email)
    |> from(from_email())
    |> subject("Your intake form is waiting")
    |> text_body("Hi #{client_name}, your coach is waiting for your intake form: #{url}")
    |> html_body(HTML.reminder(client_name, "your coach is waiting for your intake form", url, "Open intake"))
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
end
