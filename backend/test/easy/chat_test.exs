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
    test "normalizes body text before checking its length" do
      body = String.duplicate("a", 4000)
      changeset = Message.insert_changeset("biz", :client, "c1", "conv", %{body: "  #{body}  "})

      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :body) == body

      blank = Message.insert_changeset("biz", :client, "c1", "conv", %{body: " \n "})
      refute Message.put_content(blank, [], nil).valid?
      assert Ecto.Changeset.get_field(blank, :body) == nil
    end

    test "requires a body when there are no attachments or embed" do
      cs =
        "biz"
        |> Message.insert_changeset(:client, "c1", "conv", %{})
        |> Message.put_content([], nil)

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

  describe "Message.put_content/3" do
    test "registers embed database constraints on the changeset" do
      changeset = Message.insert_changeset("biz", :coach, "coach", "conv", %{})
      constraints = Enum.map(changeset.constraints, & &1.constraint)

      assert "chat_messages_embed_type_check" in constraints
      assert "chat_messages_embed_complete_check" in constraints
    end

    test "database enforces complete and unique sender request identities" do
      conversation = insert(:conversation)
      sender_id = conversation.client_id
      attrs = %{body: "Hello", request_id: Ecto.UUID.generate()}

      changeset =
        conversation.business_id
        |> Message.insert_changeset(:client, sender_id, conversation.id, attrs)

      assert {:error, incomplete} = Easy.Repo.insert(changeset, mode: :savepoint)
      assert "is invalid" in errors_on(incomplete).request_id

      complete = Message.put_request_fingerprint(changeset, [], nil)
      assert {:ok, _} = Easy.Repo.insert(complete)
      assert {:error, duplicate} = Easy.Repo.insert(complete, mode: :savepoint)
      assert "has already been taken" in errors_on(duplicate).request_id

      another_sender =
        conversation.business_id
        |> Message.insert_changeset(:coach, Ecto.UUID.generate(), conversation.id, attrs)
        |> Message.put_request_fingerprint([], nil)

      assert {:ok, _} = Easy.Repo.insert(another_sender)
    end

    test "maps embed completeness constraint failures to changeset errors" do
      conversation = insert(:conversation)

      changeset =
        conversation.business_id
        |> Message.insert_changeset(
          :coach,
          Ecto.UUID.generate(),
          conversation.id,
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
      client = insert(:client, business: coach.business, coach: coach)
      %{coach: coach, client: client}
    end

    test "get_or_create_conversation_for_client is idempotent", %{coach: coach, client: client} do
      assert {:ok, a} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert {:ok, b} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert a.id == b.id
      assert a.unread_count == 0
      assert a.client.id == client.id
    end

    test "client conversation operations reject missing and cross-tenant clients", %{coach: coach, client: client} do
      missing = %Ctx{business_id: coach.business_id, user_id: client.user_id, client_id: Ecto.UUID.generate()}
      cross_tenant = %{client_ctx(client) | business_id: insert(:business).id}

      for ctx <- [%{missing | client_id: nil}, missing, cross_tenant] do
        assert {:error, :not_found} = Chat.get_client_conversation(ctx)
        assert {:error, :not_found} = Chat.list_client_messages(ctx)
        assert {:error, :not_found} = Chat.send_client_message(ctx, %{body: "must not send"})
        assert {:error, :not_found} = Chat.mark_client_read(ctx)
      end

      refute Repo.exists?(Conversation)
      refute Repo.exists?(Message)
    end

    test "conversation tenant constraint rejects direct cross-business inserts", %{client: client} do
      other_business = insert(:business)

      assert {:error, changeset} =
               other_business.id |> Conversation.insert_changeset(client.id) |> Repo.insert()

      assert errors_on(changeset).client_id == ["does not exist"]
    end

    test "message changesets reject missing and cross-tenant conversations", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      other_business = insert(:business)

      for {business_id, conversation_id} <- [
            {coach.business_id, Ecto.UUID.generate()},
            {other_business.id, conversation.id}
          ] do
        assert {:error, changeset} =
                 business_id
                 |> Message.insert_changeset(:coach, coach.id, conversation_id, %{body: "Private"})
                 |> Repo.insert()

        assert errors_on(changeset).conversation_id == ["does not exist"]
      end
    end

    test "batches unread counts for a deterministic conversation page", %{coach: coach, client: client} do
      other_client = insert(:client, business: coach.business, coach: coach)

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
      other = insert(:client, business: other_coach.business, coach: other_coach)
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

    test "string-keyed messages preserve ordered attachments and trim their body", %{coach: coach, client: client} do
      first = insert(:attachment, business: coach.business, client: client)
      second = insert(:attachment, business: coach.business, client: client)

      assert {:ok, message} =
               Chat.send_client_message(client_ctx(client), %{
                 "body" => "  Photos  ",
                 "attachment_ids" => [second.id, first.id]
               })

      assert message.body == "Photos"
      assert Enum.map(message.attachments, & &1.id) == [second.id, first.id]
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
      other_client = insert(:client, business: coach.business, coach: coach)
      cross_client = insert(:attachment, business: coach.business, client: other_client)
      other_coach = insert(:coach)
      foreign_client = insert(:client, business: other_coach.business, coach: other_coach)
      cross_tenant = insert(:attachment, business: other_coach.business, client: foreign_client)

      for id <- [Ecto.UUID.generate(), cross_client.id, cross_tenant.id] do
        assert {:error, :not_found} =
                 Chat.send_message(coach_ctx(coach), conversation.id, %{
                   body: "must roll back",
                   attachment_ids: [id]
                 })
      end

      assert Easy.Repo.aggregate(Message, :count) == 0
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

    test "client and coach messages update the conversation preview", %{
      coach: coach,
      client: client
    } do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)

      assert {:ok, first} = Chat.send_client_message(client_ctx(client), %{body: "first"})
      after_first = Repo.reload(conversation)
      assert after_first.last_message_at == first.inserted_at
      assert after_first.last_message_role == :client

      assert {:ok, second} = Chat.send_client_message(client_ctx(client), %{body: "second"})
      after_second = Repo.reload(conversation)
      assert after_second.last_message_at == second.inserted_at
      assert after_second.last_message_role == :client

      assert {:ok, coach_reply} = Chat.send_message(coach_ctx(coach), conversation.id, %{body: "reply"})
      after_reply = Repo.reload(conversation)
      assert after_reply.last_message_at == coach_reply.inserted_at
      assert after_reply.last_message_role == :coach
    end

    test "mark_read updates the coach cursor", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert {:ok, message} = Chat.send_client_message(client_ctx(client), %{body: "hello coach"})

      assert {:ok, read} = Chat.mark_read(coach_ctx(coach), conversation.id)
      reloaded = Repo.reload(conversation)

      assert read.coach_last_read_at == message.inserted_at
      assert reloaded.coach_last_read_at == message.inserted_at
    end

    test "coach read broadcasts an inbox update after success", %{coach: coach, client: client} do
      {:ok, conversation} = Chat.get_or_create_conversation_for_client(coach_ctx(coach), client.id)
      assert {:ok, _message} = Chat.send_client_message(client_ctx(client), %{body: "please review"})
      Phoenix.PubSub.subscribe(Easy.PubSub, "inbox:business:#{coach.business_id}")

      assert {:ok, _read} = Chat.mark_read(coach_ctx(coach), conversation.id)
      assert_receive {:conversation_updated, conversation_id}
      assert conversation_id == conversation.id
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

      assigned = insert(:client, business: coach.business, coach: trainer)
      {:ok, conv} = Chat.get_or_create_conversation_for_client(owner_coach_ctx(coach), assigned.id)

      assert {:ok, %{count: 1, conversations: [visible]}} = Chat.list_conversations(trainer_ctx(trainer))
      assert visible.id == conv.id
      assert {:ok, _} = Chat.get_conversation(trainer_ctx(trainer), conv.id)
    end

    test "get_or_create 404s for an unassigned trainer", %{coach: coach, client: client} do
      trainer = insert(:coach, business: coach.business)
      assert {:error, :not_found} = Chat.get_or_create_conversation_for_client(trainer_ctx(trainer), client.id)
    end

    test "hidden conversation operations reject access without changing messages or cursors", %{
      coach: coach,
      client: client
    } do
      {:ok, message} = Chat.send_client_message(client_ctx(client), %{body: "private"})
      {:ok, conversation} = Chat.get_client_conversation(client_ctx(client))
      hidden_trainer = insert(:coach, business: coach.business)
      foreign_coach = insert(:coach)

      for ctx <- [trainer_ctx(hidden_trainer), owner_coach_ctx(foreign_coach)] do
        assert {:ok, %{count: 0, conversations: []}} = Chat.list_conversations(ctx)
        assert {:error, :not_found} = Chat.get_conversation(ctx, conversation.id)
        assert {:error, :not_found} = Chat.list_messages(ctx, conversation.id)
        assert {:error, :not_found} = Chat.send_message(ctx, conversation.id, %{body: "must not send"})
        assert {:error, :not_found} = Chat.mark_read(ctx, conversation.id)
      end

      assert Repo.aggregate(Message, :count) == 1
      unchanged = Repo.reload!(conversation)
      assert unchanged.coach_last_read_at == nil
      assert unchanged.last_message_preview == "private"

      assert {:ok, %{messages: [visible]}} = Chat.list_messages(owner_coach_ctx(coach), conversation.id)
      assert visible.id == message.id
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
      fn _event, _measurements, metadata, _config ->
        if self() == parent, do: send(parent, {:query, metadata.query})
      end,
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
  alias Easy.CoachingTerms.CoachingTerm
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
    client = insert(:client, business: business, coach: coach)
    coach_ctx = Ctx.new(business.id, business.owner_user_id, coach.id, true)
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

  test "concurrent retries publish and persist one message", context do
    Phoenix.PubSub.subscribe(Easy.PubSub, "conversation:#{context.conversation.id}")
    attrs = %{body: "One send", request_id: Ecto.UUID.generate()}
    results = concurrent_sends(context.client_ctx, List.duplicate(attrs, 8))
    messages = Enum.map(results, fn {:ok, message} -> message end)
    assert length(Enum.uniq_by(messages, & &1.id)) == 1
    assert_receive {:chat_message_created, _}
    refute_receive {:chat_message_created, _}
    assert Repo.aggregate(Message.for_conversation(context.business.id, context.conversation.id), :count) == 2
  end

  test "competing payloads with one request identity have one winner", context do
    request_id = Ecto.UUID.generate()
    attrs = for n <- 1..4, do: %{body: "Contender #{n}", request_id: request_id}
    results = concurrent_sends(context.client_ctx, attrs)
    assert Enum.count(results, &match?({:ok, _}, &1)) == 1
    assert Enum.count(results, &(&1 == {:error, :conflict})) == 3
    assert Repo.aggregate(Message.for_conversation(context.business.id, context.conversation.id), :count) == 2
  end

  defp concurrent_sends(ctx, payloads) do
    parent = self()

    tasks =
      Enum.map(payloads, fn attrs ->
        Task.async(fn ->
          Sandbox.checkout(Repo, sandbox: false)
          send(parent, {:send_ready, self()})

          receive do
            :go -> Chat.send_client_message(ctx, attrs)
          end
        end)
      end)

    workers =
      for _ <- payloads do
        receive do
          {:send_ready, pid} -> pid
        end
      end

    Enum.each(workers, &send(&1, :go))
    Enum.map(tasks, &Task.await(&1, 5_000))
  end

  for reader <- [:coach, :client] do
    @reader reader

    test "#{@reader} read marker returns not found when the conversation is deleted", context do
      {:ok, contender} =
        Repo.transaction(fn ->
          Conversation |> lock("FOR UPDATE") |> Repo.get!(context.conversation.id)
          contender = start_reader(context, @reader)
          assert_receive {:reader, pid}, 1_000
          assert_reader_blocked(pid, 100)
          Repo.delete!(context.conversation)
          contender
        end)

      assert {:error, :not_found} = Task.await(contender, 5_000)
    end
  end

  test "a blocked read marker returns the conversation state used by its cursor", context do
    {:ok, {contender, newer}} =
      Repo.transaction(fn ->
        Conversation |> lock("FOR UPDATE") |> Repo.get!(context.conversation.id)
        contender = start_reader(context, :coach)
        assert_receive {:reader, pid}, 1_000
        assert_reader_blocked(pid, 100)
        {:ok, newer} = Chat.send_client_message(context.client_ctx, %{body: "newer"})
        {contender, newer}
      end)

    assert {:ok, read} = Task.await(contender, 5_000)
    assert read.coach_last_read_at == newer.inserted_at
    assert read.last_message_at == newer.inserted_at
    assert read.last_message_preview == "newer"
    assert read.client.id == context.client.id
    assert read.unread_count == 0
  end

  defp start_reader(context, reader) do
    parent = self()

    Task.async(fn ->
      Sandbox.checkout(Repo, sandbox: false)
      %{rows: [[pid]]} = Repo.query!("SELECT pg_backend_pid()")
      send(parent, {:reader, pid})

      try do
        case reader do
          :coach -> Chat.mark_read(context.coach_ctx, context.conversation.id)
          :client -> Chat.mark_client_read(context.client_ctx)
        end
      rescue
        error -> {:raised, error.__struct__}
      end
    end)
  end

  defp assert_reader_blocked(_pid, 0), do: flunk("read marker never waited for the conversation lock")

  defp assert_reader_blocked(pid, attempts) do
    case Repo.query!("SELECT cardinality(pg_blocking_pids($1)) > 0", [pid]).rows do
      [[true]] ->
        :ok

      [[false]] ->
        Process.sleep(10)
        assert_reader_blocked(pid, attempts - 1)
    end
  end

  defp cleanup(business, coach, client) do
    Repo.delete_all(CoachingTerm.for_business(business.id))
    Repo.delete_all(from message in Message, where: message.business_id == ^business.id)
    Repo.delete_all(from conversation in Conversation, where: conversation.business_id == ^business.id)
    Repo.delete_all(from c in Client, where: c.id == ^client.id)
    Repo.delete_all(from c in Coach, where: c.id == ^coach.id)
    Repo.delete_all(from b in Business, where: b.id == ^business.id)
    Repo.delete_all(from u in User, where: u.id in ^[business.owner_user_id, client.user_id])
  end
end
