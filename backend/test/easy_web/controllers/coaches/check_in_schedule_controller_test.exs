defmodule EasyWeb.Coaches.CheckInScheduleControllerTest do
  use Easy.ConnCase

  alias Easy.ClientProfiles.CheckInSchedule
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
end
