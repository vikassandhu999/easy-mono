defmodule EasyWeb.Clients.ConversationControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, user: insert(:user))
    conn = build_conn() |> authenticate_client(client) |> put_req_header("content-type", "application/json")
    %{conn: conn, coach: coach, client: client}
  end

  test "GET /v1/client/conversation creates lazily with the shared conversation shape", %{
    conn: conn,
    client: client
  } do
    conn = get(conn, "/v1/client/conversation")
    assert %{"data" => data} = json_response(conn, 200)
    assert data["unread_count"] == 0

    assert %{
             "client_name" => client_name,
             "last_message_role" => nil
           } = data

    assert client_name == String.trim("#{client.full_name} #{client.preferred_name}")

    assert Map.keys(data) |> Enum.sort() ==
             ~w(client_id client_name id inserted_at last_message_at last_message_preview last_message_role unread_count updated_at)
  end

  test "send + list + read round-trip", %{conn: conn, client: client} do
    post_conn = post(conn, "/v1/client/conversation/messages", %{"body" => "hi coach"})

    assert %{"data" => message = %{"sender_type" => "client", "attachments" => [], "embed" => nil}} =
             json_response(post_conn, 201)

    assert Map.keys(message) |> Enum.sort() ==
             ~w(attachments body conversation_id edited_at embed id inserted_at request_id sender_id sender_name sender_type)

    list_conn = build_conn() |> authenticate_client(client) |> get("/v1/client/conversation/messages")
    assert %{"data" => [%{"body" => "hi coach"}], "has_more" => false} = json_response(list_conn, 200)

    read_conn =
      build_conn()
      |> authenticate_client(client)
      |> put_req_header("content-type", "application/json")
      |> post("/v1/client/conversation/read")

    assert %{"data" => %{"unread_count" => 0}} = json_response(read_conn, 200)
  end

  test "rejects unknown message keys and invalid list query values", %{conn: conn} do
    unknown_body = post(conn, "/v1/client/conversation/messages", %{"body" => "hello", "role" => "coach"})
    invalid_query = get(conn, "/v1/client/conversation/messages", %{"limit" => "many"})

    assert json_response(unknown_body, 422)
    assert json_response(invalid_query, 422)
  end

  test "requires authentication" do
    conn = build_conn() |> get("/v1/client/conversation")
    assert json_response(conn, 403)
  end
end
