defmodule EasyWeb.Coaches.FormManagementTest do
  use Easy.ConnCase

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

  test "lists active and archived templates in separate cursor pages within the coach business", %{
    conn: conn,
    business: business
  } do
    active = insert(:form_template, business: business, name: "Lifecycle active")
    archived = insert(:form_template, business: business, name: "Lifecycle archived", status: :archived)
    insert(:form_template, name: "Lifecycle private", status: :archived)

    active_page =
      conn
      |> get("/v1/coach/form-templates", %{"cursor" => "start", "search" => "Lifecycle", "status" => "active"})
      |> json_response(200)

    assert %{"data" => [%{"id" => active_id}], "count" => 1, "next_cursor" => nil} = active_page
    assert active_id == active.id

    archived_page =
      conn
      |> recycle()
      |> get("/v1/coach/form-templates", %{"cursor" => "start", "search" => "Lifecycle", "status" => "archived"})
      |> json_response(200)

    assert %{"data" => [%{"id" => archived_id}], "count" => 1, "next_cursor" => nil} = archived_page
    assert archived_id == archived.id
  end

  test "management reports usage, blocks delete, and is tenant-scoped", %{conn: conn, coach: coach, business: business} do
    client = insert(:client, business: business, creator: coach)
    assigned = insert(:form_template, business: business)
    scheduled = insert(:form_template, business: business, purpose: :check_in)
    assignment = insert(:form_assignment, business: business, client: client, form_template: assigned)
    insert(:form_submission, business: business, client: client, form_assignment: assignment)
    insert(:check_in_schedule, business: business, client: client, form_template: scheduled)
    foreign = insert(:form_template)

    assigned_management = conn |> get("/v1/coach/form-templates/#{assigned.id}/management") |> json_response(200)
    assert assigned_management["data"]["assignment_count"] == 1
    assert assigned_management["data"]["schedule_count"] == 0
    assert assigned_management["data"]["delete_blocked_reason"] == "assignments"
    assert assigned_management["data"]["template"]["response_count"] == 1

    scheduled_management =
      conn |> recycle() |> get("/v1/coach/form-templates/#{scheduled.id}/management") |> json_response(200)

    assert scheduled_management["data"]["assignment_count"] == 0
    assert scheduled_management["data"]["schedule_count"] == 1
    assert scheduled_management["data"]["active_schedule_count"] == 1
    assert scheduled_management["data"]["delete_blocked_reason"] == "schedules"

    assert conn |> recycle() |> delete("/v1/coach/form-templates/#{assigned.id}") |> json_response(422)
    assert conn |> recycle() |> delete("/v1/coach/form-templates/#{scheduled.id}") |> json_response(422)
    assert conn |> recycle() |> get("/v1/coach/form-templates/#{foreign.id}/management") |> json_response(404)
  end

  test "rejects stale lifecycle writes and increments the revision on a successful write", %{conn: conn, business: business} do
    template = insert(:form_template, business: business, purpose: :intake)

    updated =
      conn
      |> patch("/v1/coach/form-templates/#{template.id}", %{"expected_revision" => template.revision, "name" => "Revised"})
      |> json_response(200)

    assert updated["data"]["revision"] == template.revision + 1

    stale =
      conn
      |> recycle()
      |> patch("/v1/coach/form-templates/#{template.id}", %{"expected_revision" => template.revision, "status" => "archived"})
      |> json_response(409)

    assert stale["error_code"] == "stale_revision"
    assert stale["error_detail"]["current_revision"] == template.revision + 1
    assert Repo.get!(FormTemplate, template.id).status == :active
  end

  test "sets and clears the default with revisions, then keeps existing assignments and schedules after archive", %{
    conn: conn,
    coach: coach,
    business: business
  } do
    client = insert(:client, business: business, creator: coach)
    intake = insert(:form_template, business: business, purpose: :intake)
    check_in = insert(:form_template, business: business, purpose: :check_in)
    assignment = insert(:form_assignment, business: business, client: client, form_template: intake, purpose: :intake)
    schedule = insert(:check_in_schedule, business: business, client: client, form_template: check_in)

    defaulted =
      conn
      |> put("/v1/coach/form-templates/#{intake.id}/default-intake?expected_revision=#{intake.revision}")
      |> json_response(200)

    assert defaulted["data"]["is_default_intake"]

    cleared =
      conn
      |> recycle()
      |> delete("/v1/coach/form-templates/#{intake.id}/default-intake?expected_revision=#{defaulted["data"]["revision"]}")
      |> json_response(200)

    assert cleared["data"]["is_default_intake"] == false

    archived =
      conn
      |> recycle()
      |> patch("/v1/coach/form-templates/#{check_in.id}", %{"expected_revision" => check_in.revision, "status" => "archived"})
      |> json_response(200)

    assert archived["data"]["status"] == "archived"

    assignments =
      conn
      |> recycle()
      |> get("/v1/coach/clients/#{client.id}/form-assignments")
      |> json_response(200)

    assert Enum.any?(assignments["data"], &(&1["id"] == assignment.id))

    schedules =
      conn
      |> recycle()
      |> get("/v1/coach/clients/#{client.id}/check-in-schedules")
      |> json_response(200)

    assert Enum.any?(schedules["data"], &(&1["id"] == schedule.id))
  end

  test "rejects stale default and delete writes, plus all cross-tenant writes", %{conn: conn, business: business} do
    template = insert(:form_template, business: business, purpose: :intake)
    foreign = insert(:form_template, purpose: :intake)

    assert %{"error_code" => "stale_revision"} =
             conn
             |> put("/v1/coach/form-templates/#{template.id}/default-intake?expected_revision=999")
             |> json_response(409)

    defaulted =
      conn
      |> recycle()
      |> put("/v1/coach/form-templates/#{template.id}/default-intake?expected_revision=#{template.revision}")
      |> json_response(200)

    assert defaulted["data"]["revision"] == template.revision + 1

    assert %{"error_code" => "stale_revision"} =
             conn
             |> recycle()
             |> delete("/v1/coach/form-templates/#{template.id}/default-intake?expected_revision=#{template.revision}")
             |> json_response(409)

    assert %{"error_code" => "stale_revision"} =
             conn
             |> recycle()
             |> delete("/v1/coach/form-templates/#{template.id}?expected_revision=#{template.revision}")
             |> json_response(409)

    for write <- [
          fn scoped -> patch(scoped, "/v1/coach/form-templates/#{foreign.id}", %{"name" => "Changed"}) end,
          fn scoped -> delete(scoped, "/v1/coach/form-templates/#{foreign.id}") end,
          fn scoped -> put(scoped, "/v1/coach/form-templates/#{foreign.id}/default-intake") end,
          fn scoped -> delete(scoped, "/v1/coach/form-templates/#{foreign.id}/default-intake") end
        ] do
      assert conn |> recycle() |> write.() |> json_response(404)
    end

    assert Repo.get!(FormTemplate, foreign.id).name == foreign.name
    refute Repo.get!(FormTemplate, foreign.id).is_default_intake
  end

  test "deletes an unused template and refuses built-in template deletion", %{conn: conn, business: business} do
    unused = insert(:form_template, business: business)

    assert conn |> delete("/v1/coach/form-templates/#{unused.id}") |> response(204) == ""
    refute Repo.get(FormTemplate, unused.id)

    templates = conn |> recycle() |> get("/v1/coach/form-templates") |> json_response(200)
    built_in = Enum.find(templates["data"], &(&1["name"] == "Weekly check-in"))

    assert built_in["is_default_intake"] == false
    assert conn |> recycle() |> delete("/v1/coach/form-templates/#{built_in["id"]}") |> json_response(422)
  end

  test "archiving an assigned default intake clears its flag permanently", %{conn: conn, coach: coach, business: business} do
    client = insert(:client, business: business, creator: coach)
    intake = insert(:form_template, business: business, purpose: :intake, is_default_intake: true)
    insert(:form_assignment, business: business, client: client, form_template: intake, purpose: :intake)

    archived =
      conn
      |> patch("/v1/coach/form-templates/#{intake.id}", %{"expected_revision" => intake.revision, "status" => "archived"})
      |> json_response(200)

    assert archived["data"]["is_default_intake"] == false

    restored =
      conn
      |> recycle()
      |> patch("/v1/coach/form-templates/#{intake.id}", %{
        "expected_revision" => archived["data"]["revision"],
        "status" => "active"
      })
      |> json_response(200)

    assert restored["data"]["is_default_intake"] == false
  end

  test "rejects new uses of an archived check-in while an existing due schedule generates", %{
    conn: conn,
    coach: coach,
    business: business
  } do
    client = insert(:client, business: business, creator: coach)
    template = insert(:form_template, business: business, purpose: :check_in)
    tomorrow = Date.add(Date.utc_today(), 1)

    schedule =
      insert(:check_in_schedule,
        business: business,
        client: client,
        form_template: template,
        next_due_on: tomorrow
      )

    conn
    |> patch("/v1/coach/form-templates/#{template.id}", %{"expected_revision" => template.revision, "status" => "archived"})
    |> json_response(200)

    assert conn
           |> recycle()
           |> post("/v1/coach/clients/#{client.id}/form-assignments", %{"form_template_id" => template.id})
           |> json_response(422)

    assert conn
           |> recycle()
           |> post("/v1/coach/clients/#{client.id}/check-in-schedules", %{
             "form_template_id" => template.id,
             "frequency" => "weekly",
             "next_due_on" => Date.to_iso8601(tomorrow)
           })
           |> json_response(422)

    assert {1, 0} = Easy.CheckIns.generate_due_check_ins(tomorrow)

    assignments =
      conn
      |> recycle()
      |> get("/v1/coach/clients/#{client.id}/form-assignments")
      |> json_response(200)

    assert [%{"check_in_schedule_id" => schedule_id, "form_template_id" => template_id}] = assignments["data"]
    assert schedule_id == schedule.id
    assert template_id == template.id
  end
end
