defmodule EasyWeb.CoreDomainContractTest do
  use Easy.ConnCase, async: true

  alias Easy.Repo

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    colleague = insert(:coach, business: coach.business)
    other_client = insert(:client, business: coach.business, coach: colleague, timezone: "Etc/UTC")

    %{
      coach: coach,
      client: client,
      other_client: other_client,
      coach_conn: authenticate_coach(build_conn(), coach),
      client_conn: authenticate_client(build_conn(), client),
      unassigned_conn: authenticate_coach(build_conn(), colleague),
      foreign_conn: authenticate_coach(build_conn(), insert(:coach)),
      other_client_conn: authenticate_client(build_conn(), other_client)
    }
  end

  for {domain, factory} <- [{"training", :training_plan}, {"nutrition", :nutrition_plan}] do
    @domain domain
    @factory factory

    test "#{domain} plans deny foreign and unassigned coach reads, writes and assignment", f do
      template = insert(@factory, business: f.coach.business)
      plan = insert(@factory, business: f.coach.business, client: f.client)
      path = "/v1/coach/#{@domain}-plans/#{plan.id}"

      assert json_response(get(f.coach_conn, path), 200)["data"]["id"] == plan.id

      for conn <- [f.foreign_conn, f.unassigned_conn] do
        assert json_response(get(conn, path), 404)["error_code"] == "not_found"
        assert json_response(patch(conn, path, %{expected_revision: 1, name: "Denied"}), 404)["error_code"] == "not_found"
        assert response(post(conn, path <> "/archive", %{expected_revision: 1}), 404)
        assert response(get(conn, "/v1/coach/clients/#{f.client.id}/#{@domain}-plans"), 404)
        assert response(post(conn, "/v1/coach/clients/#{f.client.id}/#{@domain}-plans/#{template.id}/assign", %{}), 404)
      end

      assert json_response(get(f.coach_conn, path), 200)["data"]["name"] == plan.name
    end

    test "#{domain} clients can only list and read their own plans", f do
      plan = insert(@factory, business: f.coach.business, client: f.client)
      other = insert(@factory, business: f.coach.business, client: f.other_client)
      path = "/v1/client/#{@domain}-plans"
      assert json_response(get(f.client_conn, path), 200)["data"] |> Enum.map(& &1["id"]) == [plan.id]
      assert json_response(get(f.client_conn, path <> "/#{other.id}"), 404)["error_code"] == "not_found"
      assert response(get(f.other_client_conn, path <> "/#{plan.id}"), 404)
      assert response(get(f.client_conn, path <> "/#{Ecto.UUID.generate()}"), 404)
    end

    test "#{domain} publication conflicts return the observed revision and preserve the winning value", f do
      plan = insert(@factory, business: f.coach.business, client: f.client)
      path = "/v1/coach/#{@domain}-plans/#{plan.id}"
      assert json_response(patch(f.coach_conn, path, %{expected_revision: 1, name: "Winner"}), 200)["data"]["revision"] == 2
      error = json_response(patch(f.coach_conn, path, %{expected_revision: 1, name: "Lost"}), 409)
      assert error["error_code"] == "stale_revision"
      assert error["error_detail"]["current_revision"] == 2
      assert json_response(get(f.coach_conn, path), 200)["data"]["name"] == "Winner"
    end

    test "#{domain} template cursors return all matching rows once and reject malformed cursors", f do
      rows = for _ <- 1..3, do: insert(@factory, business: f.coach.business, name: "Matching")
      insert(@factory, business: f.coach.business, name: "Unrelated")
      path = "/v1/coach/#{@domain}-plans"
      first = json_response(get(f.coach_conn, path, %{search: "Matching", cursor: "start", limit: 2}), 200)
      second = json_response(get(f.coach_conn, path, %{search: "Matching", cursor: first["next_cursor"], limit: 2}), 200)
      assert first["count"] == 3
      assert length(first["data"]) == 2
      assert length(second["data"]) == 1
      assert second["next_cursor"] == nil
      assert MapSet.new(first["data"] ++ second["data"], & &1["id"]) == MapSet.new(rows, & &1.id)
      assert json_response(get(f.coach_conn, path, %{cursor: "invalid"}), 422)["error_detail"]["fields"]["cursor"] == ["is invalid"]
    end

    test "#{domain} invalid plan values and missing resources have public error envelopes", f do
      path = "/v1/coach/#{@domain}-plans"
      error = json_response(post(f.coach_conn, path, %{name: "", content: if(@domain == "training", do: Easy.Training.Content.empty(), else: Easy.Nutrition.Content.empty())}), 422)
      assert error["error_code"] == "invalid_input"
      assert error["error_detail"]["fields"]["name"] == ["can't be blank"]
      assert response(get(f.coach_conn, path <> "/#{Ecto.UUID.generate()}"), 404)
    end
  end

  test "session and set reads and writes cannot cross client or coach assignment boundaries", f do
    session = start_session(f.client_conn)

    set =
      json_response(post(f.client_conn, "/v1/client/training-sessions/#{session["id"]}/performed-sets", %{request_id: Ecto.UUID.generate(), exercise_name: "Squat", reps: 5}), 201)[
        "data"
      ]

    for conn <- [f.foreign_conn, f.unassigned_conn] do
      assert response(get(conn, "/v1/coach/clients/#{f.client.id}/training-sessions"), 404)
      assert response(get(conn, "/v1/coach/clients/#{f.client.id}/training-sessions/#{session["id"]}"), 404)
    end

    assert json_response(get(f.coach_conn, "/v1/coach/clients/#{f.client.id}/training-sessions/#{session["id"]}"), 200)["data"]["id"] == session["id"]
    assert response(get(f.other_client_conn, "/v1/client/training-sessions/#{session["id"]}"), 404)
    assert response(patch(f.other_client_conn, "/v1/client/training-sessions/#{session["id"]}", %{notes: "Denied"}), 404)
    assert response(post(f.other_client_conn, "/v1/client/training-sessions/#{session["id"]}/complete", %{}), 404)
    assert response(post(f.other_client_conn, "/v1/client/training-sessions/#{session["id"]}/performed-sets", %{request_id: Ecto.UUID.generate(), exercise_name: "Denied"}), 404)
    assert response(patch(f.other_client_conn, "/v1/client/training-performed-sets/#{set["id"]}", %{reps: 99}), 404)
    assert response(delete(f.other_client_conn, "/v1/client/training-performed-sets/#{set["id"]}"), 404)
    assert json_response(get(f.client_conn, "/v1/client/training-sessions/#{session["id"]}"), 200)["data"]["performed_sets"] |> hd() |> Map.get("reps") == 5
  end

  test "session history paginates on both client and coach routes", f do
    ids =
      for _ <- 1..3 do
        session = start_session(f.client_conn)
        assert response(post(f.client_conn, "/v1/client/training-sessions/#{session["id"]}/complete", %{}), 200)
        session["id"]
      end

    for {conn, path} <- [{f.client_conn, "/v1/client/training-sessions"}, {f.coach_conn, "/v1/coach/clients/#{f.client.id}/training-sessions"}] do
      first = json_response(get(conn, path, %{cursor: "start", limit: 2, state: "completed"}), 200)
      second = json_response(get(conn, path, %{cursor: first["next_cursor"], limit: 2, state: "completed"}), 200)
      assert first["count"] == 3
      assert second["next_cursor"] == nil
      assert MapSet.new(first["data"] ++ second["data"], & &1["id"]) == MapSet.new(ids)
      assert response(get(conn, path, %{cursor: "invalid"}), 422)
    end
  end

  test "session correction requires the current revision and invalid units return 422", f do
    session = start_session(f.client_conn)
    path = "/v1/client/training-sessions/#{session["id"]}"
    done = json_response(post(f.client_conn, path <> "/complete", %{expected_revision: 1}), 200)["data"]
    assert done["revision"] == 2
    error = json_response(patch(f.client_conn, path, %{expected_revision: 1, notes: "Stale"}), 409)
    assert error["error_code"] == "stale_revision"
    assert error["error_detail"]["current_revision"] == 2
    invalid_set = %{request_id: Ecto.UUID.generate(), exercise_name: "Squat", load_unit: "stone", load_value: 10}
    assert response(post(f.client_conn, path <> "/performed-sets", invalid_set), 422)
    assert response(get(f.client_conn, "/v1/client/training-sessions/#{Ecto.UUID.generate()}"), 404)
  end

  test "meal history and corrections cannot cross tenants or clients", f do
    meal = meal()
    path = "/v1/client/nutrition-days/#{Date.utc_today()}"
    assert response(patch(f.client_conn, path, %{meals: [meal]}), 200)

    for conn <- [f.foreign_conn, f.unassigned_conn] do
      assert response(get(conn, "/v1/coach/clients/#{f.client.id}/nutrition-days"), 404)
      assert response(get(conn, "/v1/coach/clients/#{f.client.id}/nutrition-food-metrics"), 404)
    end

    denied = %{meal | expected_revision: 1, request_id: Ecto.UUID.generate(), name: "Denied"}
    assert json_response(patch(f.other_client_conn, path, %{meals: [denied]}), 409)["error_code"] == "conflict"

    day = json_response(get(f.client_conn, "/v1/client/nutrition-days", %{date: Date.to_iso8601(Date.utc_today())}), 200)["data"] |> hd()
    assert hd(day["extra_meals"])["name"] == "Snack"
    other = json_response(get(f.other_client_conn, "/v1/client/nutrition-days", %{date: Date.to_iso8601(Date.utc_today())}), 200)["data"] |> hd()
    assert other["extra_meals"] == []
  end

  test "meal validation and stale revisions return stable error envelopes", f do
    meal = meal()
    path = "/v1/client/nutrition-days/#{Date.utc_today()}"
    assert response(patch(f.client_conn, path, %{meals: [meal]}), 200)
    stale = %{meal | request_id: Ecto.UUID.generate(), name: "Stale"}
    assert json_response(patch(f.client_conn, path, %{meals: [stale]}), 409)["error_code"] == "conflict"
    [entry] = meal.entries
    invalid_entry = %{entry | nutrients: %{protein_g: 10}}
    invalid = %{meal | id: Ecto.UUID.generate(), request_id: Ecto.UUID.generate(), entries: [invalid_entry]}
    error = json_response(patch(f.client_conn, path, %{meals: [invalid]}), 422)
    assert error["error_detail"]["fields"]["nutrients"] == ["quick add requires a name and energy_kcal"]
  end

  test "write gate requires today's term as well as coverage of the path date", f do
    today = Date.utc_today()
    Repo.query!("UPDATE coaching_terms SET starts_on=$1 WHERE client_id=$2", [today, Ecto.UUID.dump!(f.client.id)])
    assert json_response(patch(f.client_conn, "/v1/client/nutrition-days/#{Date.add(today, -1)}", %{meals: []}), 403)["error_code"] == "coaching_required"
    assert response(patch(f.client_conn, "/v1/client/nutrition-days/#{today}", %{meals: [meal()]}), 200)
    Repo.query!("UPDATE coaching_terms SET starts_on=$1, ends_on=$2 WHERE client_id=$3", [Date.add(today, -10), Date.add(today, -1), Ecto.UUID.dump!(f.client.id)])
    assert json_response(patch(f.client_conn, "/v1/client/nutrition-days/#{Date.add(today, -1)}", %{meals: []}), 403)["error_code"] == "coaching_required"
    assert json_response(post(f.client_conn, "/v1/client/training-sessions", %{}), 403)["error_code"] == "coaching_required"
    assert response(get(f.client_conn, "/v1/client/nutrition-days"), 200)
  end

  defp start_session(conn), do: json_response(post(conn, "/v1/client/training-sessions", %{request_id: Ecto.UUID.generate()}), 201)["data"]

  defp meal do
    entry = %{
      id: Ecto.UUID.generate(),
      request_id: Ecto.UUID.generate(),
      planned_item_id: nil,
      source: nil,
      portion: nil,
      name: "Apple",
      nutrients: %{energy_kcal: 90}
    }

    %{
      id: Ecto.UUID.generate(),
      request_id: Ecto.UUID.generate(),
      expected_revision: 0,
      plan_revision_id: nil,
      slot_id: nil,
      chosen_meal_id: nil,
      name: "Snack",
      entries: [entry]
    }
  end
end
