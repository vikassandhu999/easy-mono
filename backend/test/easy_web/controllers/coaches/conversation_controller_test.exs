defmodule EasyWeb.Coaches.ConversationControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach)
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
      other = insert(:client, business: other_coach.business, creator: other_coach)
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

      list_conn =
        build_conn() |> authenticate_coach(coach) |> get("/v1/coach/conversations/#{conversation_id}/messages")

      assert %{"data" => [%{"body" => "Hello"}], "has_more" => false} = json_response(list_conn, 200)
    end

    test "422s on a blank body", %{conn: conn, client: client} do
      %{"data" => %{"id" => conversation_id}} =
        conn |> get("/v1/coach/clients/#{client.id}/conversation") |> json_response(200)

      conn = post(conn, "/v1/coach/conversations/#{conversation_id}/messages", %{"body" => ""})
      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/conversations" do
    test "inbox lists with unread counts, newest first", %{conn: conn, coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)

      insert(:chat_message,
        conversation: conversation,
        sender_type: :client,
        sender_id: client.id,
        body: "unread one"
      )

      conn = get(conn, "/v1/coach/conversations")
      assert %{"data" => [data], "count" => 1} = json_response(conn, 200)
      assert data["unread_count"] == 1
    end

    test "trainer does not see unassigned clients' conversations", %{coach: coach, client: client} do
      insert(:conversation, business: coach.business, client: client)
      trainer = insert(:coach, business: coach.business)

      conn = build_conn() |> authenticate_coach(trainer) |> get("/v1/coach/conversations")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
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

  describe "POST /v1/coach/conversations/:id/read" do
    test "zeroes unread", %{conn: conn, coach: coach, client: client} do
      conversation = insert(:conversation, business: coach.business, client: client)
      insert(:chat_message, conversation: conversation, sender_type: :client, sender_id: client.id)

      read_conn = post(conn, "/v1/coach/conversations/#{conversation.id}/read")
      assert %{"data" => %{"unread_count" => 0}} = json_response(read_conn, 200)
    end
  end

  test "requires authentication" do
    conn = build_conn() |> get("/v1/coach/conversations")
    assert json_response(conn, 403)
  end
end
