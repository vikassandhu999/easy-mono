defmodule Easy.ResendAdapterTest do
  use ExUnit.Case, async: false

  alias Swoosh.Adapters.Resend

  import Swoosh.Email

  setup do
    previous = Application.fetch_env!(:swoosh, :api_client)
    Application.put_env(:swoosh, :api_client, Swoosh.ApiClient.Req)
    on_exit(fn -> Application.put_env(:swoosh, :api_client, previous) end)
    :ok
  end

  test "Resend delivery preserves recipients and message content through Req" do
    Req.Test.stub(__MODULE__, fn conn ->
      assert conn.method == "POST"
      assert conn.request_path == "/emails"
      assert Plug.Conn.get_req_header(conn, "authorization") == ["Bearer test-key"]
      {:ok, body, conn} = Plug.Conn.read_body(conn)
      payload = Jason.decode!(body)
      assert payload["from"] == "Easy <sender@example.test>"
      assert payload["to"] == ["recipient@example.test"]
      assert payload["subject"] == "Your code"
      assert payload["text"] == "Code: 123456"
      assert payload["html"] == "<p>Code: 123456</p>"
      Req.Test.json(conn, %{id: "message-id"})
    end)

    assert {:ok, %{id: "message-id"}} = Resend.deliver(email(), api_key: "test-key")
  end

  test "Resend provider failures remain tagged errors" do
    Req.Test.stub(__MODULE__, fn conn ->
      conn |> Plug.Conn.put_status(422) |> Req.Test.json(%{message: "Invalid recipient"})
    end)

    assert {:error, {422, %{"message" => "Invalid recipient"}}} =
             Resend.deliver(email(), api_key: "test-key")
  end

  defp email do
    new()
    |> from({"Easy", "sender@example.test"})
    |> to("recipient@example.test")
    |> subject("Your code")
    |> text_body("Code: 123456")
    |> html_body("<p>Code: 123456</p>")
    |> put_private(:client_options, plug: {Req.Test, __MODULE__}, retry: false)
  end
end
