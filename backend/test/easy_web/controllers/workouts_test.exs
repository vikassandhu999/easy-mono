defmodule EasyWeb.WorkoutsTest do
  use Easy.ConnCase, async: true

  alias Easy.Repo
  alias Easy.Workouts
  alias Easy.Workouts.{Workout, WorkoutSchedule}

  setup %{conn: conn} do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    %{conn: authenticate_coach(conn, coach), coach: coach, client: client}
  end

  test "catalogue list returns page fields and literal Exercise values", f do
    exercise = insert(:exercise, business: f.coach.business, name: "Literal_% exercise")
    response = get(f.conn, "/v1/coach/exercises?search=Literal_%25&limit=1") |> json_response(200)
    assert response["count"] == 1 and is_nil(response["next_cursor"])

    assert [%{"id" => id, "metrics" => [%{"key" => "reps", "label" => nil}, %{"key" => "weight", "label" => nil}], "kind" => "movement", "is_builtin" => false}] =
             response["data"]

    assert id == exercise.id
  end

  test "exercise JSON exposes metric entries, the media list and archive state", f do
    response =
      post(f.conn, "/v1/coach/exercises", %{
        name: "Climbing practice",
        kind: "practice",
        instructions: "  Move slowly.  ",
        metrics: [%{key: "reps", label: " Moves "}, %{key: "attempts"}],
        equipment: " Wall and shoes ",
        media: [%{url: "https://example.com/climb", caption: " Demo "}]
      })
      |> json_response(201)

    row = response["data"]
    assert row["metrics"] == [%{"key" => "reps", "label" => "Moves"}, %{"key" => "attempts", "label" => nil}]
    assert row["instructions"] == "Move slowly."
    assert row["equipment"] == "Wall and shoes"
    assert [%{"id" => media_id, "url" => "https://example.com/climb", "caption" => "Demo"}] = row["media"]
    assert is_binary(media_id) and row["archived_at"] == nil
    id = row["id"]
    archived = post(f.conn, "/v1/coach/exercises/#{id}/archive") |> json_response(200)
    assert is_binary(archived["data"]["archived_at"])
    page = get(f.conn, "/v1/coach/exercises?archived=true") |> json_response(200)
    assert Enum.map(page["data"], & &1["id"]) == [id]
    restored = post(f.conn, "/v1/coach/exercises/#{id}/restore") |> json_response(200)
    assert restored["data"]["archived_at"] == nil
    assert restored["data"]["media"] == row["media"]
  end

  test "archive and restore return 404 across tenants", f do
    foreign = insert(:exercise)

    for action <- ["archive", "restore"] do
      assert post(f.conn, "/v1/coach/exercises/#{foreign.id}/#{action}") |> json_response(404)
    end
  end

  test "creating with a grade metric is rejected", f do
    assert post(f.conn, "/v1/coach/exercises", %{name: "Climb", kind: "practice", metrics: [%{key: "grade"}]}) |> json_response(422)
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

  test "exact result targets survive create, update, detail and list responses", f do
    exercise = insert(:exercise, business: f.coach.business, kind: :sport, metrics: [%{key: :result}])

    created =
      post(f.conn, "/v1/coach/workouts", %{
        name: "Match practice",
        groups: [
          %{rounds: 1, exercises: [%{exercise_id: exercise.id, targets: [%{result: %{mode: "exact", value: "win"}}]}]}
        ]
      })
      |> json_response(201)

    id = created["data"]["id"]

    for outcome <- ["win", "draw", "loss"] do
      body = %{
        groups: [
          %{rounds: 1, exercises: [%{exercise_id: exercise.id, targets: [%{result: %{mode: "exact", value: outcome}}]}]}
        ]
      }

      updated = patch(f.conn, "/v1/coach/workouts/#{id}", body) |> json_response(200)
      detail = get(f.conn, "/v1/coach/workouts/#{id}") |> json_response(200)
      page = get(f.conn, "/v1/coach/workouts") |> json_response(200)

      for workout <- [updated["data"], detail["data"], hd(page["data"])] do
        assert get_in(workout, ["groups", Access.at(0), "exercises", Access.at(0), "targets", Access.at(0), "result"]) ==
                 %{"mode" => "exact", "value" => outcome}
      end
    end
  end

  test "workout JSON nests round targets with rest and side_mode", f do
    exercise = insert(:exercise, business: f.coach.business)

    targets = [
      %{reps: %{mode: "exact", value: 8}, rest: %{mode: "exact", value_s: 90}},
      %{weight: %{mode: "range", min: 10, max: 20}, rest: %{mode: "none"}}
    ]

    body = %{
      name: "Each side",
      groups: [
        %{
          rounds: 2,
          exercises: [
            %{
              exercise_id: exercise.id,
              side_mode: "per_side",
              targets_mode: "per_round",
              targets: targets
            }
          ]
        }
      ]
    }

    created = post(f.conn, "/v1/coach/workouts", body) |> json_response(201)
    saved = get(f.conn, "/v1/coach/workouts/#{created["data"]["id"]}") |> json_response(200)
    entry = saved["data"]["groups"] |> hd() |> Map.fetch!("exercises") |> hd()
    assert entry["side_mode"] == "per_side"
    assert entry["targets_mode"] == "per_round"
    assert entry["exercise"]["id"] == exercise.id

    assert entry["targets"] == [
             %{"reps" => %{"mode" => "exact", "value" => 8}, "rest" => %{"mode" => "exact", "value_s" => 90}},
             %{"weight" => %{"mode" => "range", "min" => 10, "max" => 20}, "rest" => %{"mode" => "none"}}
           ]

    refute Map.has_key?(entry, "rest")
  end

  test "video is returned as {id, url}", f do
    url = "https://example.com/video.mp4"
    created = post(f.conn, "/v1/coach/workouts", %{name: "Video", type: "video", video_url: url}) |> json_response(201)
    assert %{"id" => attachment_id, "url" => ^url} = created["data"]["video"]
    assert Ecto.UUID.cast(attachment_id) == {:ok, attachment_id}
    saved = patch(f.conn, "/v1/coach/workouts/#{created["data"]["id"]}", %{video_url: url}) |> json_response(200)
    assert saved["data"]["video"] == %{"id" => attachment_id, "url" => url}
  end

  test "a past-prescription edit returns the copy id", f do
    exercise = insert(:exercise, business: f.coach.business)
    path = "/v1/coach/clients/#{f.client.id}"
    body = %{name: "Before", groups: [%{rounds: 3, exercises: [%{exercise_id: exercise.id, targets: [%{}]}]}]}
    created = post(f.conn, "#{path}/workouts", body) |> json_response(201)
    id = created["data"]["id"]
    scheduled = post(f.conn, "#{path}/workout-schedules", %{workout_id: id, weekdays_mask: 127}) |> json_response(201)

    Repo.get!(WorkoutSchedule, scheduled["data"]["id"])
    |> Ecto.Changeset.change(from_date: Date.add(Date.utc_today(), -7))
    |> Repo.update!()

    changed = patch(f.conn, "#{path}/workouts/#{id}", %{name: "After"}) |> json_response(200)
    assert changed["data"]["id"] != id
    assert changed["data"]["name"] == "After"
    assert is_binary(changed["undo_token"])
    assert Repo.get!(Workout, id).name == "Before"
    assert Repo.get!(Workout, id).archived_at
  end

  test "every library workout route returns 404 across tenants", f do
    coach = insert(:coach)
    {:ok, foreign} = Workouts.create_workout(Easy.DataCase.trainer_ctx(coach), %{name: "Foreign"})
    path = "/v1/coach/workouts/#{foreign.id}"

    operations = [
      fn -> get(f.conn, path) end,
      fn -> patch(f.conn, path, %{name: "No"}) end,
      fn -> delete(f.conn, path) end,
      fn -> post(f.conn, "#{path}/copy") end,
      fn -> post(f.conn, "/v1/coach/clients/#{f.client.id}/workouts/#{foreign.id}/assign") end
    ]

    for operation <- operations, do: assert(json_response(operation.(), 404)["error_code"] == "not_found")
  end

  test "every client workout and schedule route returns 404 across tenants", f do
    foreign = insert(:client)
    ctx = Easy.DataCase.trainer_ctx(foreign.coach)
    {:ok, %{data: workout}} = Workouts.create_workout_for_client(ctx, foreign.id, %{name: "Foreign", type: "open"})

    {:ok, %{data: schedule, undo_token: token}} =
      Workouts.add_schedule_for_client(ctx, foreign.id, %{workout_id: workout.id, weekdays_mask: 127})

    {:ok, library} = Workouts.create_workout(Easy.DataCase.trainer_ctx(f.coach), %{name: "Own library"})
    path = "/v1/coach/clients/#{foreign.id}"

    operations = [
      fn -> get(f.conn, "#{path}/workouts") end,
      fn -> post(f.conn, "#{path}/workouts", %{name: "No"}) end,
      fn -> get(f.conn, "#{path}/workout-week") end,
      fn -> post(f.conn, "#{path}/workout-undo", %{token: token}) end,
      fn -> post(f.conn, "#{path}/workouts/#{library.id}/assign") end
    ]

    for operation <- operations, do: assert(json_response(operation.(), 404)["error_code"] == "not_found")

    for client_id <- [foreign.id, f.client.id] do
      path = "/v1/coach/clients/#{client_id}"

      operations = [
        fn -> get(f.conn, "#{path}/workouts/#{workout.id}") end,
        fn -> patch(f.conn, "#{path}/workouts/#{workout.id}", %{name: "No"}) end,
        fn -> delete(f.conn, "#{path}/workouts/#{workout.id}") end,
        fn -> post(f.conn, "#{path}/workouts/#{workout.id}/copy") end,
        fn -> post(f.conn, "#{path}/workout-schedules", %{workout_id: workout.id, weekdays_mask: 127}) end,
        fn -> patch(f.conn, "#{path}/workout-schedules/#{schedule.id}", %{weekdays_mask: 1}) end,
        fn -> delete(f.conn, "#{path}/workout-schedules/#{schedule.id}") end
      ]

      for operation <- operations, do: assert(json_response(operation.(), 404)["error_code"] == "not_found")
    end
  end

  test "partial type patches validate against the saved groups before committing", f do
    exercise = insert(:exercise, business: f.coach.business)

    created =
      post(f.conn, "/v1/coach/workouts", %{
        name: "Prescribed",
        groups: [%{rounds: 3, exercises: [%{exercise_id: exercise.id, targets: [%{}]}]}]
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
             video_url: "file:///bad"
           })
           |> json_response(422)
  end
end
