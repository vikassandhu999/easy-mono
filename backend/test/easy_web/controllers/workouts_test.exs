defmodule EasyWeb.WorkoutsTest do
  use Easy.ConnCase, async: true

  setup %{conn: conn} do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    %{conn: authenticate_coach(conn, coach), coach: coach, client: client}
  end

  test "catalogue list returns page fields and literal Exercise values", f do
    exercise = insert(:exercise, business: f.coach.business, name: "Literal_% exercise")
    response = get(f.conn, "/v1/coach/exercises?search=Literal_%25&limit=1") |> json_response(200)
    assert response["count"] == 1 and is_nil(response["next_cursor"])

    assert [%{"id" => id, "metrics" => ["reps", "weight"], "kind" => "movement", "is_builtin" => false}] =
             response["data"]

    assert id == exercise.id
  end

  test "library and client lists, content detail and week serialize as their wire contract", f do
    exercise = insert(:exercise, business: f.coach.business)

    body = %{
      name: "Test workout",
      groups: [%{rounds: 3, exercises: [%{exercise_id: exercise.id, targets: [%{reps: %{mode: "exact", value: 8}}]}]}]
    }

    library = post(f.conn, "/v1/coach/workouts", body) |> json_response(201)

    assert library["data"]["groups"]
           |> hd()
           |> Map.fetch!("exercises")
           |> hd()
           |> Map.fetch!("exercise")
           |> Map.fetch!("name") == exercise.name

    page = get(f.conn, "/v1/coach/workouts") |> json_response(200)
    assert page["count"] == 1 and hd(page["data"])["id"] == library["data"]["id"]

    assigned =
      post(f.conn, "/v1/coach/clients/#{f.client.id}/workouts/#{library["data"]["id"]}/assign") |> json_response(201)

    assert assigned["data"]["id"] != library["data"]["id"] and is_binary(assigned["undo_token"])
    client_page = get(f.conn, "/v1/coach/clients/#{f.client.id}/workouts") |> json_response(200)
    assert client_page["count"] == 1 and hd(client_page["data"])["client_id"] == f.client.id

    schedule =
      post(f.conn, "/v1/coach/clients/#{f.client.id}/workout-schedules", %{
        workout_id: assigned["data"]["id"],
        weekdays_mask: 9,
        time: "18:30:00",
        coach_id: f.coach.id
      })
      |> json_response(201)

    assert schedule["data"]["time"] == "18:30" and schedule["data"]["weekdays_mask"] == 9
    week = get(f.conn, "/v1/coach/clients/#{f.client.id}/workout-week") |> json_response(200)
    assert length(week["data"]["workouts"]) == 1 and length(week["data"]["schedules"]) == 1
    assert Enum.any?(week["data"]["coaches"], &(&1["id"] == f.coach.id))

    removed =
      delete(f.conn, "/v1/coach/clients/#{f.client.id}/workout-schedules/#{schedule["data"]["id"]}")
      |> json_response(200)

    assert removed["data"]["schedules"] == []

    undone =
      post(f.conn, "/v1/coach/clients/#{f.client.id}/workout-undo", %{token: removed["undo_token"]})
      |> json_response(200)

    assert hd(undone["data"]["schedules"])["id"] == schedule["data"]["id"]
  end

  test "partial type patches validate against the saved groups before committing", f do
    exercise = insert(:exercise, business: f.coach.business)

    created =
      post(f.conn, "/v1/coach/workouts", %{
        name: "Prescribed",
        groups: [%{rounds: 3, exercises: [%{exercise_id: exercise.id}]}]
      })
      |> json_response(201)

    id = created["data"]["id"]
    assert patch(f.conn, "/v1/coach/workouts/#{id}", %{type: "open"}) |> json_response(422)
    saved = get(f.conn, "/v1/coach/workouts/#{id}") |> json_response(200)
    assert saved["data"]["type"] == "prescribed" and length(saved["data"]["groups"]) == 1
    cleared = patch(f.conn, "/v1/coach/workouts/#{id}", %{type: "open", groups: []}) |> json_response(200)
    assert cleared["data"]["type"] == "open" and cleared["data"]["groups"] == []
  end

  test "typed bodies reject trusted fields and foreign resources return 404", f do
    assert post(f.conn, "/v1/coach/exercises", %{
             name: "No",
             kind: "movement",
             goals: ["strength"],
             places: ["gym"],
             business_id: Ecto.UUID.generate()
           })
           |> json_response(422)

    foreign = insert(:exercise)

    for verb <- [:get, :patch, :delete] do
      conn =
        case verb do
          :get -> get(f.conn, "/v1/coach/exercises/#{foreign.id}")
          :patch -> patch(f.conn, "/v1/coach/exercises/#{foreign.id}", %{name: "No"})
          :delete -> delete(f.conn, "/v1/coach/exercises/#{foreign.id}")
        end

      assert json_response(conn, 404)["error_code"] == "not_found"
    end

    client = insert(:client)
    assert get(f.conn, "/v1/coach/clients/#{client.id}/workout-week") |> json_response(404)

    assert post(f.conn, "/v1/coach/clients/#{f.client.id}/workouts", %{
             name: "Bad video",
             type: "video",
             video: "file:///bad"
           })
           |> json_response(422)
  end
end
