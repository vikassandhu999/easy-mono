defmodule EasyWeb.Coaches.CheckInScheduleControllerTest do
  use Easy.ConnCase

  alias Easy.Forms.CheckInSchedule
  alias Easy.Repo
  alias EasyWeb.ApiSpec

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach)
    template = insert(:form_template, business: coach.business, purpose: :check_in)

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_coach(coach)

    %{conn: conn, coach: coach, client: client, template: template}
  end

  test "creates and lists a schedule", %{conn: conn, client: client, template: template} do
    conn =
      post(conn, "/v1/coach/clients/#{client.id}/check-in-schedules", %{
        "form_template_id" => template.id,
        "frequency" => "weekly",
        "next_due_on" => "2026-07-18"
      })

    assert %{"data" => created} = json_response(conn, 201)
    assert created["client_id"] == client.id
    assert created["frequency"] == "weekly"
    assert created["form_template"]["id"] == template.id

    conn = get(recycle(conn), "/v1/coach/clients/#{client.id}/check-in-schedules")
    assert %{"data" => [%{"id" => id}]} = json_response(conn, 200)
    assert id == created["id"]
  end

  test "updates and deletes an unused schedule", %{conn: conn, client: client, template: template} do
    schedule =
      insert(:check_in_schedule,
        business: client.business,
        client: client,
        form_template: template,
        next_due_on: ~D[2026-07-18]
      )

    conn = patch(conn, "/v1/coach/check-in-schedules/#{schedule.id}", %{"active" => false})
    assert %{"data" => %{"active" => false}} = json_response(conn, 200)

    conn = delete(recycle(conn), "/v1/coach/check-in-schedules/#{schedule.id}")
    assert response(conn, 204)
    refute Repo.get(CheckInSchedule, schedule.id)
  end

  test "creates a second active schedule with a different template and lists both",
       %{conn: conn, client: client, template: template} do
    other_template = insert(:form_template, business: client.business, purpose: :check_in)
    due = Date.utc_today() |> Date.add(7) |> Date.to_iso8601()

    conn = post(conn, "/v1/coach/clients/#{client.id}/check-in-schedules", schedule_body(template.id, due))
    assert json_response(conn, 201)

    conn =
      recycle_json(conn)
      |> post("/v1/coach/clients/#{client.id}/check-in-schedules", schedule_body(other_template.id, due))

    assert json_response(conn, 201)

    conn = get(recycle(conn), "/v1/coach/clients/#{client.id}/check-in-schedules")
    assert %{"data" => schedules} = json_response(conn, 200)

    assert schedules |> Enum.map(& &1["form_template"]["id"]) |> Enum.sort() ==
             Enum.sort([template.id, other_template.id])
  end

  test "rejects a second active schedule with the same template on the template field",
       %{conn: conn, client: client, template: template} do
    insert(:check_in_schedule, business: client.business, client: client, form_template: template)

    due = Date.utc_today() |> Date.add(7) |> Date.to_iso8601()
    conn = post(conn, "/v1/coach/clients/#{client.id}/check-in-schedules", schedule_body(template.id, due))

    assert %{"error_detail" => %{"fields" => %{"form_template_id" => [_message]}}} =
             json_response(conn, 422)
  end

  test "rejects a fourth active schedule with a distinct cap error naming no number",
       %{conn: conn, client: client} do
    for _index <- 1..3 do
      template = insert(:form_template, business: client.business, purpose: :check_in)
      insert(:check_in_schedule, business: client.business, client: client, form_template: template)
    end

    extra_template = insert(:form_template, business: client.business, purpose: :check_in)
    due = Date.utc_today() |> Date.add(7) |> Date.to_iso8601()

    conn =
      post(conn, "/v1/coach/clients/#{client.id}/check-in-schedules", schedule_body(extra_template.id, due))

    assert %{"error_code" => "check_in_schedule_cap_reached", "error_message" => message} =
             json_response(conn, 422)

    refute message =~ ~r/\d/
  end

  test "rejects reactivating a paused schedule past the cap", %{conn: conn, client: client} do
    for _index <- 1..3 do
      template = insert(:form_template, business: client.business, purpose: :check_in)
      insert(:check_in_schedule, business: client.business, client: client, form_template: template)
    end

    paused_template = insert(:form_template, business: client.business, purpose: :check_in)

    paused =
      insert(:check_in_schedule,
        business: client.business,
        client: client,
        form_template: paused_template,
        active: false
      )

    conn = patch(conn, "/v1/coach/check-in-schedules/#{paused.id}", %{"active" => true})

    assert %{"error_code" => "check_in_schedule_cap_reached"} = json_response(conn, 422)
    refute Repo.get(CheckInSchedule, paused.id).active
  end

  test "pausing one schedule leaves the other still generating assignments",
       %{conn: conn, client: client, template: template} do
    other_template = insert(:form_template, business: client.business, purpose: :check_in)
    tomorrow = Date.add(Date.utc_today(), 1)

    paused =
      insert(:check_in_schedule,
        business: client.business,
        client: client,
        form_template: template,
        next_due_on: tomorrow
      )

    running =
      insert(:check_in_schedule,
        business: client.business,
        client: client,
        form_template: other_template,
        next_due_on: tomorrow
      )

    conn = patch(conn, "/v1/coach/check-in-schedules/#{paused.id}", %{"active" => false})
    assert %{"data" => %{"active" => false}} = json_response(conn, 200)

    assert {1, 0} = Easy.Forms.generate_due_check_ins(tomorrow)

    conn = get(recycle(conn), "/v1/coach/clients/#{client.id}/form-assignments")
    assert %{"data" => [assignment]} = json_response(conn, 200)
    assert assignment["check_in_schedule_id"] == running.id
  end

  test "rejects cross-tenant client", %{conn: conn, template: template} do
    other_client = insert(:client)

    conn =
      post(conn, "/v1/coach/clients/#{other_client.id}/check-in-schedules", %{
        "form_template_id" => template.id,
        "frequency" => "weekly",
        "next_due_on" => "2026-07-18"
      })

    assert json_response(conn, 404)
  end

  test "OpenAPI contains schedule routes and retires manual assign" do
    paths = ApiSpec.spec().paths
    assert paths["/v1/coach/clients/{client_id}/check-in-schedules"]
    assert paths["/v1/coach/check-in-schedules/{id}"]
    refute paths["/v1/coach/form-templates/{id}/assign"]
  end

  defp schedule_body(template_id, due) do
    %{"form_template_id" => template_id, "frequency" => "weekly", "next_due_on" => due}
  end

  defp recycle_json(conn) do
    conn |> recycle() |> put_req_header("content-type", "application/json")
  end
end
