defmodule Easy.ChatTest do
  use Easy.DataCase, async: true

  alias Easy.Chat.Conversation
  alias Easy.Chat.Message

  describe "Conversation.insert_changeset/2" do
    test "sets trusted ids and is valid" do
      cs = Conversation.insert_changeset("biz", "client")
      assert cs.valid?
      assert Ecto.Changeset.get_field(cs, :business_id) == "biz"
      assert Ecto.Changeset.get_field(cs, :client_id) == "client"
    end
  end

  describe "Message.insert_changeset/5" do
    test "requires a body" do
      cs = Message.insert_changeset("biz", "conv", :client, "c1", %{})
      refute cs.valid?
      assert "can't be blank" in errors_on(cs).body
    end

    test "sets sender from trusted args, not attrs" do
      cs =
        Message.insert_changeset("biz", "conv", :client, "c1", %{
          "body" => "hey",
          "sender_type" => "coach",
          "sender_id" => "evil"
        })

      assert Ecto.Changeset.get_field(cs, :sender_type) == :client
      assert Ecto.Changeset.get_field(cs, :sender_id) == "c1"
    end

    test "rejects an over-long body" do
      cs =
        Message.insert_changeset("biz", "conv", :coach, "c1", %{
          "body" => String.duplicate("a", 4001)
        })

      refute cs.valid?
    end
  end

  describe "Message.insert_changeset/6" do
    test "allows attachment-only and embed-only message bodies" do
      assert Message.insert_changeset("biz", "conv", :coach, "coach", nil, %{}).valid?

      assert Message.insert_changeset(
               "biz",
               "conv",
               :coach,
               "coach",
               %{
                 type: :form_submission,
                 id: Ecto.UUID.generate(),
                 snapshot: %{"title" => "Weekly check-in"}
               },
               %{}
             ).valid?
    end

    test "preloads attachments in link position order" do
      message = insert(:chat_message)
      client = message.conversation.client
      first = insert(:attachment, business: message.business, client: client)
      second = insert(:attachment, business: message.business, client: client)

      insert(:chat_message_attachment,
        business: message.business,
        message: message,
        attachment: second,
        position: 1
      )

      insert(:chat_message_attachment,
        business: message.business,
        message: message,
        attachment: first,
        position: 0
      )

      loaded = Message |> Message.include_attachments() |> Easy.Repo.get!(message.id)

      assert Enum.map(loaded.attachments, & &1.id) == [first.id, second.id]
    end
  end

  describe "Easy.Chat context" do
    alias Easy.Chat
    alias Easy.Ctx

    defp coach_ctx(coach), do: trainer_ctx(coach)
    # Easy.DataCase already imports owner_ctx/1 (for a %Business{}), so this
    # owner-privileged ctx built from a coach row gets its own name.
    defp owner_coach_ctx(coach), do: Easy.Ctx.new(coach.business_id, coach.user_id, coach.id, true)
    defp client_ctx(client), do: Ctx.new(client.business_id, client.user_id)

    setup do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach)
      %{coach: coach, client: client}
    end

    test "get_or_create_conversation_for_client is idempotent", %{coach: coach, client: client} do
      assert {:ok, a} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert {:ok, b} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert a.id == b.id
      assert a.unread_count == 0
      assert a.client.id == client.id
    end

    test "404s for a client in another business", %{coach: coach} do
      other_coach = insert(:coach)
      other = insert(:client, business: other_coach.business, creator: other_coach)
      assert {:error, :not_found} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), other.id)
    end

    test "send/list round-trip with cursor pagination", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)

      for i <- 1..5 do
        {:ok, _} = Chat.send_message(coach_ctx(coach), conversation.id, %{"body" => "m#{i}"})
      end

      assert {:ok, %{messages: page1, has_more: true}} =
               Chat.list_messages(coach_ctx(coach), conversation.id, limit: 3)

      assert Enum.map(page1, & &1.body) == ["m3", "m4", "m5"]

      oldest_loaded = List.first(page1)

      assert {:ok, %{messages: page2, has_more: false}} =
               Chat.list_messages(coach_ctx(coach), conversation.id, limit: 3, before: oldest_loaded.id)

      assert Enum.map(page2, & &1.body) == ["m1", "m2"]
    end

    test "send_message bumps preview and unread for the client", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      {:ok, _} = Chat.send_message(coach_ctx(coach), conversation.id, %{"body" => "hello there"})

      assert {:ok, client_view} = Chat.get_client_conversation(client_ctx(client))
      assert client_view.last_message_preview == "hello there"
      assert client_view.unread_count == 1
    end

    test "mark_client_read zeroes the client's unread", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      {:ok, _} = Chat.send_message(coach_ctx(coach), conversation.id, %{"body" => "hi"})

      assert {:ok, _} = Chat.mark_client_read(client_ctx(client))
      assert {:ok, %{unread_count: 0}} = Chat.get_client_conversation(client_ctx(client))
    end

    test "mark_read stamps the cursor at the newest message, not now", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      {:ok, _} = Chat.send_client_message(client_ctx(client), %{"body" => "hi"})

      assert {:ok, _} = Chat.mark_read(coach_ctx(coach), conversation.id)

      reloaded = Easy.Repo.get!(Easy.Chat.Conversation, conversation.id)
      assert reloaded.coach_last_read_at == reloaded.last_message_at
    end

    test "client sends create the conversation lazily and set coach unread", %{coach: coach, client: client} do
      assert {:ok, message} = Chat.send_client_message(client_ctx(client), %{"body" => "help"})
      assert message.sender_type == :client

      assert {:ok, %{count: 1, conversations: [conversation]}} = Chat.list_conversations(coach_ctx(coach))
      assert conversation.unread_count == 1
      assert conversation.last_message_preview == "help"
    end

    test "trainer only sees conversations for visible clients", %{coach: coach, client: client} do
      {:ok, hidden} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)

      trainer = insert(:coach, business: coach.business)
      assert {:ok, %{count: 0, conversations: []}} = Chat.list_conversations(trainer_ctx(trainer))
      assert {:error, :not_found} = Chat.get_conversation(trainer_ctx(trainer), hidden.id)

      assigned = insert(:client, business: coach.business, creator: coach, assigned_coach: trainer)
      {:ok, conv} = Chat.get_or_create_conversation_for_client(owner_coach_ctx(coach), assigned.id)

      assert {:ok, %{count: 1, conversations: [visible]}} = Chat.list_conversations(trainer_ctx(trainer))
      assert visible.id == conv.id
      assert {:ok, _} = Chat.get_conversation(trainer_ctx(trainer), conv.id)
    end

    test "get_or_create 404s for an unassigned trainer", %{coach: coach, client: client} do
      trainer = insert(:coach, business: coach.business)
      assert {:error, :not_found} = Chat.get_or_create_conversation_for_client(trainer_ctx(trainer), client.id)
    end

    test "send broadcasts to conversation and inbox topics", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      Phoenix.PubSub.subscribe(Easy.PubSub, "conversation:#{conversation.id}")
      Phoenix.PubSub.subscribe(Easy.PubSub, "inbox:business:#{coach.business_id}")

      {:ok, message} = Chat.send_message(coach_ctx(coach), conversation.id, %{"body" => "ping"})

      assert_receive {:chat_message_created, %{id: message_id}}
      assert message_id == message.id
      assert_receive {:conversation_updated, conversation_id}
      assert conversation_id == conversation.id
    end
  end
end
