defmodule EasyWeb.Coaches.ThreadControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach)
    conn = build_conn() |> authenticate_coach(coach) |> put_req_header("content-type", "application/json")
    %{conn: conn, coach: coach, client: client}
  end

  describe "POST /v1/coach/clients/:client_id/threads" do
    test "creates a thread for a client", %{conn: conn, client: client} do
      conn = post(conn, "/v1/coach/clients/#{client.id}/threads", %{"module" => "nutrition", "title" => "Hi"})
      assert %{"data" => data} = json_response(conn, 201)
      assert data["client_id"] == client.id
      assert data["created_by_type"] == "coach"
      assert data["status"] == "open"
    end

    test "rejects an unknown module with 422", %{conn: conn, client: client} do
      conn = post(conn, "/v1/coach/clients/#{client.id}/threads", %{"module" => "spaceship"})
      assert json_response(conn, 422)
    end

    test "404s for a client in another business", %{conn: conn} do
      other_coach = insert(:coach)
      other = insert(:client, creator: other_coach, business: other_coach.business, user: insert(:user))
      conn = post(conn, "/v1/coach/clients/#{other.id}/threads", %{"module" => "general"})
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/threads" do
    test "lists and filters by status", %{conn: conn, coach: coach, client: client} do
      open = insert(:thread, business: coach.business, client: client, created_by_id: coach.id, status: :open)
      insert(:thread, business: coach.business, client: client, created_by_id: coach.id, status: :archived)

      conn = get(conn, "/v1/coach/threads", %{"status" => "open"})
      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["id"] == open.id
    end
  end

  describe "POST /v1/coach/threads/:thread_id/messages" do
    test "posts a message and updates the thread preview", %{conn: conn, coach: coach, client: client} do
      thread = insert(:thread, business: coach.business, client: client, created_by_id: coach.id)
      conn = post(conn, "/v1/coach/threads/#{thread.id}/messages", %{"body" => "Hello"})
      assert %{"data" => data} = json_response(conn, 201)
      assert data["body"] == "Hello"
      assert data["author_type"] == "coach"

      show = get(build_conn() |> authenticate_coach(coach), "/v1/coach/threads/#{thread.id}")
      assert %{"data" => detail} = json_response(show, 200)
      assert detail["last_message_preview"] == "Hello"
      assert [%{"body" => "Hello"}] = detail["messages"]
    end
  end

  describe "PATCH /v1/coach/threads/:id" do
    test "resolves a thread", %{conn: conn, coach: coach, client: client} do
      thread = insert(:thread, business: coach.business, client: client, created_by_id: coach.id)
      conn = patch(conn, "/v1/coach/threads/#{thread.id}", %{"status" => "resolved"})
      assert %{"data" => %{"status" => "resolved"}} = json_response(conn, 200)
    end
  end

  test "requires authentication" do
    conn = build_conn() |> get("/v1/coach/threads")
    assert json_response(conn, 403)
  end
end
