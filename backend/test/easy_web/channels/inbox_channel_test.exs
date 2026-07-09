defmodule EasyWeb.InboxChannelTest do
  use Easy.ChannelCase

  alias Easy.Chat
  alias Easy.Ctx

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
    %{coach: coach, client: client}
  end

  test "coach joins the inbox and gets id-only updates for their business", %{coach: coach, client: client} do
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => coach_token(coach)})
    {:ok, _reply, _socket} = subscribe_and_join(socket, "inbox")

    {:ok, _message} = Chat.send_client_message(Ctx.new(client.business_id, client.user_id), %{"body" => "yo"})

    assert_push "conversation_updated", payload
    assert %{conversation_id: conversation_id} = payload
    assert map_size(payload) == 1
    assert is_binary(conversation_id)
  end

  test "coach of another business does not receive the update", %{client: client} do
    other_coach = insert(:coach)
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => coach_token(other_coach)})
    {:ok, _reply, _socket} = subscribe_and_join(socket, "inbox")

    {:ok, _message} = Chat.send_client_message(Ctx.new(client.business_id, client.user_id), %{"body" => "yo"})

    refute_push "conversation_updated", %{conversation_id: _}
  end

  test "client cannot join the inbox", %{client: client} do
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => client_token(client)})
    assert {:error, %{reason: "unauthorized"}} = subscribe_and_join(socket, "inbox")
  end
end
