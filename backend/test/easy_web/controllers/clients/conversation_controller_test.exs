defmodule EasyWeb.Clients.ConversationControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
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
             "last_message_role" => nil,
             "waiting_since" => nil
           } = data

    assert client_name == String.trim("#{client.first_name} #{client.last_name}")

    assert Map.keys(data) |> Enum.sort() ==
             ~w(client_id client_name id inserted_at last_message_at last_message_preview last_message_role unread_count updated_at waiting_since)
  end

  test "send + list + read round-trip", %{conn: conn, client: client} do
    post_conn = post(conn, "/v1/client/conversation/messages", %{"body" => "hi coach"})

    assert %{"data" => message = %{"sender_type" => "client", "attachments" => [], "embed" => nil}} =
             json_response(post_conn, 201)

    assert Map.keys(message) |> Enum.sort() ==
             ~w(attachments body conversation_id embed id inserted_at sender_id sender_type)

    list_conn = build_conn() |> authenticate_client(client) |> get("/v1/client/conversation/messages")
    assert %{"data" => [%{"body" => "hi coach"}], "has_more" => false} = json_response(list_conn, 200)

    read_conn =
      build_conn()
      |> authenticate_client(client)
      |> put_req_header("content-type", "application/json")
      |> post("/v1/client/conversation/read")

    assert %{"data" => %{"unread_count" => 0}} = json_response(read_conn, 200)
  end

  test "rejects coach-only embeds at the request boundary", %{conn: conn} do
    conn =
      post(conn, "/v1/client/conversation/messages", %{
        "embed" => %{"type" => "form_submission", "id" => Ecto.UUID.generate()}
      })

    assert json_response(conn, 422)
  end

  test "rejects unknown message keys and invalid list query values", %{conn: conn} do
    unknown_body = post(conn, "/v1/client/conversation/messages", %{"body" => "hello", "role" => "coach"})
    invalid_query = get(conn, "/v1/client/conversation/messages", %{"limit" => "many"})

    assert json_response(unknown_body, 422)
    assert json_response(invalid_query, 422)
  end

  test "lists coach attachment metadata and form submission embeds", %{
    conn: conn,
    coach: coach,
    client: client
  } do
    {:ok, conversation} =
      Easy.Chat.get_or_create_conversation_for_client(
        Easy.Ctx.new(coach.business_id, coach.user_id, coach.id, true),
        client.id
      )

    attachment = insert(:attachment, business: client.business, client: client)
    template = insert(:form_template, business: client.business)
    assignment = insert(:form_assignment, business: client.business, client: client, form_template: template)
    submission = insert(:form_submission, business: client.business, client: client, form_assignment: assignment)

    assert {:ok, _message} =
             Easy.Chat.send_message(
               Easy.Ctx.new(coach.business_id, coach.user_id, coach.id, true),
               conversation.id,
               %{
                 attachment_ids: [attachment.id],
                 embed: %{type: "form_submission", id: submission.id}
               }
             )

    response = conn |> get("/v1/client/conversation/messages") |> json_response(200)

    assert %{
             "data" => [
               %{
                 "attachments" => [
                   %{
                     "id" => attachment_id,
                     "content_type" => "image/jpeg",
                     "byte_size" => 1024,
                     "duration_ms" => nil
                   }
                 ],
                 "embed" => %{
                   "type" => "form_submission",
                   "id" => submission_id,
                   "snapshot" => %{
                     "form_assignment_id" => assignment_id,
                     "title" => title,
                     "submitted_at" => submitted_at
                   }
                 }
               }
             ]
           } = response

    assert attachment_id == attachment.id
    assert submission_id == submission.id
    assert assignment_id == assignment.id
    assert title == template.name
    assert submitted_at == DateTime.to_iso8601(submission.submitted_at)
  end

  test "requires authentication" do
    conn = build_conn() |> get("/v1/client/conversation")
    assert json_response(conn, 403)
  end
end
