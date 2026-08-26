defmodule EasyWeb.Coaches.FormAssignmentControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "GET /v1/coach/clients/:client_id/form-assignments" do
    test "rejects unknown query parameters", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, business: business, creator: coach)

      conn = get(conn, "/v1/coach/clients/#{client.id}/form-assignments?unexpected=true")

      assert %{"error_detail" => %{"fields" => %{"$" => ["must be empty"]}}} =
               json_response(conn, 422)
    end
  end

  describe "POST /v1/coach/clients/:client_id/form-assignments" do
    test "assigns a form template to a client", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, business: business, creator: coach)
      template = insert(:form_template, business: business, purpose: :intake)

      conn =
        post(conn, "/v1/coach/clients/#{client.id}/form-assignments", %{
          "form_template_id" => template.id
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["client_id"] == client.id
      assert data["form_template_id"] == template.id
      assert data["purpose"] == "intake"
      assert data["status"] == "assigned"
      assert data["form_template"]["id"] == template.id
      assert data["form_template"]["response_count"] == 0
    end

    test "rejects unknown body fields", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, business: business, creator: coach)
      template = insert(:form_template, business: business, purpose: :intake)

      conn =
        post(conn, "/v1/coach/clients/#{client.id}/form-assignments", %{
          "form_template_id" => template.id,
          "unexpected" => true
        })

      assert %{"error_detail" => %{"fields" => %{"unexpected" => ["is unknown"]}}} =
               json_response(conn, 422)
    end

    test "404 for a client in another business", %{conn: conn, business: business} do
      template = insert(:form_template, business: business, purpose: :intake)
      other_client = insert(:client)

      conn =
        post(conn, "/v1/coach/clients/#{other_client.id}/form-assignments", %{
          "form_template_id" => template.id
        })

      assert json_response(conn, 404)
    end

    test "404 for a template in another business", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, business: business, creator: coach)
      other_template = insert(:form_template, purpose: :intake)

      conn =
        post(conn, "/v1/coach/clients/#{client.id}/form-assignments", %{
          "form_template_id" => other_template.id
        })

      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/form-assignments/:id/submissions" do
    test "lists submissions (answers) for an assignment, newest first", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, business: business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: business)
      assignment = insert(:form_assignment, business: business, client: client, form_template: template)

      _older =
        insert(:form_submission,
          business: business,
          client: client,
          form_assignment: assignment,
          answers: %{"meal_prep_ability" => "low"},
          submitted_at: DateTime.add(DateTime.utc_now(:second), -3600)
        )

      newer =
        insert(:form_submission,
          business: business,
          client: client,
          form_assignment: assignment,
          answers: %{"meal_prep_ability" => "high"},
          submitted_at: DateTime.utc_now(:second)
        )

      conn = get(conn, "/v1/coach/form-assignments/#{assignment.id}/submissions")

      assert %{"data" => [first, second]} = json_response(conn, 200)
      assert first["id"] == newer.id
      assert first["answers"] == %{"meal_prep_ability" => "high"}
      assert second["answers"] == %{"meal_prep_ability" => "low"}
      assert is_list(first["question_snapshot"])
    end

    test "returns an empty list when there are no submissions", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, business: business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: business)
      assignment = insert(:form_assignment, business: business, client: client, form_template: template)

      conn = get(conn, "/v1/coach/form-assignments/#{assignment.id}/submissions")

      assert %{"data" => []} = json_response(conn, 200)
    end

    test "returns attachment metadata matching the shared attachment schema", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, business: business, creator: coach, user: insert(:user))

      template =
        insert(:form_template,
          business: business,
          sections: [
            %{"title" => "Photos", "questions" => [%{"id" => "photos", "label" => "Photos", "type" => "photo"}]}
          ]
        )

      assignment = insert(:form_assignment, business: business, client: client, form_template: template)
      attachment = insert(:attachment, business: business, client: client, uploaded_by_id: client.id)

      insert(:form_submission,
        business: business,
        client: client,
        form_assignment: assignment,
        question_snapshot: template.sections,
        answers: %{"photos" => [attachment.id]}
      )

      conn = get(conn, "/v1/coach/form-assignments/#{assignment.id}/submissions")

      assert %{"data" => [%{"attachments" => [data]} = submission]} = json_response(conn, 200)

      assert data == %{
               "id" => attachment.id,
               "content_type" => attachment.content_type,
               "byte_size" => attachment.byte_size,
               "duration_ms" => nil
             }

      assert submission["form_assignment_id"] == assignment.id
    end

    test "rejects unknown query parameters", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, business: business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: business)
      assignment = insert(:form_assignment, business: business, client: client, form_template: template)

      conn = get(conn, "/v1/coach/form-assignments/#{assignment.id}/submissions?unexpected=true")

      assert %{"error_detail" => %{"fields" => %{"$" => ["must be empty"]}}} =
               json_response(conn, 422)
    end

    test "404 for an assignment in another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_client = insert(:client, business: other_coach.business, creator: other_coach, user: insert(:user))
      other_template = insert(:form_template, business: other_coach.business)

      other =
        insert(:form_assignment,
          business: other_coach.business,
          client: other_client,
          form_template: other_template
        )

      conn = get(conn, "/v1/coach/form-assignments/#{other.id}/submissions")

      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/form-assignments/:id/remind" do
    test "sends an Intake reminder without changing the assignment or queue membership", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, business: business, creator: coach, joined_at: DateTime.utc_now(:second))
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

      before_queue = get(conn, "/v1/coach/workbench/queues/onboarding")
      assert %{"count" => 1} = json_response(before_queue, 200)

      remind_conn = post(conn, "/v1/coach/form-assignments/#{assignment.id}/remind")
      assert response(remind_conn, 204) == ""

      reloaded = Easy.Repo.reload(assignment)
      assert reloaded.status == assignment.status
      assert reloaded.completed_at == assignment.completed_at
      assert reloaded.due_date == assignment.due_date

      after_queue = get(conn, "/v1/coach/workbench/queues/onboarding")
      assert %{"count" => 1} = json_response(after_queue, 200)
    end

    test "404s for another business's assignment", %{conn: conn} do
      assignment = insert(:form_assignment, purpose: :intake)

      remind_conn = post(conn, "/v1/coach/form-assignments/#{assignment.id}/remind")

      assert json_response(remind_conn, 404)
    end

    test "422s for a non-Intake assignment", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, business: business, creator: coach)
      template = insert(:form_template, business: business, purpose: :check_in)

      assignment =
        insert(:form_assignment,
          business: business,
          client: client,
          form_template: template,
          purpose: :check_in
        )

      remind_conn = post(conn, "/v1/coach/form-assignments/#{assignment.id}/remind")

      assert %{"error_detail" => %{"fields" => %{"purpose" => ["must be intake"]}}} =
               json_response(remind_conn, 422)
    end

    test "422s when the client has no reminder email", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, business: business, creator: coach, email: nil)
      template = insert(:form_template, business: business, purpose: :intake)

      assignment =
        insert(:form_assignment,
          business: business,
          client: client,
          form_template: template,
          purpose: :intake
        )

      remind_conn = post(conn, "/v1/coach/form-assignments/#{assignment.id}/remind")

      assert %{"error_detail" => %{"fields" => %{"email" => ["client has no email address"]}}} =
               json_response(remind_conn, 422)
    end

    test "rejects request bodies", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, business: business, creator: coach)
      template = insert(:form_template, business: business, purpose: :intake)

      assignment =
        insert(:form_assignment,
          business: business,
          client: client,
          form_template: template,
          purpose: :intake
        )

      conn = post(conn, "/v1/coach/form-assignments/#{assignment.id}/remind", %{"unexpected" => true})

      assert %{"error_detail" => %{"fields" => %{"$" => ["must be empty"]}}} =
               json_response(conn, 422)
    end
  end
end
