defmodule EasyWeb.Clients.ThreadControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
    conn = build_conn() |> authenticate_client(client) |> put_req_header("content-type", "application/json")
    %{conn: conn, coach: coach, client: client}
  end

  describe "POST /v1/client/threads" do
    test "starts a thread owned by the authenticated client", %{conn: conn, client: client} do
      conn = post(conn, "/v1/client/threads", %{"module" => "general", "title" => "Question"})
      assert %{"data" => data} = json_response(conn, 201)
      assert data["client_id"] == client.id
      assert data["created_by_type"] == "client"
    end
  end

  describe "GET /v1/client/threads" do
    test "returns only the client's own threads", %{conn: conn, coach: coach, client: client} do
      mine = insert(:thread, business: coach.business, client: client, created_by_id: coach.id)
      other_client = insert(:client, business: coach.business, creator: coach)
      insert(:thread, business: coach.business, client: other_client, created_by_id: coach.id)

      conn = get(conn, "/v1/client/threads")
      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["id"] == mine.id
    end
  end

  describe "GET /v1/client/threads/:id" do
    test "404s for another client's thread", %{conn: conn, coach: coach} do
      other_client = insert(:client, business: coach.business, creator: coach)
      thread = insert(:thread, business: coach.business, client: other_client, created_by_id: coach.id)
      conn = get(conn, "/v1/client/threads/#{thread.id}")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/client/threads/:thread_id/messages" do
    test "posts a message to the client's own thread", %{conn: conn, coach: coach, client: client} do
      thread = insert(:thread, business: coach.business, client: client, created_by_id: coach.id)
      conn = post(conn, "/v1/client/threads/#{thread.id}/messages", %{"body" => "Thanks!"})
      assert %{"data" => %{"author_type" => "client", "body" => "Thanks!"}} = json_response(conn, 201)
    end

    test "404s posting to another client's thread", %{conn: conn, coach: coach} do
      other_client = insert(:client, business: coach.business, creator: coach)
      thread = insert(:thread, business: coach.business, client: other_client, created_by_id: coach.id)
      conn = post(conn, "/v1/client/threads/#{thread.id}/messages", %{"body" => "hi"})
      assert json_response(conn, 404)
    end
  end
end
