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

  test "invitation URLs cannot inject HTML attributes" do
    email = Emails.client_invitation_email("client@test.com", "token\" data-extra=\"value", "Coach", "Business")

    assert email.text_body =~ "token\" data-extra=\"value"
    assert email.html_body =~ "token&quot; data-extra=&quot;value"
    refute email.html_body =~ "token\" data-extra=\"value"
  end
end
