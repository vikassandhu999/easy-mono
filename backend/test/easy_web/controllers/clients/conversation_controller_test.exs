defmodule EasyWeb.Clients.ConversationControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
    conn = build_conn() |> authenticate_client(client) |> put_req_header("content-type", "application/json")
    %{conn: conn, coach: coach, client: client}
  end

  test "GET /v1/client/conversation creates lazily", %{conn: conn} do
    conn = get(conn, "/v1/client/conversation")
    assert %{"data" => data} = json_response(conn, 200)
    assert data["unread_count"] == 0
    refute Map.has_key?(data, "client_name")
  end

  test "send + list + read round-trip", %{conn: conn, client: client} do
    post_conn = post(conn, "/v1/client/conversation/messages", %{"body" => "hi coach"})
    assert %{"data" => %{"sender_type" => "client"}} = json_response(post_conn, 201)

    list_conn = build_conn() |> authenticate_client(client) |> get("/v1/client/conversation/messages")
    assert %{"data" => [%{"body" => "hi coach"}], "has_more" => false} = json_response(list_conn, 200)

    read_conn =
      build_conn()
      |> authenticate_client(client)
      |> put_req_header("content-type", "application/json")
      |> post("/v1/client/conversation/read")

    assert %{"data" => %{"unread_count" => 0}} = json_response(read_conn, 200)
  end

  test "requires authentication" do
    conn = build_conn() |> get("/v1/client/conversation")
    assert json_response(conn, 403)
  end
end
