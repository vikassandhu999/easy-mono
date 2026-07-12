defmodule EasyWeb.Coaches.FormTemplateControllerTest do
  use Easy.ConnCase

  alias Easy.Forms.FormAssignment
  alias Easy.Forms.FormTemplate
  alias Easy.Repo

  setup do
    coach = insert(:coach)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/form-templates" do
    test "creates a template", %{conn: conn} do
      conn =
        post(conn, "/v1/coach/form-templates", %{
          "name" => "Initial intake",
          "purpose" => "intake",
          "sections" => [%{"title" => "Nutrition", "questions" => []}]
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == "Initial intake"
      assert data["purpose"] == "intake"
      assert data["sections"] == [%{"title" => "Nutrition", "questions" => []}]
      assert data["status"] == "active"
    end
  end

  describe "GET /v1/coach/form-templates" do
    test "lists templates in the authenticated coach business only", %{conn: conn, business: business} do
      template = insert(:form_template, business: business)
      insert(:form_template)

      conn = get(conn, "/v1/coach/form-templates")

      assert %{"data" => data} = json_response(conn, 200)
      assert Enum.any?(data, &(&1["id"] == template.id))
      assert Enum.any?(data, &(&1["name"] == "Weekly check-in"))
      assert length(data) == 2
    end
  end

  describe "GET /v1/coach/form-templates/:id" do
    test "shows a template", %{conn: conn, business: business} do
      template = insert(:form_template, business: business)

      conn = get(conn, "/v1/coach/form-templates/#{template.id}")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == template.id
      assert data["name"] == template.name
    end

    test "does not show another business's template", %{conn: conn} do
      template = insert(:form_template)

      conn = get(conn, "/v1/coach/form-templates/#{template.id}")

      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/form-templates/:id" do
    test "updates a template", %{conn: conn, business: business} do
      template = insert(:form_template, business: business)

      conn =
        patch(conn, "/v1/coach/form-templates/#{template.id}", %{
          "name" => "Updated intake",
          "status" => "archived"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == template.id
      assert data["name"] == "Updated intake"
      assert data["status"] == "archived"
    end

    test "does not update another business's template", %{conn: conn} do
      template = insert(:form_template, name: "Unchanged")

      conn =
        patch(conn, "/v1/coach/form-templates/#{template.id}", %{
          "name" => "Changed"
        })

      assert json_response(conn, 404)
      assert Repo.get!(FormTemplate, template.id).name == "Unchanged"
    end
  end

  describe "DELETE /v1/coach/form-templates/:id" do
    test "deletes a template", %{conn: conn, business: business} do
      template = insert(:form_template, business: business)

      conn = delete(conn, "/v1/coach/form-templates/#{template.id}")

      assert response(conn, 204) == ""
      refute Repo.get(FormTemplate, template.id)
    end

    test "does not delete a template with assignments", %{conn: conn, coach: coach} do
      client = insert(:client, business: coach.business, creator: coach)
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn = delete(conn, "/v1/coach/form-templates/#{template.id}")

      assert %{"error_detail" => %{"fields" => %{"form_template_id" => ["has assignments"]}}} =
               json_response(conn, 422)

      assert Repo.get!(FormTemplate, template.id)
      assert Repo.get!(FormAssignment, assignment.id)
    end

    test "does not delete another business's template", %{conn: conn} do
      template = insert(:form_template)

      conn = delete(conn, "/v1/coach/form-templates/#{template.id}")

      assert json_response(conn, 404)
      assert Repo.get!(FormTemplate, template.id)
    end
  end

  describe "GET /v1/coach/clients/:client_id/form-assignments" do
    test "lists assigned forms for a client", %{conn: conn, coach: coach} do
      client = insert(:client, business: coach.business, creator: coach)
      other_client = insert(:client, business: coach.business, creator: coach)
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)
      insert(:form_assignment, business: coach.business, client: other_client, form_template: template)

      conn = get(conn, "/v1/coach/clients/#{client.id}/form-assignments")

      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["id"] == assignment.id
      assert data["client_id"] == client.id
      assert data["form_template"]["id"] == template.id
    end

    test "does not list another business's client assignments", %{conn: conn} do
      other_coach = insert(:coach)
      client = insert(:client, business: other_coach.business, creator: other_coach, user: insert(:user))

      conn = get(conn, "/v1/coach/clients/#{client.id}/form-assignments")

      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/form-assignments/:id" do
    test "updates an assigned form", %{conn: conn, coach: coach} do
      client = insert(:client, business: coach.business, creator: coach)
      template = insert(:form_template, business: coach.business)
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        patch(conn, "/v1/coach/form-assignments/#{assignment.id}", %{
          "priority" => "normal",
          "status" => "in_progress"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == assignment.id
      assert data["priority"] == "normal"
      assert data["status"] == "in_progress"
      assert data["purpose"] == "check_in"
      assert data["completed_at"] == nil
      assert data["form_template"]["id"] == template.id

      updated = Repo.get!(FormAssignment, assignment.id)
      assert updated.purpose == :check_in
      assert updated.completed_at == nil
    end

    test "does not update purpose (schema enforces allowed fields only)", %{conn: conn, coach: coach} do
      client = insert(:client, business: coach.business, creator: coach)
      template = insert(:form_template, business: coach.business, purpose: "check_in")
      assignment = insert(:form_assignment, business: coach.business, client: client, form_template: template)

      conn =
        patch(conn, "/v1/coach/form-assignments/#{assignment.id}", %{
          "priority" => "normal"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["priority"] == "normal"
      assert data["purpose"] == "check_in"
      assert data["completed_at"] == nil

      updated = Repo.get!(FormAssignment, assignment.id)
      assert updated.purpose == :check_in
      assert updated.completed_at == nil
    end

    test "does not update another business's assignment", %{conn: conn} do
      other_coach = insert(:coach)
      client = insert(:client, business: other_coach.business, creator: other_coach, user: insert(:user))
      template = insert(:form_template, business: other_coach.business)

      assignment =
        insert(:form_assignment,
          business: other_coach.business,
          client: client,
          form_template: template,
          status: "assigned"
        )

      conn =
        patch(conn, "/v1/coach/form-assignments/#{assignment.id}", %{
          "status" => "dismissed"
        })

      assert json_response(conn, 404)
      assert Repo.get!(FormAssignment, assignment.id).status == :assigned
    end
  end
end
