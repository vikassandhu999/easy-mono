defmodule EasyWeb.Clients.FormAssignmentControllerTest do
  use Easy.ConnCase

  alias Easy.ClientProfiles.FormAssignment
  alias Easy.ClientProfiles.FormSubmission
  alias Easy.ClientProfiles.ProfileFieldValue
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
    test "submits assignment and updates custom profile value" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      field = insert(:profile_field_definition, business: coach.business, key: "meal_prep_ability")
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)
      conn = build_conn() |> authenticate_client(client)

      conn =
        post(conn, "/v1/client/form-assignments/#{assignment.id}/submit", %{
          "answers" => %{"meal_prep_ability" => "high"}
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["answers"]["meal_prep_ability"] == "high"
      assert data["form_assignment_id"] == assignment.id
      assert Repo.get!(FormAssignment, assignment.id).status == "completed"

      value =
        Easy.ClientProfiles.ProfileFieldValue
        |> Easy.ClientProfiles.ProfileFieldValue.for_business(coach.business_id)
        |> Easy.ClientProfiles.ProfileFieldValue.for_client(client.id)
        |> Easy.Repo.one!()

      assert value.profile_field_definition_id == field.id
      assert value.value == %{"value" => "high"}
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
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{"answers" => %{}})

      assert json_response(conn, 404)
      assert Repo.get!(FormAssignment, assignment.id).status == "assigned"
      refute Repo.get_by(ProfileFieldValue, client_id: client.id)
    end

    test "requires answers" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        build_conn()
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{})

      assert %{"error_detail" => %{"fields" => %{"answers" => ["can't be blank"]}}} =
               json_response(conn, 422)

      assert Repo.get!(FormAssignment, assignment.id).status == "assigned"
      refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
    end

    test "rejects non-map answers" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        build_conn()
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{"answers" => "high"})

      assert %{"error_detail" => %{"fields" => %{"answers" => ["is invalid"]}}} =
               json_response(conn, 422)

      assert Repo.get!(FormAssignment, assignment.id).status == "assigned"
      refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
    end

    test "does not resubmit completed assignments" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))
      field = insert(:profile_field_definition, business: coach.business, key: "meal_prep_ability")
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
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{
          "answers" => %{"meal_prep_ability" => "high"}
        })

      assert %{"error_detail" => %{"fields" => %{"status" => ["cannot be submitted"]}}} =
               json_response(conn, 422)

      assert Repo.get!(FormAssignment, assignment.id).status == "completed"
      refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
      refute Repo.get_by(ProfileFieldValue, client_id: client.id, profile_field_definition_id: field.id)
    end

    test "returns 422 for invalid profile mappings" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, user: insert(:user))

      template =
        insert(:form_template,
          business: coach.business,
          sections: [
            %{
              "title" => "Nutrition",
              "questions" => [
                %{
                  "id" => "protein_goal",
                  "label" => "Protein goal",
                  "type" => "text",
                  "profile_mapping" => %{"kind" => "core", "section" => "nutrition"}
                }
              ]
            }
          ]
        )

      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        build_conn()
        |> authenticate_client(client)
        |> post("/v1/client/form-assignments/#{assignment.id}/submit", %{
          "answers" => %{"protein_goal" => "120g"}
        })

      assert %{"error_detail" => %{"fields" => %{"profile_mapping" => ["is invalid"]}}} =
               json_response(conn, 422)

      assert Repo.get!(FormAssignment, assignment.id).status == "assigned"
      refute Repo.get_by(FormSubmission, form_assignment_id: assignment.id)
      refute Repo.get_by(ProfileFieldValue, client_id: client.id)
    end
  end
end
