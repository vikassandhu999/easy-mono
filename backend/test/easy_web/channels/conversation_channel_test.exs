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

  test "client can join their own conversation and receives message_new", ctx do
    {:ok, socket} = connect(EasyWeb.UserSocket, %{"token" => client_token(ctx.client)})
    assert socket.assigns.ctx.client_id == ctx.client.id
    {:ok, _reply, _socket} = subscribe_and_join(socket, "conversation:#{ctx.conversation.id}")

    coach_ctx = Ctx.new(ctx.coach.business_id, ctx.coach.user_id, ctx.coach.id, true)
    attachment = insert(:attachment, business: ctx.coach.business, client: ctx.client)
    entry = insert(:workout_session, state: :completed, business: ctx.coach.business, client: ctx.client)

    {:ok, message} =
      Chat.send_message(coach_ctx, ctx.conversation.id, %{
        body: "hello",
        attachment_ids: [attachment.id],
        embed: %{type: "training_session", id: entry.id}
      })

    message_id = message.id
    attachment_id = attachment.id

    assert_push "message_new", %{
      id: ^message_id,
      body: "hello",
      sender_type: :coach,
      attachments: [%{id: ^attachment_id, content_type: "image/jpeg", byte_size: 1024, duration_ms: nil}],
      embed: %{
        type: :training_session,
        id: entry_id,
        snapshot: %{
          "title" => title,
          "recorded_at" => recorded_at
        }
      }
    }

    assert entry_id == entry.id
    assert title == "Workout"
    assert recorded_at == DateTime.to_iso8601(entry.closed_at)
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
        terms: [build(:coaching_term, starts_on: Date.add(Date.utc_today(), -30), ends_on: Date.add(Date.utc_today(), -1))]
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
