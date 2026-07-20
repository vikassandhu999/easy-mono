defmodule EasyWeb.Coaches.FormAssignmentControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
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

      assert_schema(data, "Attachment", EasyWeb.ApiSpec.spec())
      assert_schema(submission, "ClientProfileFormSubmission", EasyWeb.ApiSpec.spec())
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
end
