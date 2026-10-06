defmodule EasyWeb.Coaches.ConversationControllerTest do
  use Easy.ConnCase

  alias Easy.Chat.Conversation, as: ChatConversation
  alias Easy.Repo

  import Ecto.Query

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    conn = build_conn() |> authenticate_coach(coach) |> put_req_header("content-type", "application/json")
    %{conn: conn, coach: coach, client: client}
  end

  describe "GET /v1/coach/clients/:client_id/conversation" do
    test "creates on first access and returns unread_count", %{conn: conn, client: client} do
      conn = get(conn, "/v1/coach/clients/#{client.id}/conversation")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["client_id"] == client.id
      assert data["unread_count"] == 0
      assert is_binary(data["client_name"])
    end

    test "404s for a client in another business", %{conn: conn} do
      other_coach = insert(:coach)
      other = insert(:client, business: other_coach.business, coach: other_coach)
      conn = get(conn, "/v1/coach/clients/#{other.id}/conversation")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/conversations/:id/messages" do
    test "sends and lists back ascending", %{conn: conn, coach: coach, client: client} do
      %{"data" => %{"id" => conversation_id}} =
        conn |> get("/v1/coach/clients/#{client.id}/conversation") |> json_response(200)

      post_conn = post(conn, "/v1/coach/conversations/#{conversation_id}/messages", %{"body" => "Hello"})
      assert %{"data" => message} = json_response(post_conn, 201)
      assert message["sender_type"] == "coach"
      assert message["body"] == "Hello"
      assert message["attachments"] == []
      assert message["embed"] == nil

      assert Map.keys(message) |> Enum.sort() ==
               ~w(attachments body conversation_id edited_at embed id inserted_at request_id sender_id sender_name sender_type)

      list_conn =
        build_conn() |> authenticate_coach(coach) |> get("/v1/coach/conversations/#{conversation_id}/messages")

      assert %{"data" => [%{"body" => "Hello"}], "has_more" => false} = json_response(list_conn, 200)
    end

    test "returns attachment metadata and the backend workout record snapshot", %{
      conn: conn,
      client: client
    } do
      %{"data" => %{"id" => conversation_id}} =
        conn |> get("/v1/coach/clients/#{client.id}/conversation") |> json_response(200)

      attachment = insert(:attachment, business: client.business, client: client, content_type: "audio/webm")
      entry = insert(:workout_session, state: :completed, business: client.business, client: client)

      post_conn =
        post(conn, "/v1/coach/conversations/#{conversation_id}/messages", %{
          "attachment_ids" => [attachment.id],
          "embed" => %{"type" => "training_session", "id" => entry.id}
        })

      response = json_response(post_conn, 201)

      assert %{
               "data" => %{
                 "body" => nil,
                 "attachments" => [
                   %{
                     "id" => attachment_id,
                     "content_type" => "audio/webm",
                     "byte_size" => 1024,
                     "duration_ms" => nil
                   }
                 ],
                 "embed" => %{
                   "type" => "training_session",
                   "id" => entry_id,
                   "snapshot" => %{
                     "title" => title,
                     "recorded_at" => recorded_at
                   }
                 }
               }
             } = response

      assert attachment_id == attachment.id
      assert entry_id == entry.id
      assert title == "Workout"
      assert recorded_at == DateTime.to_iso8601(entry.ended_at)

      list_conn =
        build_conn()
        |> authenticate_coach(client.coach)
        |> get("/v1/coach/conversations/#{conversation_id}/messages")

      assert %{
               "data" => [
                 %{
                   "attachments" => [
                     %{
                       "id" => ^attachment_id,
                       "content_type" => "audio/webm",
                       "byte_size" => 1024,
                       "duration_ms" => nil
                     }
                   ],
                   "embed" => %{
                     "type" => "training_session",
                     "id" => ^entry_id,
                     "snapshot" => %{
                       "title" => ^title,
                       "recorded_at" => ^recorded_at
                     }
                   }
                 }
               ]
             } = json_response(list_conn, 200)
    end

    test "422s on a blank body", %{conn: conn, client: client} do
      %{"data" => %{"id" => conversation_id}} =
        conn |> get("/v1/coach/clients/#{client.id}/conversation") |> json_response(200)

      conn = post(conn, "/v1/coach/conversations/#{conversation_id}/messages", %{"body" => ""})
      assert json_response(conn, 422)
    end

    test "rejects unknown keys and invalid embed types", %{conn: conn, client: client} do
      %{"data" => %{"id" => conversation_id}} =
        conn |> get("/v1/coach/clients/#{client.id}/conversation") |> json_response(200)

      unknown =
        post(conn, "/v1/coach/conversations/#{conversation_id}/messages", %{
          "body" => "Hello",
          "sender_type" => "client"
        })

      invalid_embed =
        post(conn, "/v1/coach/conversations/#{conversation_id}/messages", %{
          "embed" => %{"type" => "workout", "id" => Ecto.UUID.generate()}
        })

      assert json_response(unknown, 422)
      assert json_response(invalid_embed, 422)
    end
  end

  describe "GET /v1/coach/conversations" do
    test "rejects invalid or unknown query values", %{conn: conn} do
      invalid = get(conn, "/v1/coach/conversations", %{"limit" => "many"})
      unknown = get(conn, "/v1/coach/conversations", %{"sort" => "oldest"})

      assert json_response(invalid, 422)
      assert json_response(unknown, 422)
    end

    test "inbox lists with unread counts, newest first", %{conn: conn, coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)

      insert(:chat_message,
        business: coach.business,
        conversation: conversation,
        sender_type: :client,
        sender_id: client.id,
        body: "unread one"
      )

      conn = get(conn, "/v1/coach/conversations")
      assert response = %{"data" => [data], "count" => 1} = json_response(conn, 200)
      assert Map.keys(response) |> Enum.sort() == ["count", "data"]
      assert data["unread_count"] == 1
    end

    test "trainer does not see unassigned clients' conversations", %{coach: coach, client: client} do
      insert(:conversation, business: coach.business, client: client)
      trainer = insert(:coach, business: coach.business)

      conn = build_conn() |> authenticate_coach(trainer) |> get("/v1/coach/conversations")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "searches by the displayed client name", %{conn: conn, coach: coach} do
      match = insert(:client, business: coach.business, coach: coach, full_name: "Gina Lanetti")
      other = insert(:client, business: coach.business, coach: coach, full_name: "Rowan White")
      match_conversation = insert(:conversation, business: coach.business, client: match)
      insert(:conversation, business: coach.business, client: other)

      conn = get(conn, "/v1/coach/conversations", %{"search" => "Gina Lanetti"})

      assert %{"data" => [%{"id" => id}], "count" => 1} = json_response(conn, 200)
      assert id == match_conversation.id
    end
  end

  describe "GET /v1/coach/conversations/:id" do
    test "returns the conversation", %{conn: conn, coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)
      conn = get(conn, "/v1/coach/conversations/#{conversation.id}")
      assert %{"data" => %{"id" => id}} = json_response(conn, 200)
      assert id == conversation.id
    end

    test "404s for an unassigned trainer", %{coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)
      trainer = insert(:coach, business: coach.business)

      conn = build_conn() |> authenticate_coach(trainer) |> get("/v1/coach/conversations/#{conversation.id}")
      assert json_response(conn, 404)
    end
  end

  test "validates conversation and client UUIDs before context access", %{conn: conn} do
    assert json_response(get(conn, "/v1/coach/clients/not-a-uuid/conversation"), 422)
    assert json_response(get(conn, "/v1/coach/conversations/not-a-uuid"), 422)
    assert json_response(get(conn, "/v1/coach/conversations/not-a-uuid/messages"), 422)
    assert json_response(post(conn, "/v1/coach/conversations/not-a-uuid/messages", %{"body" => "hello"}), 422)
    assert json_response(post(conn, "/v1/coach/conversations/not-a-uuid/read", %{}), 422)
  end

  describe "POST /v1/coach/conversations/:id/read" do
    test "zeroes unread", %{conn: conn, coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)

      message =
        insert(:chat_message,
          business: coach.business,
          conversation: conversation,
          sender_type: :client,
          sender_id: client.id
        )

      set_conversation_timestamp(conversation, message.inserted_at)

      read_conn = post(conn, "/v1/coach/conversations/#{conversation.id}/read")
      assert %{"data" => %{"unread_count" => 0}} = json_response(read_conn, 200)
    end

    test "reads only through the observed message and leaves a later client message unread", %{
      conn: conn,
      coach: coach,
      client: client
    } do
      conversation = insert(:conversation, business: coach.business, client: client)
      observed_at = ~U[2026-09-12 10:00:00.123456Z]
      later_at = ~U[2026-09-12 10:00:01.123456Z]

      insert_client_message(conversation, client, inserted_at: observed_at)
      insert_client_message(conversation, client, inserted_at: later_at)
      set_conversation_timestamp(conversation, later_at)

      read_conn =
        post(
          conn,
          "/v1/coach/conversations/#{conversation.id}/read?through=#{DateTime.to_iso8601(observed_at)}",
          %{}
        )

      assert %{"data" => %{"unread_count" => 1}} = json_response(read_conn, 200)
    end
  end

  describe "GET /v1/coach/conversation-inbox" do
    test "includes conversations without messages", %{conn: conn, coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)

      assert %{
               "count" => 1,
               "data" => [
                 %{"id" => id, "last_message_at" => nil, "last_message_preview" => nil, "last_message_role" => nil}
               ],
               "next_cursor" => nil
             } = json_response(get(conn, "/v1/coach/conversation-inbox"), 200)

      assert id == conversation.id
    end

    test "filters unread conversations with filtered counts", %{conn: conn, coach: coach, client: client} do
      first_unread = insert(:conversation, business: coach.business, client: client)
      unread_client = insert(:client, business: coach.business, coach: coach)
      unread = insert(:conversation, business: coach.business, client: unread_client)
      normal_client = insert(:client, business: coach.business, coach: coach)
      normal = insert(:conversation, business: coach.business, client: normal_client)
      timestamp = ~U[2026-09-12 10:00:00.123456Z]

      insert_client_message(first_unread, client, inserted_at: timestamp)
      insert_client_message(unread, unread_client, inserted_at: timestamp)
      set_conversation_timestamp(first_unread, timestamp)
      set_conversation_timestamp(unread, timestamp)

      assert %{"count" => 2, "data" => unread_data} =
               json_response(get(conn, "/v1/coach/conversation-inbox", %{"status" => "unread"}), 200)

      assert Enum.map(unread_data, & &1["id"]) |> Enum.sort() == Enum.sort([first_unread.id, unread.id])

      assert %{"count" => 3, "data" => all_data} =
               json_response(get(conn, "/v1/coach/conversation-inbox", %{"status" => "all"}), 200)

      assert Enum.map(all_data, & &1["id"]) |> Enum.sort() == Enum.sort([first_unread.id, unread.id, normal.id])
    end

    test "treats search wildcards as literal characters", %{conn: conn, coach: coach} do
      match = insert(:client, business: coach.business, coach: coach, full_name: "Percent% Person")
      other = insert(:client, business: coach.business, coach: coach, full_name: "Regular Person")
      conversation = insert(:conversation, business: coach.business, client: match)
      insert(:conversation, business: coach.business, client: other)

      assert %{"count" => 1, "data" => [%{"id" => id}]} =
               json_response(get(conn, "/v1/coach/conversation-inbox", %{"search" => "%"}), 200)

      assert id == conversation.id
    end

    test "does not expose other tenants or unassigned trainer conversations", %{coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)
      trainer = insert(:coach, business: coach.business)
      other_coach = insert(:coach)
      other_client = insert(:client, business: other_coach.business, coach: other_coach)
      other_conversation = insert(:conversation, business: other_coach.business, client: other_client)
      trainer_conn = build_conn() |> authenticate_coach(trainer)
      owner_conn = build_conn() |> authenticate_coach(coach)

      assert %{"count" => 0, "data" => []} = json_response(get(trainer_conn, "/v1/coach/conversation-inbox"), 200)
      assert json_response(get(trainer_conn, "/v1/coach/conversations/#{conversation.id}/history"), 404)
      assert json_response(get(owner_conn, "/v1/coach/conversations/#{other_conversation.id}/history"), 404)
    end

    test "rejects invalid cursor, status, and limits", %{conn: conn} do
      assert json_response(get(conn, "/v1/coach/conversation-inbox", %{"cursor" => "not-a-cursor"}), 422)
      assert json_response(get(conn, "/v1/coach/conversation-inbox", %{"status" => "new"}), 422)
      assert json_response(get(conn, "/v1/coach/conversation-inbox", %{"limit" => "0"}), 422)
    end
  end

  describe "GET /v1/coach/conversations/:id/history" do
    test "keeps the latest message timestamp across pages and returns nil for an empty conversation", %{
      conn: conn,
      coach: coach,
      client: client
    } do
      conversation = insert(:conversation, business: coach.business, client: client)
      older_at = ~U[2026-09-12 10:00:00.123456Z]
      latest_at = ~U[2026-09-12 10:01:00.123456Z]

      insert_client_message(conversation, client, inserted_at: older_at)
      insert_client_message(conversation, client, inserted_at: latest_at)

      first = get(conn, "/v1/coach/conversations/#{conversation.id}/history", %{"limit" => "1"})

      assert %{"latest_message_at" => latest, "next_cursor" => cursor} = json_response(first, 200)
      assert latest == DateTime.to_iso8601(latest_at)

      second =
        get(conn, "/v1/coach/conversations/#{conversation.id}/history", %{
          "limit" => "1",
          "cursor" => cursor
        })

      assert %{"latest_message_at" => ^latest} = json_response(second, 200)

      empty_client = insert(:client, business: coach.business, coach: coach)
      empty = insert(:conversation, business: coach.business, client: empty_client)

      assert %{"count" => 0, "data" => [], "latest_message_at" => nil, "next_cursor" => nil} =
               json_response(get(conn, "/v1/coach/conversations/#{empty.id}/history"), 200)
    end

    test "keeps same-microsecond rows paginable after deleting the cursor anchor", %{
      conn: conn,
      coach: coach,
      client: client
    } do
      conversation = insert(:conversation, business: coach.business, client: client)
      timestamp = ~U[2026-09-12 10:00:00.123456Z]

      for _ <- 1..3 do
        insert_client_message(conversation, client, inserted_at: timestamp)
      end

      first = get(conn, "/v1/coach/conversations/#{conversation.id}/history", %{"limit" => "1"})
      assert %{"count" => 3, "data" => [%{"id" => first_id}], "next_cursor" => cursor} = json_response(first, 200)
      Repo.delete!(Repo.get!(Easy.Chat.Message, first_id))

      second = get(conn, "/v1/coach/conversations/#{conversation.id}/history", %{"limit" => "1", "cursor" => cursor})
      assert %{"count" => 2, "data" => [%{"id" => second_id}]} = json_response(second, 200)
      assert second_id != first_id
    end

    test "rejects an invalid UUID, cursor, and limit", %{conn: conn, coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)

      assert json_response(get(conn, "/v1/coach/conversations/not-a-uuid/history"), 422)
      assert json_response(get(conn, "/v1/coach/conversations/#{conversation.id}/history", %{"cursor" => "bad"}), 422)
      assert json_response(get(conn, "/v1/coach/conversations/#{conversation.id}/history", %{"limit" => "0"}), 422)
    end
  end

  test "requires authentication" do
    conn = build_conn() |> get("/v1/coach/conversations")
    assert json_response(conn, 403)
  end

  defp insert_client_message(conversation, client, attrs) do
    insert(
      :chat_message,
      Keyword.merge(
        [
          business: conversation.business,
          conversation: conversation,
          sender_type: :client,
          sender_id: client.id
        ],
        attrs
      )
    )
  end

  defp set_conversation_timestamp(conversation, timestamp, attrs \\ []) do
    updates = Keyword.merge([last_message_at: timestamp], attrs)

    Repo.update_all(
      from(item in ChatConversation, where: item.id == ^conversation.id),
      set: updates
    )
  end
end
