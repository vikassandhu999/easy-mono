defmodule EasyWeb.Coaches.IntakeFollowUpTest do
  use Easy.ConnCase

  alias Easy.Forms.{FormAssignment, FormSubmission}
  alias Easy.Repo

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{coach: coach, business: coach.business, conn: conn}
  end

  describe "PATCH /v1/coach/form-assignments/:id" do
    test "updates priority and due date independently, including clearing the due date", %{conn: conn, coach: coach, business: business} do
      assignment = intake_assignment(coach, business, due_date: Date.add(Date.utc_today(), 3))

      priority_conn =
        conn
        |> patch("/v1/coach/form-assignments/#{assignment.id}", %{"priority" => "high"})

      priority_response = json_response(priority_conn, 200)

      assert get_in(priority_response, ["data", "priority"]) == "high"
      assert get_in(priority_response, ["data", "due_date"]) == Date.to_iso8601(assignment.due_date)
      assert Repo.get!(FormAssignment, assignment.id).status == :assigned

      due_date = Date.add(Date.utc_today(), 7)

      due_date_conn =
        conn
        |> recycle()
        |> patch("/v1/coach/form-assignments/#{assignment.id}", %{"due_date" => Date.to_iso8601(due_date)})

      due_date_response = json_response(due_date_conn, 200)

      assert get_in(due_date_response, ["data", "priority"]) == "high"
      assert get_in(due_date_response, ["data", "due_date"]) == Date.to_iso8601(due_date)

      cleared_conn =
        conn
        |> recycle()
        |> patch("/v1/coach/form-assignments/#{assignment.id}", %{"due_date" => nil})

      cleared_response = json_response(cleared_conn, 200)

      assert get_in(cleared_response, ["data", "due_date"]) == nil
      assert Repo.get!(FormAssignment, assignment.id).due_date == nil
    end

    test "dismisses and reopens an intake with the observed status", %{conn: conn, coach: coach, business: business} do
      assignment = intake_assignment(coach, business)

      dismissed_conn =
        conn
        |> patch("/v1/coach/form-assignments/#{assignment.id}", %{
          "expected_status" => "assigned",
          "status" => "dismissed"
        })

      dismissed = json_response(dismissed_conn, 200)

      assert get_in(dismissed, ["data", "status"]) == "dismissed"
      assert get_in(dismissed, ["data", "completed_at"]) == nil

      reopened_conn =
        conn
        |> recycle()
        |> patch("/v1/coach/form-assignments/#{assignment.id}", %{
          "expected_status" => "dismissed",
          "status" => "assigned"
        })

      reopened = json_response(reopened_conn, 200)

      assert get_in(reopened, ["data", "status"]) == "assigned"
      assert get_in(reopened, ["data", "completed_at"]) == nil
    end

    test "rejects a stale coach edit after the client submits and preserves the submitted answers", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, business: business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: business, purpose: :intake)

      assignment =
        insert(:form_assignment,
          business: business,
          client: client,
          form_template: template,
          purpose: :intake
        )

      client_conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)

      submitted_conn =
        client_conn
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{
          "answers" => %{"meal_prep_ability" => "high"}
        })

      submitted = json_response(submitted_conn, 201)

      assert get_in(submitted, ["data", "answers"]) == %{"meal_prep_ability" => "high"}

      stale =
        conn
        |> patch("/v1/coach/form-assignments/#{assignment.id}", %{
          "expected_status" => "assigned",
          "status" => "dismissed"
        })

      assert %{"error_code" => "assignment_changed"} = json_response(stale, 409)
      assert Repo.get!(FormAssignment, assignment.id).status == :completed
      assert Repo.get_by!(FormSubmission, form_assignment_id: assignment.id).answers == %{"meal_prep_ability" => "high"}
    end

    test "denies a coach who cannot see the client and an assignment from another tenant", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, business: business, creator: coach)
      template = insert(:form_template, business: business, purpose: :intake)

      assignment =
        insert(:form_assignment, business: business, client: client, form_template: template, purpose: :intake)

      other_coach = insert(:coach, business: business)

      hidden =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_coach(other_coach)
        |> patch("/v1/coach/form-assignments/#{assignment.id}", %{"priority" => "high"})

      assert json_response(hidden, 404)

      other_coach = insert(:coach)
      other_assignment = intake_assignment(other_coach, other_coach.business)

      foreign = patch(conn, "/v1/coach/form-assignments/#{other_assignment.id}", %{"priority" => "high"})
      assert json_response(foreign, 404)
    end
  end

  describe "POST /v1/coach/form-assignments/:id/remind" do
    test "sends an outstanding intake reminder", %{conn: conn, coach: coach, business: business} do
      assignment = intake_assignment(coach, business, status: :in_progress)

      reminded = post(conn, "/v1/coach/form-assignments/#{assignment.id}/remind")

      assert response(reminded, 204) == ""
      assert_receive {:email, _email}, 1_000
    end

    test "rejects completed and dismissed intakes", %{conn: conn, coach: coach, business: business} do
      for status <- [:completed, :dismissed] do
        assignment = intake_assignment(coach, business, status: status)
        rejected = conn |> recycle() |> post("/v1/coach/form-assignments/#{assignment.id}/remind")

        assert %{"error_detail" => %{"fields" => %{"purpose" => [_message]}}} = json_response(rejected, 422)
      end

      refute_receive {:email, _email}, 50
    end

    test "rejects an inactive client and a client with no email", %{conn: conn, coach: coach, business: business} do
      inactive = intake_assignment(coach, business, client_attrs: [status: :inactive])
      no_email = intake_assignment(coach, business, client_attrs: [email: nil])

      inactive_response = post(conn, "/v1/coach/form-assignments/#{inactive.id}/remind")
      no_email_response = conn |> recycle() |> post("/v1/coach/form-assignments/#{no_email.id}/remind")

      assert %{"error_detail" => %{"fields" => %{"purpose" => [_message]}}} = json_response(inactive_response, 422)

      assert %{"error_detail" => %{"fields" => %{"email" => ["client has no email address"]}}} =
               json_response(no_email_response, 422)

      refute_receive {:email, _email}, 50
    end
  end

  defp intake_assignment(coach, business, opts \\ []) do
    client =
      insert(
        :client,
        Keyword.merge([business: business, creator: coach], Keyword.get(opts, :client_attrs, []))
      )

    template = insert(:form_template, business: business, purpose: :intake)

    insert(:form_assignment,
      business: business,
      client: client,
      form_template: template,
      purpose: :intake,
      status: Keyword.get(opts, :status, :assigned),
      due_date: Keyword.get(opts, :due_date)
    )
  end
end
