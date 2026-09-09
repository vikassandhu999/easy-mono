defmodule Easy.EmailsTest do
  use ExUnit.Case, async: true

  alias Easy.Emails

  test "invitations escape names in HTML while preserving plain-text names" do
    name = "<b>Coach & Company</b>"

    emails = [
      Emails.client_invitation_email("client@test.com", "token", name, name),
      Emails.trainer_invitation_email("coach@test.com", "token", name)
    ]

    for email <- emails do
      assert email.text_body =~ name
      assert email.html_body =~ "&lt;b&gt;Coach &amp; Company&lt;/b&gt;"
      refute email.html_body =~ name
    end
  end

  test "reminders render client names as text in every reminder kind" do
    name = "<img src=x>"

    emails = [
      Emails.check_in_due_email("client@test.com", name, "assignment"),
      Emails.check_in_overdue_email("client@test.com", name, "assignment"),
      Emails.intake_reminder_email("client@test.com", name, "assignment")
    ]

    for email <- emails do
      assert email.text_body =~ name
      assert email.html_body =~ "&lt;img src=x&gt;"
      refute email.html_body =~ name
      assert email.html_body =~ "/check-ins/assignment"
    end
  end

  test "invitation URLs cannot inject HTML attributes" do
    email = Emails.client_invitation_email("client@test.com", "token\" data-extra=\"value", "Coach", "Business")

    assert email.text_body =~ "token\" data-extra=\"value"
    assert email.html_body =~ "token&quot; data-extra=&quot;value"
    refute email.html_body =~ "token\" data-extra=\"value"
  end
end
