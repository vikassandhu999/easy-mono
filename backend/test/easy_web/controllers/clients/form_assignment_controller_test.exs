defmodule EasyWeb.Clients.FormAssignmentControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormSubmission
  alias Easy.Repo

  describe "GET /v1/client/form-assignments" do
    test "lists only authenticated client's assignments" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      other_client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)
      insert(:form_assignment, business: coach.business, client: other_client, form_template: template)

      conn =
        build_conn()
        |> authenticate_client(client)
        |> get("/v1/client/form-assignments")

      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["id"] == assignment.id
      assert data["client_id"] == client.id
      assert data["form_template"]["id"] == template.id
    end
  end

  describe "GET /v1/client/form-assignments/:id" do
    test "returns one assignment for the authenticated client" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        build_conn()
        |> authenticate_client(client)
        |> get("/v1/client/form-assignments/#{assignment.id}")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == assignment.id
      assert data["client_id"] == client.id
    end

    test "does not return another client's assignment" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      other_client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)

      assignment =
        insert(:form_assignment,
          business: coach.business,
          client: other_client,
          form_template: template
        )

      conn =
        build_conn()
        |> authenticate_client(client)
        |> get("/v1/client/form-assignments/#{assignment.id}")

      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/client/form-assignments/:id/submit" do
    test "submits assignment and completes it" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{
          "answers" => %{"meal_prep_ability" => "high"}
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["answers"]["meal_prep_ability"] == "high"
      assert data["form_assignment_id"] == assignment.id
      assert Repo.get!(FormAssignment, assignment.id).status == :completed
    end

    test "returns attachment metadata matching the shared attachment schema" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))

      template =
        insert(:form_template,
          business: coach.business,
          sections: [
            %{"title" => "Photos", "questions" => [%{"id" => "photos", "label" => "Photos", "type" => "photo"}]}
          ]
        )

      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)
      attachment = insert(:attachment, business: coach.business, client: client, uploaded_by_id: client.id)

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{
          "answers" => %{"photos" => [attachment.id]}
        })

      assert %{"data" => %{"attachments" => [data]} = submission} = json_response(conn, 201)

      assert data == %{
               "id" => attachment.id,
               "content_type" => attachment.content_type,
               "byte_size" => attachment.byte_size,
               "duration_ms" => nil
             }

      assert_schema(data, "ChatAttachment", EasyWeb.ApiSpec.spec())
      assert_schema(submission, "ClientProfileFormSubmission", EasyWeb.ApiSpec.spec())
    end

    test "does not submit another client's assignment" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      other_client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)

      assignment =
        insert(:form_assignment,
          business: coach.business,
          client: other_client,
          form_template: template
        )

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{"answers" => %{}})

      assert json_response(conn, 404)
      assert Repo.get!(FormAssignment, assignment.id).status == :assigned
    end

    test "requires answers" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{})

      assert json_response(conn, 422)

      assert Repo.get!(FormAssignment, assignment.id).status == :assigned
      refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
    end

    test "rejects non-map answers" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{"answers" => "high"})

      assert json_response(conn, 422)

      assert Repo.get!(FormAssignment, assignment.id).status == :assigned
      refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
    end

    test "rejects submission missing a required answer" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{"answers" => %{}})

      assert %{"error_detail" => %{"fields" => %{"answers" => [_message]}}} = json_response(conn, 422)
      refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
    end

    test "rejects submission with unknown answer keys" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{
          "answers" => %{"meal_prep_ability" => "high", "not-a-question" => "boom"}
        })

      assert %{"error_detail" => %{"fields" => %{"answers" => [_message]}}} = json_response(conn, 422)
      refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
    end

    test "does not resubmit completed assignments" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)

      assignment =
        insert(:form_assignment,
          business: coach.business,
          client: client,
          form_template: template,
          status: "completed"
        )

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{
          "answers" => %{"meal_prep_ability" => "high"}
        })

      assert %{"error_detail" => %{"fields" => %{"status" => ["cannot be submitted"]}}} =
               json_response(conn, 422)

      assert Repo.get!(FormAssignment, assignment.id).status == :completed
      refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
    end

    test "does not submit missed assignments" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business, purpose: :check_in)

      assignment =
        insert(:form_assignment,
          business: coach.business,
          client: client,
          form_template: template,
          purpose: :check_in,
          status: :missed
        )

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{
          "answers" => %{"meal_prep_ability" => "high"}
        })

      assert %{"error_detail" => %{"fields" => %{"status" => ["cannot be submitted"]}}} =
               json_response(conn, 422)

      refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
    end
  end
end
