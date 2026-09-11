defmodule EasyWeb.Coaches.CheckInScheduleControllerTest do
  use Easy.ConnCase

  alias Easy.Forms.CheckInSchedule
  alias Easy.Repo
  alias EasyWeb.Coaches.CheckInScheduleController
  alias EasyWeb.TypedRoute.{Check, Type}

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
    due = due_on()

    conn =
      post(conn, "/v1/coach/clients/#{client.id}/check-in-schedules", %{
        "form_template_id" => template.id,
        "frequency" => "weekly",
        "next_due_on" => due
      })

    assert %{"data" => created} = json_response(conn, 201)
    assert_write_schema(conn, :create)
    assert created["client_id"] == client.id
    assert created["frequency"] == "weekly"
    assert created["form_template"]["id"] == template.id

    conn = get(recycle(conn), "/v1/coach/clients/#{client.id}/check-in-schedules")
    assert %{"data" => [%{"id" => id}], "count" => 1, "next_cursor" => nil} = json_response(conn, 200)
    assert id == created["id"]
  end

  test "pages schedules with template and active filters within the requested client", %{conn: conn, client: client} do
    search = "Schedule page #{Ecto.UUID.generate()}"
    first_template = insert(:form_template, business: client.business, purpose: :check_in, name: "#{search} first")
    second_template = insert(:form_template, business: client.business, purpose: :check_in, name: "#{search} second")
    paused_template = insert(:form_template, business: client.business, purpose: :check_in, name: "#{search} paused")

    first = insert(:check_in_schedule, business: client.business, client: client, form_template: first_template)
    second = insert(:check_in_schedule, business: client.business, client: client, form_template: second_template)

    paused =
      insert(:check_in_schedule,
        business: client.business,
        client: client,
        form_template: paused_template,
        active: false
      )

    other_client = insert(:client, business: client.business, creator: client.creator)
    other_template = insert(:form_template, business: client.business, purpose: :check_in, name: "#{search} other client")
    insert(:check_in_schedule, business: client.business, client: other_client, form_template: other_template)

    first_page =
      conn
      |> get("/v1/coach/clients/#{client.id}/check-in-schedules", %{
        "cursor" => "start",
        "limit" => "1",
        "search" => search,
        "active" => "true"
      })
      |> json_response(200)

    assert %{"data" => [first_schedule], "count" => 2, "next_cursor" => cursor} = first_page
    assert is_binary(cursor)

    second_page =
      conn
      |> recycle()
      |> get("/v1/coach/clients/#{client.id}/check-in-schedules", %{
        "cursor" => cursor,
        "limit" => "10",
        "search" => search,
        "active" => "true"
      })
      |> json_response(200)

    assert %{"data" => [second_schedule], "count" => 2, "next_cursor" => nil} = second_page
    assert Enum.sort([first_schedule["id"], second_schedule["id"]]) == Enum.sort([first.id, second.id])

    paused_page =
      conn
      |> recycle()
      |> get("/v1/coach/clients/#{client.id}/check-in-schedules", %{
        "cursor" => "start",
        "search" => search,
        "active" => "false"
      })
      |> json_response(200)

    assert %{"data" => [%{"id" => paused_id}], "count" => 1, "next_cursor" => nil} = paused_page
    assert paused_id == paused.id
  end

  test "rejects unknown list query parameters", %{conn: conn, client: client} do
    conn = get(conn, "/v1/coach/clients/#{client.id}/check-in-schedules?unexpected=true")

    assert %{"error_detail" => %{"fields" => %{"unexpected" => ["is unknown"]}}} =
             json_response(conn, 422)
  end

  test "rejects malformed cursors and nonpositive limits", %{conn: conn, client: client} do
    assert %{"error_detail" => %{"fields" => %{"cursor" => ["is invalid"]}}} =
             conn
             |> get("/v1/coach/clients/#{client.id}/check-in-schedules?cursor=not-a-cursor")
             |> json_response(422)

    assert %{"error_detail" => %{"fields" => %{"limit" => ["is invalid"]}}} =
             conn
             |> recycle()
             |> get("/v1/coach/clients/#{client.id}/check-in-schedules?cursor=start&limit=0")
             |> json_response(422)
  end

  test "caps cursor pages at one hundred schedules", %{conn: conn, client: client} do
    search = "Schedule cap #{Ecto.UUID.generate()}"

    for index <- 1..101 do
      template = insert(:form_template, business: client.business, purpose: :check_in, name: "#{search} #{index}")
      insert(:check_in_schedule, business: client.business, client: client, form_template: template)
    end

    response =
      conn
      |> get("/v1/coach/clients/#{client.id}/check-in-schedules", %{
        "cursor" => "start",
        "limit" => "1000",
        "search" => search
      })
      |> json_response(200)

    assert %{"data" => schedules, "count" => 101, "next_cursor" => cursor} = response
    assert length(schedules) == 100
    assert is_binary(cursor)
  end

  test "treats percent and underscore as literal search characters", %{conn: conn, client: client} do
    suffix = Ecto.UUID.generate()
    search = "Schedule %_ #{suffix}"

    matching_template =
      insert(:form_template, business: client.business, purpose: :check_in, name: "#{search} literal")

    wildcard_only_template =
      insert(:form_template, business: client.business, purpose: :check_in, name: "Schedule xy #{suffix} wildcard")

    matching =
      insert(:check_in_schedule, business: client.business, client: client, form_template: matching_template)

    insert(:check_in_schedule, business: client.business, client: client, form_template: wildcard_only_template)

    response =
      conn
      |> get("/v1/coach/clients/#{client.id}/check-in-schedules", %{
        "cursor" => "start",
        "search" => search
      })
      |> json_response(200)

    assert %{"data" => [%{"id" => schedule_id}], "count" => 1, "next_cursor" => nil} = response
    assert schedule_id == matching.id
  end

  test "updates and deletes an unused schedule", %{conn: conn, client: client, template: template} do
    schedule =
      insert(:check_in_schedule,
        business: client.business,
        client: client,
        form_template: template,
        next_due_on: Date.add(Date.utc_today(), 7)
      )

    conn = patch(conn, "/v1/coach/check-in-schedules/#{schedule.id}", %{"active" => false})
    assert %{"data" => %{"active" => false}} = json_response(conn, 200)
    assert_write_schema(conn, :update)

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

    assert {1, 0} = Easy.CheckIns.generate_due_check_ins(tomorrow)

    conn = get(recycle(conn), "/v1/coach/clients/#{client.id}/form-assignments")
    assert %{"data" => [assignment]} = json_response(conn, 200)
    assert assignment["check_in_schedule_id"] == running.id
  end

  test "rejects cross-tenant client", %{conn: conn, template: template} do
    other_client = insert(:client)
    due = due_on()

    conn = get(conn, "/v1/coach/clients/#{other_client.id}/check-in-schedules?cursor=start")
    assert json_response(conn, 404)

    conn =
      post(recycle_json(conn), "/v1/coach/clients/#{other_client.id}/check-in-schedules", %{
        "form_template_id" => template.id,
        "frequency" => "weekly",
        "next_due_on" => due
      })

    assert json_response(conn, 404)
  end

  defp schedule_body(template_id, due) do
    %{"form_template_id" => template_id, "frequency" => "weekly", "next_due_on" => due}
  end

  defp due_on, do: Date.utc_today() |> Date.add(7) |> Date.to_iso8601()

  defp assert_write_schema(conn, action) do
    %{ok: {status, schema}} = CheckInScheduleController.__typed_route__(action)
    assert conn.status == status
    assert :ok = conn.resp_body |> Jason.decode!() |> normalize_for_schema(schema) |> Check.assert!(schema)
  end

  defp normalize_for_schema(value, {:remote, module, name}) do
    normalize_for_schema(value, Type.fetch!(module, name))
  end

  defp normalize_for_schema(value, {:list, inner}) when is_list(value) do
    Enum.map(value, &normalize_for_schema(&1, inner))
  end

  defp normalize_for_schema(value, {:union, variants}) when is_map(value) do
    case Enum.find(variants, &record_schema_for?(value, &1)) do
      nil -> value
      schema -> normalize_for_schema(value, schema)
    end
  end

  defp normalize_for_schema(value, {:record, fields}) when is_map(value) do
    allowed = MapSet.new(fields, fn {name, _required, _type} -> Atom.to_string(name) end)
    assert MapSet.subset?(MapSet.new(Map.keys(value)), allowed)

    Enum.reduce(fields, %{}, fn {name, required, type}, acc ->
      key = Atom.to_string(name)

      case {required, Map.fetch(value, key)} do
        {:required, {:ok, field_value}} -> Map.put(acc, name, normalize_for_schema(field_value, type))
        {:required, :error} -> acc
        {:optional, {:ok, field_value}} -> Map.put(acc, name, normalize_for_schema(field_value, type))
        {:optional, :error} -> acc
      end
    end)
  end

  defp normalize_for_schema(value, _schema), do: value

  defp record_schema_for?(value, {:record, fields}) do
    allowed = MapSet.new(fields, fn {name, _required, _type} -> Atom.to_string(name) end)
    MapSet.subset?(MapSet.new(Map.keys(value)), allowed)
  end

  defp record_schema_for?(_value, _schema), do: false

  defp recycle_json(conn) do
    conn |> recycle() |> put_req_header("content-type", "application/json")
  end
end
