defmodule EasyWeb.CoreTrainingTest do
  use Easy.ConnCase, async: true
  alias Easy.Repo
  alias Easy.Training.Content

  setup %{conn: conn} do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    exercise = insert(:exercise, business: coach.business)
    workout = Ecto.UUID.generate()
    item = Ecto.UUID.generate()
    prescribed = Ecto.UUID.generate()
    entry = Ecto.UUID.generate()

    content = %{
      workouts: [
        %{
          id: workout,
          name: "Superset",
          blocks: [
            %{
              id: Ecto.UUID.generate(),
              format: "superset",
              items: [
                %{
                  id: item,
                  exercise_id: exercise.id,
                  sets: [
                    %{
                      id: prescribed,
                      kind: "working",
                      reps: %{type: "range", min: 6, max: 8},
                      load: %{kg: 20, entered_unit: "kg"},
                      rpe: 8,
                      rir: 2,
                      tempo: "3010",
                      duration_s: nil,
                      distance: nil,
                      rest_s: 90,
                      notes: nil
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      schedule: %{cycle_weeks: 1, entries: [%{id: entry, day: Date.day_of_week(Date.utc_today()) - 1, ref: workout}]}
    }

    %{
      coach: coach,
      client: client,
      exercise: exercise,
      content: content,
      workout: workout,
      item: item,
      prescribed: prescribed,
      entry: entry,
      coach_conn: authenticate_coach(conn, coach),
      client_conn: authenticate_client(conn, client)
    }
  end

  test "typed whole-document router journey publishes, records and returns prescribed names", f do
    response = post(f.coach_conn, "/v1/coach/training-plans", %{name: "Program", content: f.content})
    template = json_response(response, 201)["data"]
    assert template["content"]["schedule"]["cycle_weeks"] == 1
    assert template["content"]["workouts"] |> hd() |> Map.get("name") == "Superset"

    response =
      post(f.coach_conn, "/v1/coach/clients/#{f.client.id}/training-plans/#{template["id"]}/assign", %{
        start_date: Date.to_iso8601(Date.utc_today()),
        expected_revision: template["revision"]
      })

    plan = json_response(response, 201)["data"]

    response =
      post(f.client_conn, "/v1/client/training-sessions", %{
        request_id: Ecto.UUID.generate(),
        plan_revision_id: plan["current_revision"]["id"],
        workout_id: f.workout,
        schedule_entry_id: f.entry,
        occurrence_date: Date.to_iso8601(Date.utc_today())
      })

    session = json_response(response, 201)["data"]
    assert session["prescription"]["name"] == "Superset"

    attrs = %{
      request_id: Ecto.UUID.generate(),
      item_id: f.item,
      set_id: f.prescribed,
      exercise_id: f.exercise.id,
      reps: 8,
      load_value: 100,
      load_unit: "lb",
      outcome: "skipped"
    }

    set =
      json_response(post(f.client_conn, "/v1/client/training-sessions/#{session["id"]}/performed-sets", attrs), 201)[
        "data"
      ]

    assert set["exercise_name"] == f.exercise.name
    assert set["load_kg"] == "45.359"
    assert set["outcome"] == "skipped"

    assert json_response(post(f.client_conn, "/v1/client/training-sessions/#{session["id"]}/complete", %{}), 200)[
             "data"
           ]["state"] == "completed"

    range = %{from: Date.to_iso8601(Date.utc_today()), to: Date.to_iso8601(Date.utc_today())}
    response = get(f.coach_conn, "/v1/coach/clients/#{f.client.id}/training-occurrences", range)
    assert %{"data" => [%{"session_id" => id}], "extra_sessions" => []} = json_response(response, 200)
    assert id == session["id"]

    response =
      patch(f.coach_conn, "/v1/coach/training-plans/#{plan["id"]}", %{
        expected_revision: plan["revision"],
        content: Content.empty(),
        effective_on: Date.to_iso8601(Date.add(Date.utc_today(), 5))
      })

    plan = json_response(response, 200)["data"]
    [future] = plan["scheduled_revisions"]

    response =
      delete(
        f.coach_conn,
        "/v1/coach/training-plans/#{plan["id"]}/revisions/#{future["id"]}?expected_revision=#{plan["revision"]}"
      )

    assert json_response(response, 200)["data"]["scheduled_revisions"] == []
  end

  test "seed-shaped system media and no-search cursor list serialize", f do
    media =
      insert(:library_media,
        business: nil,
        uploaded_by_type: :system,
        uploaded_by_id: nil,
        storage_key: nil,
        external_url: "https://example.test/exercise.jpg",
        content_type: nil,
        byte_size: nil
      )

    insert(:exercise, business: nil, name: "Built in", media: media)
    response = get(f.coach_conn, "/v1/coach/training-exercises", %{cursor: "start", limit: 20, search: ""})
    rows = json_response(response, 200)["data"]
    builtin = Enum.find(rows, & &1["built_in"])
    assert builtin["media"]["url"] == "https://example.test/exercise.jpg"
    assert builtin["media"]["content_type"] == nil
    refute Map.has_key?(builtin, "tracking_type")
    refute Map.has_key?(builtin, "images")
  end

  test "HTTP coaching gate denies ended clients while keeping record reads", f do
    session = json_response(post(f.client_conn, "/v1/client/training-sessions", %{}), 201)["data"]

    Repo.query!("UPDATE coaching_terms SET ends_on=$1 WHERE client_id=$2", [
      Date.add(Date.utc_today(), -1),
      Ecto.UUID.dump!(f.client.id)
    ])

    assert json_response(get(f.client_conn, "/v1/client/training-sessions/#{session["id"]}"), 200)["data"]["id"] ==
             session["id"]

    assert response(patch(f.client_conn, "/v1/client/training-sessions/#{session["id"]}", %{notes: "blocked"}), 403)
  end

  test "router denies foreign reads/writes and rejects retired request fields", f do
    template =
      json_response(post(f.coach_conn, "/v1/coach/training-plans", %{name: "Program", content: f.content}), 201)["data"]

    other = authenticate_coach(build_conn(), insert(:coach))
    assert response(get(other, "/v1/coach/training-plans/#{template["id"]}"), 404)

    assert response(
             patch(other, "/v1/coach/training-plans/#{template["id"]}", %{expected_revision: 1, name: "denied"}),
             404
           )

    assert response(
             post(f.coach_conn, "/v1/coach/training-plans", %{
               name: "Invalid",
               content: put_in(f.content.schedule.cycle_weeks, 2)
             }),
             422
           )

    assert response(post(f.client_conn, "/v1/client/training-sessions", %{soreness_rating: 3}), 422)

    assert Repo.query!("SELECT count(*) FROM training_sessions WHERE client_id=$1", [Ecto.UUID.dump!(f.client.id)]).rows ==
             [[0]]
  end

  test "malformed prescription UUIDs are 422, offset pages work and archived exercises leave picker", f do
    for field <- [:plan_revision_id, :workout_id, :schedule_entry_id, :request_id] do
      assert response(post(f.client_conn, "/v1/client/training-sessions", %{field => "invalid uuid"}), 422)
    end

    for _ <- 1..3, do: insert(:training_plan, business: f.coach.business)

    assert %{"count" => 3, "data" => [_]} =
             json_response(get(f.coach_conn, "/v1/coach/training-plans", %{offset: 2, limit: 1}), 200)

    assert response(delete(f.coach_conn, "/v1/coach/training-exercises/#{f.exercise.id}"), 204)

    data =
      json_response(
        get(f.coach_conn, "/v1/coach/training-exercises", %{cursor: "start", limit: 20, search: f.exercise.name}),
        200
      )

    assert data["data"] == []
    assert json_response(get(f.coach_conn, "/v1/coach/training-exercises/#{f.exercise.id}"), 200)["data"]["archived_at"]
  end
end
