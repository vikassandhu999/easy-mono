defmodule EasyWeb.Clients.ConversationRecoveryTest do
  use Easy.ConnCase

  alias Easy.Chat
  alias Easy.Chat.Conversation
  alias Easy.{Ctx, Repo}

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach)
    ctx = %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
    {:ok, conversation} = Chat.get_client_conversation(ctx)

    %{
      conn: build_conn() |> authenticate_client(client),
      coach: coach,
      client: client,
      ctx: ctx,
      conversation: conversation
    }
  end

  test "history keeps tenant/client scope, server count and a deleted cursor boundary", ctx do
    stamp = DateTime.utc_now(:microsecond)
    messages = for _ <- 1..4, do: message(ctx.conversation, inserted_at: stamp)
    ids = messages |> Enum.map(& &1.id) |> Enum.sort(:desc)
    other = insert(:client, business: ctx.coach.business, creator: ctx.coach)
    other_conversation = insert(:conversation, business: other.business, client: other)
    message(other_conversation)
    message(insert(:conversation))

    first = history(ctx.conn, %{"limit" => "2"})
    assert first["count"] == 4
    assert first["latest_message_at"] == DateTime.to_iso8601(stamp)
    assert Enum.map(first["data"], & &1["id"]) == Enum.take(ids, 2)
    assert is_binary(first["next_cursor"])
    Enum.each(first["data"], &refute(Map.has_key?(&1, "business_id")))

    messages |> Enum.find(&(&1.id == Enum.at(ids, 1))) |> Repo.delete!()
    newer = message(ctx.conversation, inserted_at: DateTime.add(stamp, 1))
    second = history(ctx.conn, %{"limit" => "2", "cursor" => first["next_cursor"]})
    assert second["count"] == 4
    assert second["latest_message_at"] == DateTime.to_iso8601(newer.inserted_at)
    assert Enum.map(second["data"], & &1["id"]) == Enum.drop(ids, 2)
    assert second["next_cursor"] == nil
  end

  test "empty history, page cap and typed query validation", ctx do
    assert history(ctx.conn) == %{"data" => [], "count" => 0, "next_cursor" => nil, "latest_message_at" => nil}
    for _ <- 1..101, do: message(ctx.conversation)
    capped = history(ctx.conn, %{"limit" => "1000"})
    assert capped["count"] == 101
    assert length(capped["data"]) == 100
    assert is_binary(capped["next_cursor"])

    for query <- [%{"limit" => "0"}, %{"limit" => "many"}, %{"cursor" => "broken"}, %{"before" => Ecto.UUID.generate()}] do
      assert ctx.conn |> get("/v1/client/conversation/history", query) |> json_response(422)
    end

    assert build_conn() |> get("/v1/client/conversation/history") |> json_response(403)
  end

  test "a retry returns one message without another event or changing a subsequent coach reply", ctx do
    Phoenix.PubSub.subscribe(Easy.PubSub, "conversation:#{ctx.conversation.id}")
    Phoenix.PubSub.subscribe(Easy.PubSub, "inbox:business:#{ctx.client.business_id}")
    attrs = %{"request_id" => Ecto.UUID.generate(), "body" => "  I finished today  "}
    first = send_message(ctx.conn, attrs)
    assert first["request_id"] == attrs["request_id"]
    assert first["body"] == "I finished today"
    assert_receive {:chat_message_created, _}
    assert_receive {:conversation_updated, _}

    coach_ctx = Ctx.new(ctx.coach.business_id, ctx.coach.user_id, ctx.coach.id, true)
    {:ok, reply} = Chat.send_message(coach_ctx, ctx.conversation.id, %{body: "Well done"})
    assert_receive {:chat_message_created, _}
    assert_receive {:conversation_updated, _}
    assert send_message(ctx.conn, attrs) == first
    refute_receive {:chat_message_created, _}
    refute_receive {:conversation_updated, _}
    assert history(ctx.conn)["count"] == 2
    assert %{last_message_at: at} = Repo.reload!(ctx.conversation)
    assert at == reply.inserted_at

    changed = %{attrs | "body" => "A different message"}
    assert ctx.conn |> post("/v1/client/conversation/messages", changed) |> json_response(409)
    assert history(ctx.conn)["count"] == 2
  end

  test "attachment retries preserve order and reject changes and foreign ownership", ctx do
    one = insert(:attachment, business: ctx.client.business, client: ctx.client)
    two = insert(:attachment, business: ctx.client.business, client: ctx.client)
    attrs = %{"request_id" => Ecto.UUID.generate(), "attachment_ids" => [two.id, one.id]}
    first = send_message(ctx.conn, attrs)
    assert first["body"] == nil
    assert Enum.map(first["attachments"], & &1["id"]) == [two.id, one.id]
    assert send_message(ctx.conn, attrs) == first
    assert history(ctx.conn)["data"] == [first]

    for ids <- [[one.id, two.id], [two.id]] do
      assert ctx.conn |> post("/v1/client/conversation/messages", %{attrs | "attachment_ids" => ids}) |> json_response(409)
    end

    other = insert(:client, business: ctx.coach.business, creator: ctx.coach)
    same_business = insert(:attachment, business: other.business, client: other)
    foreign = insert(:attachment)

    for attachment <- [same_business, foreign] do
      invalid = %{attrs | "request_id" => Ecto.UUID.generate(), "attachment_ids" => [attachment.id]}
      assert ctx.conn |> post("/v1/client/conversation/messages", invalid) |> json_response(404)
    end

    assert history(ctx.conn)["count"] == 1
  end

  test "request identities are scoped to the authenticated client and invalid sends reserve nothing", ctx do
    request_id = Ecto.UUID.generate()

    for body <- [%{"request_id" => "invalid", "body" => "Hello"}, %{"request_id" => request_id}, %{"request_id" => request_id, "body" => String.duplicate("x", 4001)}] do
      assert ctx.conn |> post("/v1/client/conversation/messages", body) |> json_response(422)
    end

    attrs = %{"request_id" => request_id, "body" => "Hello"}
    first = send_message(ctx.conn, attrs)
    same_business = insert(:client, business: ctx.coach.business, creator: ctx.coach)
    foreign = insert(:client)

    for client <- [same_business, foreign] do
      conn = build_conn() |> authenticate_client(client)
      other = send_message(conn, attrs)
      refute other["id"] == first["id"]
      refute other["conversation_id"] == first["conversation_id"]
      assert other["sender_id"] == client.id
      assert history(conn)["data"] == [other]
    end

    assert history(ctx.conn)["data"] == [first]
    assert ctx.conn |> post("/v1/client/conversation/messages", Map.put(attrs, "sender_id", foreign.id)) |> json_response(422)
  end

  test "bounded read acknowledges only observed messages and never moves backwards", ctx do
    coach_ctx = Ctx.new(ctx.coach.business_id, ctx.coach.user_id, ctx.coach.id, true)
    {:ok, first} = Chat.send_message(coach_ctx, ctx.conversation.id, %{body: "First"})
    observed = history(ctx.conn)["latest_message_at"]
    {:ok, second} = Chat.send_message(coach_ctx, ctx.conversation.id, %{body: "New arrival"})
    assert DateTime.compare(second.inserted_at, first.inserted_at) == :gt
    assert read(ctx.conn, observed)["unread_count"] == 1
    assert Repo.reload!(ctx.conversation).client_last_read_at == first.inserted_at

    read(ctx.conn, DateTime.to_iso8601(DateTime.add(first.inserted_at, -1)))
    assert Repo.reload!(ctx.conversation).client_last_read_at == first.inserted_at
    assert read(ctx.conn, DateTime.to_iso8601(DateTime.add(second.inserted_at, 60)))["unread_count"] == 0
    assert Repo.reload!(ctx.conversation).client_last_read_at == second.inserted_at
    assert ctx.conn |> post("/v1/client/conversation/read?through=invalid") |> json_response(422)
  end

  test "read markers remain inside the current account", ctx do
    other = insert(:client, business: ctx.coach.business, creator: ctx.coach)
    conversation = insert(:conversation, business: other.business, client: other)
    message(conversation)
    read(ctx.conn, DateTime.to_iso8601(DateTime.utc_now()))
    assert Repo.get!(Conversation, conversation.id).client_last_read_at == nil
  end

  defp message(conversation, attrs \\ []) do
    insert(:chat_message, Keyword.merge([conversation: conversation, business: nil, business_id: conversation.business_id], attrs))
  end

  defp history(conn, query \\ %{}), do: conn |> get("/v1/client/conversation/history", query) |> json_response(200)
  defp send_message(conn, attrs), do: conn |> post("/v1/client/conversation/messages", attrs) |> json_response(201) |> Map.fetch!("data")
  defp read(conn, through), do: conn |> post("/v1/client/conversation/read?" <> URI.encode_query(%{"through" => through})) |> json_response(200) |> Map.fetch!("data")
end
