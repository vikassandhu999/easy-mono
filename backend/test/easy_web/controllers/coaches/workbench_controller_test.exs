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
               "onboarding" => 0,
               "programming" => %{"all" => 0, "training" => 0, "nutrition" => 0},
               "expiring" => 0,
               "quiet" => 0
             }

      api_spec = EasyWeb.ApiSpec.spec()
      assert_schema(json_response(conn, 200), "WorkbenchCountsResponse", api_spec)
    end

    test "counts queue members", %{conn: conn, business: business, coach: coach} do
      # One unclassified active client contributes work only to the submission/reply queues.
      client = insert(:client, business: business, creator: coach, required_services: [])

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

      # Waiting on the coach: an explicit waiting sequence is open.
      insert(:conversation,
        business: business,
        client: client,
        last_message_role: :client,
        waiting_since: DateTime.utc_now(:microsecond)
      )

      # No waiting sequence: not in Replies, regardless of historical role.
      answered = insert(:client, business: business, creator: coach)
      insert(:conversation, business: business, client: answered, last_message_role: :client)

      conn = get(conn, "/v1/coach/workbench")

      assert %{"data" => data} = json_response(conn, 200)

      assert data == %{
               "check_ins" => 1,
               "replies" => 1,
               "onboarding" => 0,
               "programming" => %{"all" => 0, "training" => 0, "nutrition" => 0},
               "expiring" => 0,
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

  describe "GET /v1/coach/workbench/queues/onboarding" do
    test "returns reason-bearing items with the total before pagination", %{
      conn: conn,
      business: business,
      coach: coach
    } do
      sent_at = DateTime.add(DateTime.utc_now(:second), -4, :day)

      clients =
        for _ <- 1..2 do
          insert(:client,
            business: business,
            creator: coach,
            status: :pending,
            user: nil,
            invitation_sent_at: sent_at
          )
        end

      conn = get(conn, "/v1/coach/workbench/queues/onboarding", %{limit: 1})

      assert %{"count" => 2, "data" => [item]} = json_response(conn, 200)
      assert item["client"]["id"] == clients |> Enum.map(& &1.id) |> Enum.sort() |> hd()

      assert item["reasons"] == [
               %{
                 "code" => "invitation_follow_up_due",
                 "invitation_id" => item["client"]["id"],
                 "sent_at" => DateTime.to_iso8601(sent_at),
                 "follow_up_due_at" => DateTime.to_iso8601(DateTime.add(sent_at, 3, :day))
               }
             ]

      assert_schema(
        json_response(conn, 200),
        "WorkbenchOnboardingQueueResponse",
        EasyWeb.ApiSpec.spec()
      )
    end

    test "renders the Intake overdue reason variant", %{
      conn: conn,
      business: business,
      coach: coach
    } do
      client =
        insert(:client,
          business: business,
          creator: coach,
          joined_at: DateTime.utc_now(:microsecond)
        )

      template = insert(:form_template, business: business, purpose: :intake)

      assignment =
        insert(:form_assignment,
          business: business,
          client: client,
          form_template: template,
          purpose: :intake,
          status: :in_progress,
          due_date: Date.add(Date.utc_today(), -1)
        )

      conn = get(conn, "/v1/coach/workbench/queues/onboarding")

      assert %{"count" => 1, "data" => [item]} = json_response(conn, 200)

      assert item["reasons"] == [
               %{
                 "code" => "intake_overdue",
                 "assignment_id" => assignment.id,
                 "due_on" => Date.to_iso8601(assignment.due_date),
                 "form_title" => template.name
               }
             ]

      assert_schema(
        json_response(conn, 200),
        "WorkbenchOnboardingQueueResponse",
        EasyWeb.ApiSpec.spec()
      )
    end
  end

  describe "GET /v1/coach/workbench/queues/:queue" do
    test "rejects an unknown Programming service", %{conn: conn} do
      conn = get(conn, "/v1/coach/workbench/queues/programming", %{service: "physio"})

      assert %{"error_detail" => %{"fields" => %{"service" => ["is invalid"]}}} =
               json_response(conn, 422)
    end

    test "renders both service coverage reason variants", %{
      conn: conn,
      business: business,
      coach: coach
    } do
      today = Date.utc_today()

      missing =
        insert(:client,
          business: business,
          creator: coach,
          required_services: [:training]
        )

      ending =
        insert(:client,
          business: business,
          creator: coach,
          required_services: [:training]
        )

      insert(:training_plan,
        business: business,
        creator: coach,
        client: missing,
        status: :active,
        start_date: Date.add(today, -7),
        end_date: Date.add(today, -1)
      )

      insert(:training_plan,
        business: business,
        creator: coach,
        client: ending,
        status: :active,
        start_date: Date.add(today, -7),
        end_date: Date.add(today, 2)
      )

      conn = get(conn, "/v1/coach/workbench/queues/programming", %{service: "training"})

      assert %{"count" => 2, "data" => items} = json_response(conn, 200)

      reasons_by_client =
        Map.new(items, fn item ->
          {item["client"]["id"], item["reasons"]}
        end)

      assert [%{"code" => "service_coverage_missing"}] = reasons_by_client[missing.id]
      assert [%{"code" => "service_coverage_ending_soon"}] = reasons_by_client[ending.id]

      assert_schema(
        json_response(conn, 200),
        "WorkbenchProgrammingQueueResponse",
        EasyWeb.ApiSpec.spec()
      )
    end

    test "renders every explicit queue envelope and reason schema", %{
      conn: conn,
      business: business,
      coach: coach
    } do
      today = Date.utc_today()

      client =
        insert(:client,
          business: business,
          creator: coach,
          required_services: [:training],
          subscription_ends_on: Date.add(today, 5)
        )

      template = insert(:form_template, business: business, purpose: :check_in)

      assignment =
        insert(:form_assignment,
          business: business,
          client: client,
          form_template: template,
          purpose: :check_in,
          status: :missed,
          due_date: Date.add(today, -2)
        )

      submission =
        insert(:form_submission,
          business: business,
          client: client,
          form_assignment: assignment
        )

      waiting_since = DateTime.add(DateTime.utc_now(:microsecond), -1, :day)
      conversation = insert(:conversation, business: business, client: client, waiting_since: waiting_since)

      assert_queue(
        conn,
        "/v1/coach/workbench/queues/programming?service=training",
        "WorkbenchProgrammingQueueResponse",
        "service_never_programmed",
        client.id
      )

      assert_queue(
        conn,
        "/v1/coach/workbench/queues/expiring",
        "WorkbenchExpiringQueueResponse",
        "engagement_ending_soon",
        client.id
      )

      assert_queue(
        conn,
        "/v1/coach/workbench/queues/quiet",
        "WorkbenchQuietQueueResponse",
        "missed_check_in",
        client.id
      )

      check_ins = get(conn, "/v1/coach/workbench/queues/check-ins")
      assert %{"count" => 1, "data" => [check_in_item]} = json_response(check_ins, 200)
      assert check_in_item["submission"]["id"] == submission.id
      assert hd(check_in_item["reasons"])["code"] == "check_in_awaiting_review"
      assert_schema(json_response(check_ins, 200), "WorkbenchCheckInQueueResponse", EasyWeb.ApiSpec.spec())

      replies = get(conn, "/v1/coach/workbench/queues/replies")
      assert %{"count" => 1, "data" => [reply_item]} = json_response(replies, 200)
      assert reply_item["conversation"]["id"] == conversation.id
      assert reply_item["client_status"] == "active"
      assert reply_item["waiting_message_count"] == 0
      assert hd(reply_item["reasons"])["code"] == "reply_needed"
      assert_schema(json_response(replies, 200), "WorkbenchRepliesQueueResponse", EasyWeb.ApiSpec.spec())
    end
  end

  defp assert_queue(conn, path, schema, reason_code, client_id) do
    response = get(conn, path)
    assert %{"count" => 1, "data" => [item]} = json_response(response, 200)
    assert item["client"]["id"] == client_id
    assert hd(item["reasons"])["code"] == reason_code
    assert_schema(json_response(response, 200), schema, EasyWeb.ApiSpec.spec())
  end
end
