defmodule EasyWeb.Clients.ConversationControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

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

    assert %{"data" => message = %{"sender_type" => "client", "attachments" => [], "embed" => nil}} =
             json_response(post_conn, 201)

    assert_schema(message, "ChatMessage", EasyWeb.ApiSpec.spec())

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
                 "attachment_ids" => [attachment.id],
                 "embed" => %{"type" => "form_submission", "id" => submission.id}
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
    assert_schema(hd(response["data"]), "ChatMessage", EasyWeb.ApiSpec.spec())
  end

  test "requires authentication" do
    conn = build_conn() |> get("/v1/client/conversation")
    assert json_response(conn, 403)
  end
end
