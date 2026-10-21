defmodule EasyWeb.ConversationChannelTest do
  use Easy.ChannelCase

  alias Easy.Chat
  alias Easy.Ctx

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, user: insert(:user))

    {:ok, conversation} =
      Chat.get_or_create_conversation_for_client(
        Ctx.new(coach.business_id, coach.user_id, coach.id, true),
        client.id
      )

    %{coach: coach, client: client, conversation: conversation}
  end

  test "rejects a connect with a bad token" do
    assert :error = connect(EasyWeb.UserSocket, %{"token" => "garbage"})
  end

  test "visible coach can join", ctx do
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => coach_token(ctx.coach)})
    assert {:ok, _reply, _socket} = subscribe_and_join(socket, "conversation:#{ctx.conversation.id}")
  end

  test "unassigned trainer cannot join", ctx do
    trainer = insert(:coach, business: ctx.coach.business)
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => coach_token(trainer)})
    assert {:error, %{reason: "unauthorized"}} = subscribe_and_join(socket, "conversation:#{ctx.conversation.id}")
  end

  test "client cannot join another client's conversation", ctx do
    other = insert(:client, business: ctx.coach.business, coach: ctx.coach, user: insert(:user))
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => client_token(other)})
    assert {:error, %{reason: "unauthorized"}} = subscribe_and_join(socket, "conversation:#{ctx.conversation.id}")
  end

  test "ended client can connect to read conversation history", ctx do
    inactive =
      insert(:client,
        business: ctx.coach.business,
        coach: ctx.coach,
        user: insert(:user),
        terms: [
          build(:coaching_term, starts_on: Date.add(Date.utc_today(), -30), ends_on: Date.add(Date.utc_today(), -1))
        ]
      )

    assert {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => client_token(inactive)})
    ctx = %Ctx{business_id: inactive.business_id, user_id: inactive.user_id, client_id: inactive.id}
    {:ok, conversation} = Chat.get_client_conversation(ctx)
    assert {:ok, _, socket} = subscribe_and_join(socket, "conversation:#{conversation.id}")
    ref = push(socket, "message_send", %{"body" => "Cannot bypass the HTTP coaching gate"})
    assert_reply ref, :error, %{reason: "read_only_channel"}
    assert {:ok, %{messages: []}} = Chat.list_client_messages(ctx)
  end
end
