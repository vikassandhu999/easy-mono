defmodule EasyWeb.Coaches.WorkbenchControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach) |> put_req_header("content-type", "application/json")

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "GET /v1/coach/workbench" do
    test "returns zero counts on an empty roster", %{conn: conn} do
      conn = get(conn, "/v1/coach/workbench")

      assert %{"data" => data} = json_response(conn, 200)

      assert data == %{
               "check_ins" => 0,
               "replies" => 0,
               "programming" => 0,
               "expiring" => 0,
               "new_clients" => 0,
               "quiet" => 0
             }

      api_spec = EasyWeb.ApiSpec.spec()
      assert_schema(json_response(conn, 200), "WorkbenchCountsResponse", api_spec)
    end

    test "counts queue members", %{conn: conn, business: business, coach: coach} do
      # In programming (no plan) and new (recent) at once — one client, two queues.
      client = insert(:client, business: business, creator: coach)

      insert(:form_submission,
        business: business,
        client: client,
        form_assignment:
          build(:form_assignment,
            business: business,
            client: client,
            form_template: build(:form_template, business: business)
          )
      )

      # Waiting on the coach: the client spoke last.
      insert(:conversation, business: business, client: client, last_message_role: :client)

      # Answered: the coach spoke last — not in Replies.
      answered = insert(:client, business: business, creator: coach)
      insert(:conversation, business: business, client: answered, last_message_role: :coach)

      conn = get(conn, "/v1/coach/workbench")

      assert %{"data" => data} = json_response(conn, 200)

      assert data == %{
               "check_ins" => 1,
               "replies" => 1,
               "programming" => 2,
               "expiring" => 0,
               "new_clients" => 2,
               "quiet" => 0
             }
    end

    test "a coach reply drains the Replies queue", %{business: business, coach: coach} do
      client = insert(:client, business: business, creator: coach)
      conversation = insert(:conversation, business: business, client: client)

      client_ctx = %Easy.Ctx{
        business_id: business.id,
        user_id: client.user_id,
        client_id: client.id,
        coach_id: nil,
        owner?: false
      }

      coach_ctx = %Easy.Ctx{
        business_id: business.id,
        user_id: coach.user_id,
        coach_id: coach.id,
        client_id: nil,
        owner?: true
      }

      {:ok, _} = Easy.Chat.send_client_message(client_ctx, %{body: "Coach, question!"})
      assert {:ok, 1} = Easy.Chat.count_waiting_conversations(coach_ctx)

      {:ok, _} = Easy.Chat.send_message(coach_ctx, conversation.id, %{body: "On it."})
      assert {:ok, 0} = Easy.Chat.count_waiting_conversations(coach_ctx)
    end

    test "requires auth" do
      conn = build_conn() |> get("/v1/coach/workbench")
      assert json_response(conn, 403)
    end
  end
end
