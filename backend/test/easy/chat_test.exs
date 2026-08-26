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
      cs = Message.insert_changeset("biz", :client, "c1", "conv", %{})
      refute cs.valid?
      assert "can't be blank" in errors_on(cs).body
    end

    test "sets sender from trusted args, not attrs" do
      cs =
        Message.insert_changeset("biz", :client, "c1", "conv", %{
          "body" => "hey",
          "sender_type" => "coach",
          "sender_id" => "evil"
        })

      assert Ecto.Changeset.get_field(cs, :sender_type) == :client
      assert Ecto.Changeset.get_field(cs, :sender_id) == "c1"
    end

    test "rejects an over-long body" do
      cs =
        Message.insert_changeset("biz", :coach, "c1", "conv", %{
          "body" => String.duplicate("a", 4001)
        })

      refute cs.valid?
    end
  end

  describe "Message.insert_changeset/6" do
    test "allows attachment-only and embed-only message bodies" do
      assert Message.insert_changeset("biz", :coach, "coach", "conv", nil, %{}).valid?

      assert Message.insert_changeset(
               "biz",
               :coach,
               "coach",
               "conv",
               %{
                 type: :form_submission,
                 id: Ecto.UUID.generate(),
                 snapshot: %{"title" => "Weekly check-in"}
               },
               %{}
             ).valid?
    end

    test "rejects invalid and incomplete trusted embeds as changeset errors" do
      id = Ecto.UUID.generate()

      invalid_type =
        Message.insert_changeset(
          "biz",
          :coach,
          "coach",
          "conv",
          %{type: :bogus, id: id, snapshot: %{}},
          %{}
        )

      missing_id =
        Message.insert_changeset(
          "biz",
          :coach,
          "coach",
          "conv",
          %{type: :form_submission, snapshot: %{}},
          %{}
        )

      missing_snapshot =
        Message.insert_changeset(
          "biz",
          :coach,
          "coach",
          "conv",
          %{type: :form_submission, id: id},
          %{}
        )

      refute invalid_type.valid?
      assert "is invalid" in errors_on(invalid_type).embed_type
      refute missing_id.valid?
      assert "can't be blank" in errors_on(missing_id).embed_id
      refute missing_snapshot.valid?
      assert "can't be blank" in errors_on(missing_snapshot).embed_snapshot
    end

    test "registers embed database constraints on the changeset" do
      changeset = Message.insert_changeset("biz", :coach, "coach", "conv", nil, %{})
      constraints = Enum.map(changeset.constraints, & &1.constraint)

      assert "chat_messages_embed_type_check" in constraints
      assert "chat_messages_embed_complete_check" in constraints
    end

    test "maps embed completeness constraint failures to changeset errors" do
      conversation = insert(:conversation)

      changeset =
        conversation.business_id
        |> Message.insert_changeset(
          :coach,
          Ecto.UUID.generate(),
          conversation.id,
          nil,
          %{"body" => "hello"}
        )
        |> Ecto.Changeset.put_change(:embed_id, Ecto.UUID.generate())

      assert {:error, changeset} = Easy.Repo.insert(changeset)
      assert "is invalid" in errors_on(changeset).embed_id
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

    test "scopes attachment and link joins to the message business" do
      query = Message.include_attachments()

      assert [link_join, attachment_join] = query.joins

      assert link_join.on.expr
             |> Macro.to_string()
             |> String.contains?("&1.business_id() == &0.business_id()")

      assert attachment_join.on.expr
             |> Macro.to_string()
             |> String.contains?("&2.business_id() == &0.business_id()")
    end
  end

  describe "Easy.Chat context" do
    alias Easy.Chat
    alias Easy.Chat.MessageAttachment
    alias Easy.Ctx

    defp coach_ctx(coach), do: trainer_ctx(coach)
    # Easy.DataCase already imports owner_ctx/1 (for a %Business{}), so this
    # owner-privileged ctx built from a coach row gets its own name.
    defp owner_coach_ctx(coach), do: Easy.Ctx.new(coach.business_id, coach.user_id, coach.id, true)

    defp client_ctx(client) do
      %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    end

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

    test "batches unread counts for a deterministic conversation page", %{coach: coach, client: client} do
      other_client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      [first, second] =
        Enum.map([client, other_client], fn page_client ->
          insert(:conversation, business: coach.business, client: page_client)
        end)

      now = DateTime.utc_now()

      for seconds_ago <- [50, 40] do
        insert(:chat_message,
          business: coach.business,
          conversation: first,
          sender_type: :client,
          sender_id: first.client_id,
          inserted_at: DateTime.add(now, -seconds_ago)
        )
      end

      old =
        insert(:chat_message,
          business: coach.business,
          conversation: second,
          sender_type: :client,
          sender_id: second.client_id,
          inserted_at: DateTime.add(now, -70)
        )

      insert(:chat_message,
        business: coach.business,
        conversation: second,
        sender_type: :client,
        sender_id: second.client_id,
        inserted_at: DateTime.add(now, -60)
      )

      first |> Ecto.Changeset.change(last_message_at: now) |> Repo.update!()

      second
      |> Ecto.Changeset.change(
        last_message_at: DateTime.add(now, -10),
        coach_last_read_at: old.inserted_at
      )
      |> Repo.update!()

      {result, queries} =
        capture_queries(fn -> Chat.list_conversations(owner_coach_ctx(coach), limit: 1) end)

      assert {:ok, %{count: 2, conversations: [%{id: first_id, unread_count: 2}]}} = result
      assert first_id == first.id

      assert {:ok, %{count: 2, conversations: [%{id: second_id, unread_count: 1}]}} =
               Chat.list_conversations(owner_coach_ctx(coach), offset: 1, limit: 1)

      assert second_id == second.id

      assert [unread_query] =
               Enum.filter(queries, fn query ->
                 String.contains?(query, ~s(FROM "chat_messages"))
               end)

      assert String.contains?(unread_query, "GROUP BY")
    end

    test "404s for a client in another business", %{coach: coach} do
      other_coach = insert(:coach)
      other = insert(:client, business: other_coach.business, creator: other_coach)
      assert {:error, :not_found} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), other.id)
    end

    test "send/list round-trip with cursor pagination", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)

      for i <- 1..5 do
        {:ok, _} = Chat.send_message(coach_ctx(coach), conversation.id, %{body: "m#{i}"})
      end

      assert {:ok, %{messages: page1, has_more: true}} =
               Chat.list_messages(coach_ctx(coach), conversation.id, limit: 3)

      assert Enum.map(page1, & &1.body) == ["m3", "m4", "m5"]

      oldest_loaded = List.first(page1)

      assert {:ok, %{messages: page2, has_more: false}} =
               Chat.list_messages(coach_ctx(coach), conversation.id, limit: 3, before: oldest_loaded.id)

      assert Enum.map(page2, & &1.body) == ["m1", "m2"]
    end

    test "composes text, ordered attachments, and an immutable form submission embed", %{
      coach: coach,
      client: client
    } do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      first = insert(:attachment, business: coach.business, client: client, content_type: "image/png")
      second = insert(:attachment, business: coach.business, client: client, content_type: "audio/webm")
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)
      submission = insert(:form_submission, business: coach.business, client: client, form_assignment: assignment)

      assert {:ok, message} =
               Chat.send_message(coach_ctx(coach), conversation.id, %{
                 body: "  Energy improved.  ",
                 attachment_ids: [String.upcase(second.id), first.id],
                 embed: %{type: "form_submission", id: submission.id}
               })

      assert message.body == "Energy improved."
      assert Enum.map(message.attachments, & &1.id) == [second.id, first.id]
      assert message.embed_type == :form_submission
      assert message.embed_id == submission.id

      assert message.embed_snapshot == %{
               "form_assignment_id" => assignment.id,
               "title" => assignment.form_template.name,
               "submitted_at" => DateTime.to_iso8601(submission.submitted_at)
             }

      assignment.form_template
      |> Ecto.Changeset.change(name: "Renamed")
      |> Easy.Repo.update!()

      reloaded = Easy.Repo.get!(Message, message.id)
      assert reloaded.embed_snapshot["title"] == assignment.form_template.name
    end

    test "accepts the typed form submission embed atom", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)
      submission = insert(:form_submission, business: coach.business, client: client, form_assignment: assignment)

      assert {:ok, message} =
               Chat.send_message(coach_ctx(coach), conversation.id, %{
                 embed: %{type: :form_submission, id: submission.id}
               })

      assert message.embed_type == :form_submission
      assert message.embed_id == submission.id
    end

    test "supports attachment-only and embed-only previews", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      attachment = insert(:attachment, business: coach.business, client: client, content_type: "video/mp4")

      assert {:ok, attachment_message} =
               Chat.send_message(coach_ctx(coach), conversation.id, %{attachment_ids: [attachment.id]})

      assert attachment_message.body == nil
      assert Easy.Repo.get!(Conversation, conversation.id).last_message_preview == "Video"

      first_photo = insert(:attachment, business: coach.business, client: client, content_type: "image/jpeg")
      second_photo = insert(:attachment, business: coach.business, client: client, content_type: "image/png")

      assert {:ok, _message} =
               Chat.send_message(coach_ctx(coach), conversation.id, %{
                 attachment_ids: [first_photo.id, second_photo.id]
               })

      assert Easy.Repo.get!(Conversation, conversation.id).last_message_preview == "2 attachments"

      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)
      submission = insert(:form_submission, business: coach.business, client: client, form_assignment: assignment)

      assert {:ok, embed_message} =
               Chat.send_message(coach_ctx(coach), conversation.id, %{
                 embed: %{type: "form_submission", id: submission.id}
               })

      assert embed_message.body == nil

      assert Easy.Repo.get!(Conversation, conversation.id).last_message_preview ==
               "Shared #{assignment.form_template.name}"
    end

    test "rejects empty and invalid attachment compositions", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      attachment = insert(:attachment, business: coach.business, client: client)

      assert {:error, empty} = Chat.send_message(coach_ctx(coach), conversation.id, %{body: "   "})
      assert "can't be blank" in errors_on(empty).body

      assert {:error, duplicate} =
               Chat.send_message(coach_ctx(coach), conversation.id, %{
                 attachment_ids: [attachment.id, attachment.id]
               })

      assert "must be unique" in errors_on(duplicate).attachment_ids

      assert {:error, too_many} =
               Chat.send_message(coach_ctx(coach), conversation.id, %{
                 attachment_ids: Enum.map(1..5, fn _ -> Ecto.UUID.generate() end)
               })

      assert "should have at most 4 item(s)" in errors_on(too_many).attachment_ids

      assert {:error, invalid} =
               Chat.send_message(coach_ctx(coach), conversation.id, %{attachment_ids: ["bad-id"]})

      assert "is invalid" in errors_on(invalid).attachment_ids
      assert Easy.Repo.aggregate(MessageAttachment, :count) == 0
    end

    test "rejects unknown and cross-tenant attachments without partial writes", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      other_client = insert(:client, business: coach.business, creator: coach)
      cross_client = insert(:attachment, business: coach.business, client: other_client)
      other_coach = insert(:coach)
      other_client_business = insert(:client, business: other_coach.business, creator: other_coach)
      cross_business = insert(:attachment, business: other_coach.business, client: other_client_business)

      for id <- [Ecto.UUID.generate(), cross_client.id, cross_business.id] do
        assert {:error, :not_found} =
                 Chat.send_message(coach_ctx(coach), conversation.id, %{
                   body: "must roll back",
                   attachment_ids: [id]
                 })
      end

      assert Easy.Repo.aggregate(Message, :count) == 0
    end

    test "coach embeds must belong to the conversation client and clients cannot embed", %{
      coach: coach,
      client: client
    } do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      other_client = insert(:client, business: coach.business, creator: coach)
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: other_client, form_template: template)
      submission = insert(:form_submission, business: coach.business, client: other_client, form_assignment: assignment)
      embed = %{type: "form_submission", id: submission.id}

      other_coach = insert(:coach)
      other_client_business = insert(:client, business: other_coach.business, creator: other_coach)
      other_template = insert(:form_template, business: other_coach.business)

      other_assignment =
        insert(:form_assignment,
          business: other_coach.business,
          client: other_client_business,
          form_template: other_template
        )

      cross_business =
        insert(:form_submission,
          business: other_coach.business,
          client: other_client_business,
          form_assignment: other_assignment
        )

      for id <- [submission.id, cross_business.id, Ecto.UUID.generate()] do
        assert {:error, :not_found} =
                 Chat.send_message(coach_ctx(coach), conversation.id, %{
                   embed: %{type: "form_submission", id: id}
                 })
      end

      assert {:error, changeset} = Chat.send_client_message(client_ctx(client), %{embed: embed})
      assert "is not allowed" in errors_on(changeset).embed
    end

    test "paginated messages preload attachments without changing message order", %{
      coach: coach,
      client: client
    } do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      attachment = insert(:attachment, business: coach.business, client: client)
      {:ok, first} = Chat.send_message(coach_ctx(coach), conversation.id, %{body: "first"})

      {:ok, second} =
        Chat.send_message(coach_ctx(coach), conversation.id, %{
          body: "second",
          attachment_ids: [attachment.id]
        })

      assert {:ok, %{messages: messages}} = Chat.list_messages(coach_ctx(coach), conversation.id)
      assert Enum.map(messages, & &1.id) == [first.id, second.id]
      assert Enum.map(List.last(messages).attachments, & &1.id) == [attachment.id]
    end

    test "send_message bumps preview and unread for the client", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      {:ok, _} = Chat.send_message(coach_ctx(coach), conversation.id, %{body: "hello there"})

      assert {:ok, client_view} = Chat.get_client_conversation(client_ctx(client))
      assert client_view.last_message_preview == "hello there"
      assert client_view.unread_count == 1
    end

    test "mark_client_read zeroes the client's unread", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      {:ok, _} = Chat.send_message(coach_ctx(coach), conversation.id, %{body: "hi"})

      assert {:ok, _} = Chat.mark_client_read(client_ctx(client))
      assert {:ok, %{unread_count: 0}} = Chat.get_client_conversation(client_ctx(client))
    end

    test "mark_read stamps the cursor at the newest message, not now", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      {:ok, _} = Chat.send_client_message(client_ctx(client), %{body: "hi"})

      assert {:ok, _} = Chat.mark_read(coach_ctx(coach), conversation.id)

      reloaded = Easy.Repo.get!(Easy.Chat.Conversation, conversation.id)
      assert reloaded.coach_last_read_at == reloaded.last_message_at
    end

    test "client messages start one waiting clock, repeats preserve it, and a coach reply clears it", %{
      coach: coach,
      client: client
    } do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)

      assert {:ok, first} = Chat.send_client_message(client_ctx(client), %{body: "first"})
      after_first = Repo.reload(conversation)
      assert after_first.waiting_since == first.inserted_at
      assert after_first.last_message_at == first.inserted_at
      assert after_first.last_message_role == :client

      assert {:ok, second} = Chat.send_client_message(client_ctx(client), %{body: "second"})
      after_second = Repo.reload(conversation)
      assert after_second.waiting_since == first.inserted_at
      assert after_second.last_message_at == second.inserted_at
      assert after_second.last_message_role == :client

      assert {:ok, coach_reply} = Chat.send_message(coach_ctx(coach), conversation.id, %{body: "reply"})
      after_reply = Repo.reload(conversation)
      assert after_reply.waiting_since == nil
      assert after_reply.last_message_at == coach_reply.inserted_at
      assert after_reply.last_message_role == :coach
    end

    test "mark_read changes only the cursor and preserves waiting state", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert {:ok, message} = Chat.send_client_message(client_ctx(client), %{body: "still waiting"})

      assert {:ok, read} = Chat.mark_read(coach_ctx(coach), conversation.id)
      reloaded = Repo.reload(conversation)

      assert read.coach_last_read_at == message.inserted_at
      assert reloaded.coach_last_read_at == message.inserted_at
      assert reloaded.waiting_since == message.inserted_at
    end

    test "mark handled clears the observed sequence idempotently without changing read state", %{
      coach: coach,
      client: client
    } do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert {:ok, message} = Chat.send_client_message(client_ctx(client), %{body: "thanks"})
      assert {:ok, _read} = Chat.mark_read(coach_ctx(coach), conversation.id)
      cursor = Repo.reload(conversation).coach_last_read_at

      assert {:ok, :handled} =
               Chat.mark_conversation_handled(coach_ctx(coach), conversation.id, message.inserted_at)

      handled = Repo.reload(conversation)
      assert handled.waiting_since == nil
      assert handled.coach_last_read_at == cursor

      assert {:ok, :handled} =
               Chat.mark_conversation_handled(coach_ctx(coach), conversation.id, message.inserted_at)

      assert Repo.reload(conversation).coach_last_read_at == cursor
    end

    test "mark handled returns conflict for a newer waiting message", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert {:ok, first} = Chat.send_client_message(client_ctx(client), %{body: "first"})
      assert {:ok, second} = Chat.send_client_message(client_ctx(client), %{body: "newer"})

      assert {:error, :conflict} =
               Chat.mark_conversation_handled(coach_ctx(coach), conversation.id, first.inserted_at)

      reloaded = Repo.reload(conversation)
      assert reloaded.waiting_since == first.inserted_at
      assert reloaded.last_message_at == second.inserted_at
    end

    test "mark handled supports inactive clients", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert {:ok, message} = Chat.send_client_message(client_ctx(client), %{body: "before deactivation"})

      client
      |> Ecto.Changeset.change(status: :inactive, inactive_reason: :manual)
      |> Repo.update!()

      assert {:ok, :handled} =
               Chat.mark_conversation_handled(coach_ctx(coach), conversation.id, message.inserted_at)

      assert Repo.reload(conversation).waiting_since == nil
    end

    test "mark handled is tenant- and trainer-visibility scoped", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert {:ok, message} = Chat.send_client_message(client_ctx(client), %{body: "private"})
      other_trainer = insert(:coach, business: coach.business)
      other_business = insert(:business)

      assert {:error, :not_found} =
               Chat.mark_conversation_handled(
                 trainer_ctx(other_trainer),
                 conversation.id,
                 message.inserted_at
               )

      assert {:error, :not_found} =
               Chat.mark_conversation_handled(
                 owner_ctx(other_business),
                 conversation.id,
                 message.inserted_at
               )

      assert Repo.reload(conversation).waiting_since == message.inserted_at

      assert {:ok, :handled} =
               Chat.mark_conversation_handled(
                 owner_ctx(coach.business),
                 conversation.id,
                 message.inserted_at
               )
    end

    test "client sends create the conversation lazily and set coach unread", %{coach: coach, client: client} do
      assert {:ok, message} = Chat.send_client_message(client_ctx(client), %{body: "help"})
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

      {:ok, message} = Chat.send_message(coach_ctx(coach), conversation.id, %{body: "ping"})

      assert_receive {:chat_message_created, %{id: message_id}}
      assert message_id == message.id
      assert_receive {:conversation_updated, conversation_id}
      assert conversation_id == conversation.id
    end
  end

  defp capture_queries(fun) do
    parent = self()
    handler_id = {__MODULE__, make_ref()}

    :telemetry.attach(
      handler_id,
      [:easy, :repo, :query],
      fn _event, _measurements, metadata, _config -> send(parent, {:query, metadata.query}) end,
      nil
    )

    try do
      {fun.(), received_queries()}
    after
      :telemetry.detach(handler_id)
    end
  end

  defp received_queries(queries \\ []) do
    receive do
      {:query, query} -> received_queries([query | queries])
    after
      0 -> Enum.reverse(queries)
    end
  end
end

defmodule Easy.ChatConcurrencyTest do
  use ExUnit.Case, async: false

  import Ecto.Query
  import Easy.Factory

  alias Easy.Chat
  alias Easy.Chat.Conversation
  alias Easy.Chat.Message
  alias Easy.Clients.Client
  alias Easy.Ctx
  alias Easy.Identity.User
  alias Easy.Orgs.Business
  alias Easy.Orgs.Coach
  alias Easy.Repo
  alias Ecto.Adapters.SQL.Sandbox

  setup do
    Sandbox.checkout(Repo, sandbox: false)

    business = insert(:business)
    coach = insert(:coach, business: business, user: business.owner)
    client = insert(:client, business: business, creator: coach, assigned_coach: coach)
    coach_ctx = Ctx.new(business.id, business.owner_id, coach.id, true)
    client_ctx = %Ctx{business_id: business.id, user_id: client.user_id, client_id: client.id}

    assert {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx, client.id)
    assert {:ok, first} = Chat.send_client_message(client_ctx, %{body: "first"})

    on_exit(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      cleanup(business, coach, client)
    end)

    %{
      business: business,
      client: client,
      client_ctx: client_ctx,
      coach_ctx: coach_ctx,
      conversation: conversation,
      first: first
    }
  end

  test "a stale Mark handled race cannot clear a newer client sequence", context do
    parent = self()

    send_task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        send(parent, {:ready, self()})

        receive do
          :go -> Chat.send_client_message(context.client_ctx, %{body: "newer"})
        end
      end)

    handle_task =
      Task.async(fn ->
        Sandbox.checkout(Repo, sandbox: false)
        send(parent, {:ready, self()})

        receive do
          :go ->
            Chat.mark_conversation_handled(
              context.coach_ctx,
              context.conversation.id,
              context.first.inserted_at
            )
        end
      end)

    workers =
      for _ <- 1..2 do
        receive do
          {:ready, pid} -> pid
        end
      end

    Enum.each(workers, &send(&1, :go))

    assert {:ok, newer} = Task.await(send_task, 5_000)
    assert Task.await(handle_task, 5_000) in [{:ok, :handled}, {:error, :conflict}]

    reloaded = Repo.reload(context.conversation)
    assert reloaded.last_message_at == newer.inserted_at
    assert reloaded.waiting_since
  end

  defp cleanup(business, coach, client) do
    Repo.delete_all(from message in Message, where: message.business_id == ^business.id)
    Repo.delete_all(from conversation in Conversation, where: conversation.business_id == ^business.id)
    Repo.delete_all(from c in Client, where: c.id == ^client.id)
    Repo.delete_all(from c in Coach, where: c.id == ^coach.id)
    Repo.delete_all(from b in Business, where: b.id == ^business.id)
    Repo.delete_all(from u in User, where: u.id in ^[business.owner_id, client.user_id])
  end
end
