defmodule Easy.MailerDeliveryTest do
  use ExUnit.Case, async: false

  import Swoosh.Email
  alias Easy.MailerDelivery

  describe "deliver_async/2" do
    test "sends email asynchronously" do
      email =
        new()
        |> to("test@example.com")
        |> from({"Test", "noreply@test.com"})
        |> subject("Test Email")
        |> text_body("Test body")

      # Should return :ok immediately
      assert :ok = MailerDelivery.deliver_async(email)

      # Give the async task time to complete
      Process.sleep(100)
    end

    test "accepts metadata option" do
      email =
        new()
        |> to("test@example.com")
        |> from({"Test", "noreply@test.com"})
        |> subject("Test Email")
        |> text_body("Test body")

      metadata = %{user_id: 123, type: "test"}

      assert :ok = MailerDelivery.deliver_async(email, metadata: metadata)

      # Give the async task time to complete
      Process.sleep(100)
    end
  end

  describe "deliver_sync/2" do
    test "sends email synchronously and returns result" do
      email =
        new()
        |> to("test@example.com")
        |> from({"Test", "noreply@test.com"})
        |> subject("Test Email")
        |> text_body("Test body")

      # In test environment with Local adapter, this should succeed
      assert {:ok, _response} = MailerDelivery.deliver_sync(email)
    end

    test "accepts metadata option" do
      email =
        new()
        |> to("test@example.com")
        |> from({"Test", "noreply@test.com"})
        |> subject("Test Email")
        |> text_body("Test body")

      metadata = %{user_id: 123, type: "test"}

      assert {:ok, _response} = MailerDelivery.deliver_sync(email, metadata: metadata)
    end
  end
end
