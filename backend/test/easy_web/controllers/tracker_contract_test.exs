defmodule EasyWeb.TrackerContractTest do
  alias Easy.CoachingTerms.CoachingTerm
  alias Easy.Ctx
  alias Easy.Repo
  alias Easy.Trackers
  alias Easy.Trackers.Defaults
  use Easy.ConnCase, async: false
  import Ecto.Query

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    colleague = insert(:coach, business: coach.business)
    other = insert(:client, business: coach.business, coach: colleague)
    ctx = %Ctx{business_id: coach.business_id, user_id: coach.user_id, coach_id: coach.id}
    {:ok, _} = Defaults.seed_builtins()

    %{
      coach: coach,
      client: client,
      other: other,
      ctx: ctx,
      coach_conn: authenticate_coach(build_conn(), coach),
      client_conn: authenticate_client(build_conn(), client),
      other_conn: authenticate_client(build_conn(), other),
      unassigned_conn: authenticate_coach(build_conn(), colleague),
      foreign_conn: authenticate_coach(build_conn(), insert(:coach))
    }
  end

  defp tracker(conn, kind \\ "text", extra \\ %{}), do: json_response(post(conn, "/v1/coach/trackers", Map.merge(%{name: "Custom tracker", kind: kind}, extra)), 201)["data"]
  defp attrs(tracker, values), do: Map.merge(%{tracker_id: tracker["id"], request_id: Ecto.UUID.generate(), local_date: Date.utc_today()}, values)

  test "library validates wire fields, metadata, fixed definitions and tenant isolation", f do
    row = tracker(f.coach_conn, "number", %{base_unit: "cups"})
    assert row["units"] == [%{"unit" => "cups", "to_base_factor" => 1.0}]
    assert row["built_in"] == false
    assert response(patch(f.coach_conn, "/v1/coach/trackers/#{row["id"]}", %{name: "Changed", kind: "rating"}), 422)
    assert response(post(f.coach_conn, "/v1/coach/trackers", %{name: "Missing scale", kind: "rating"}), 422)

    for conn <- [f.foreign_conn] do
      assert response(get(conn, "/v1/coach/trackers/#{row["id"]}"), 404)
      assert response(patch(conn, "/v1/coach/trackers/#{row["id"]}", %{name: "Denied"}), 404)
      assert response(post(conn, "/v1/coach/trackers/#{row["id"]}/archive", %{}), 404)
      assert response(delete(conn, "/v1/coach/trackers/#{row["id"]}"), 404)
    end

    assert response(get(f.client_conn, "/v1/client/trackers/#{row["id"]}"), 200)
    first = json_response(get(f.client_conn, "/v1/client/trackers", %{limit: 1, cursor: "start"}), 200)
    assert first["count"] == 18 && is_binary(first["next_cursor"])
    assert response(get(f.client_conn, "/v1/client/trackers", %{cursor: first["next_cursor"], limit: 1}), 200)
    assert response(get(f.client_conn, "/v1/client/trackers", %{cursor: "bad"}), 422)
    assert response(post(f.coach_conn, "/v1/coach/trackers/#{row["id"]}/archive", %{}), 200)
    assert json_response(get(f.client_conn, "/v1/client/trackers", %{archived: true}), 200)["count"] == 1
    assert response(post(f.coach_conn, "/v1/coach/trackers/#{row["id"]}/restore", %{}), 200)
    assert response(delete(f.coach_conn, "/v1/coach/trackers/#{row["id"]}"), 204)
  end

  test "all entry kinds return complete JSON and invalid values fail", f do
    for {kind, extra, values, expected_key, expected_value} <- [
          {"number", %{base_unit: "cups"}, %{number_value: 2.5, entered_unit: "cups"}, "number_value", 2.5},
          {"rating", %{scale_max: 5}, %{rating_value: 3}, "rating_value", 3},
          {"yes_no", %{}, %{yes_no_value: false}, "yes_no_value", false},
          {"text", %{}, %{text_value: "A good day"}, "text_value", "A good day"}
        ] do
      tracker = tracker(f.coach_conn, kind, extra)
      row = json_response(post(f.client_conn, "/v1/client/tracker-entries", attrs(tracker, values)), 201)["data"]
      assert row[expected_key] == expected_value
      assert row["tracker"]["kind"] == kind
      assert row["recorded_by_type"] == "client" && row["recorded_by_id"] == f.client.id
      assert row["attachments"] == []
      assert Map.has_key?(row, "about_session_id") && row["revision"] == 1
    end

    for kind <- ["photo", "document"] do
      tracker = tracker(f.coach_conn, kind)

      media =
        insert(:attachment,
          client: f.client,
          business: f.coach.business,
          content_type: if(kind == "document", do: "application/pdf", else: "image/jpeg"),
          captured_on: Date.utc_today()
        )

      row = json_response(post(f.client_conn, "/v1/client/tracker-entries", attrs(tracker, %{attachment_ids: [media.id]})), 201)["data"]
      assert hd(row["attachments"])["captured_on"] == Date.to_iso8601(Date.utc_today())
      assert hd(row["attachments"])["position"] == 0
    end

    row = tracker(f.coach_conn, "rating", %{scale_max: 5})
    error = json_response(post(f.client_conn, "/v1/client/tracker-entries", attrs(row, %{rating_value: 9})), 422)
    assert error["error_code"] == "invalid_input"
    assert response(post(f.client_conn, "/v1/client/tracker-entries", attrs(row, %{rating_value: 2, business_id: Ecto.UUID.generate()})), 422)
  end

  test "coach entries corrections deletion conflicts and pagination are typed", f do
    tracker = tracker(f.coach_conn)
    path = "/v1/coach/clients/#{f.client.id}/tracker-entries"
    attrs = attrs(tracker, %{text_value: "Original"})
    row = json_response(post(f.coach_conn, path, attrs), 201)["data"]
    assert row["recorded_by_type"] == "coach" && row["recorded_by_id"] == f.coach.id
    assert json_response(post(f.coach_conn, path, attrs), 201)["data"]["id"] == row["id"]
    correction = %{request_id: Ecto.UUID.generate(), expected_revision: 1, local_date: Date.utc_today(), text_value: "Corrected"}
    assert json_response(patch(f.coach_conn, path <> "/#{row["id"]}", correction), 200)["data"]["text_value"] == "Corrected"
    assert response(patch(f.coach_conn, path <> "/#{row["id"]}", %{correction | request_id: Ecto.UUID.generate()}), 409)
    for _ <- 1..2, do: assert(response(post(f.coach_conn, path, attrs(tracker, %{text_value: "Another"})), 201))
    first = json_response(get(f.client_conn, "/v1/client/tracker-entries", %{cursor: "start", limit: 2}), 200)
    second = json_response(get(f.client_conn, "/v1/client/tracker-entries", %{cursor: first["next_cursor"], limit: 2}), 200)
    assert first["count"] == 3 && length(second["data"]) == 1
    assert response(delete(f.coach_conn, path <> "/#{row["id"]}?expected_revision=1"), 409)
    assert response(delete(f.coach_conn, path <> "/#{row["id"]}?expected_revision=2"), 204)
    assert response(delete(f.coach_conn, path <> "/#{row["id"]}?expected_revision=2"), 204)
    assert response(patch(f.other_conn, "/v1/client/tracker-entries/#{row["id"]}", correction), 404)
    assert response(delete(f.other_conn, "/v1/client/tracker-entries/#{row["id"]}?expected_revision=2"), 404)
  end

  test "all client-scoped reads and writes deny foreign and unassigned coaches", f do
    tracker = tracker(f.coach_conn)
    prefix = "/v1/coach/clients/#{f.client.id}"
    assignment = json_response(post(f.coach_conn, prefix <> "/tracker-assignments", %{tracker_id: tracker["id"], timing: "daily"}), 201)["data"]
    request = json_response(post(f.coach_conn, prefix <> "/tracker-requests", %{tracker_id: tracker["id"]}), 201)["data"]

    for conn <- [f.foreign_conn, f.unassigned_conn] do
      for path <- ["/tracker-entries", "/tracker-assignments", "/tracker-requests", "/tracker-today", "/trackers/#{tracker["id"]}/metrics"] do
        assert response(get(conn, prefix <> path), 404)
      end

      assert response(post(conn, prefix <> "/tracker-entries", attrs(tracker, %{text_value: "Denied"})), 404)
      assert response(post(conn, prefix <> "/tracker-assignments", %{tracker_id: tracker["id"], timing: "daily"}), 404)
      assert response(patch(conn, prefix <> "/tracker-assignments/#{assignment["id"]}", %{timing: "weekly", weekday: 6}), 404)
      assert response(delete(conn, prefix <> "/tracker-assignments/#{assignment["id"]}"), 404)
      assert response(post(conn, prefix <> "/tracker-requests", %{tracker_id: tracker["id"]}), 404)
      assert response(delete(conn, prefix <> "/tracker-requests/#{request["id"]}"), 404)
    end

    assert json_response(get(f.client_conn, "/v1/client/tracker-today"), 200)["data"]["due"] |> length() == 1
    assert json_response(get(f.client_conn, "/v1/client/tracker-requests"), 200)["data"] |> length() == 1
    assert json_response(get(f.other_conn, "/v1/client/tracker-today"), 200)["data"]["due"] == []
  end

  test "templates reuse shared revision checks and apply with complete assignment metadata", f do
    tracker = tracker(f.coach_conn)

    content = %{items: [%{tracker_id: tracker["id"], timing: "weekly", weekday: 6}]}
    template = json_response(post(f.coach_conn, "/v1/coach/tracker-templates", %{name: "Routine", content: content}), 201)["data"]

    assert template["revision"] == 1
    assert json_response(get(f.coach_conn, "/v1/coach/tracker-templates", %{cursor: "start", limit: 1}), 200)["count"] == 1
    assert response(patch(f.coach_conn, "/v1/coach/tracker-templates/#{template["id"]}", %{expected_revision: 1, name: "Renamed"}), 200)
    assert response(patch(f.coach_conn, "/v1/coach/tracker-templates/#{template["id"]}", %{expected_revision: 1, name: "Stale"}), 409)
    apply_path = "/v1/coach/clients/#{f.client.id}/tracker-templates/#{template["id"]}/apply"
    assert response(post(f.coach_conn, apply_path, %{expected_revision: 1}), 409)
    result = json_response(post(f.coach_conn, apply_path, %{expected_revision: 2}), 200)["data"] |> hd()
    assert result["tracker"]["name"] == tracker["name"] && result["weekday"] == 6
    assert response(post(f.unassigned_conn, apply_path, %{expected_revision: 2}), 404)
    assert response(get(f.foreign_conn, "/v1/coach/tracker-templates/#{template["id"]}"), 404)
    assert response(get(f.coach_conn, "/v1/coach/tracker-settings"), 200)
    assert response(patch(f.coach_conn, "/v1/coach/tracker-settings", %{default_tracker_template_id: template["id"]}), 403)
  end

  test "metrics and completed-event prompt routes return server values and deny other clients", f do
    tracker = tracker(f.coach_conn, "rating", %{scale_max: 5})
    prefix = "/v1/coach/clients/#{f.client.id}"
    assert response(post(f.coach_conn, prefix <> "/tracker-assignments", %{tracker_id: tracker["id"], timing: "after_workout"}), 201)
    session = insert(:workout_session, business: f.coach.business, client: f.client, state: :completed)
    assert length(json_response(get(f.client_conn, "/v1/client/tracker-prompts", %{about_session_id: session.id}), 200)["data"]) == 1
    assert response(get(f.other_conn, "/v1/client/tracker-prompts", %{about_session_id: session.id}), 404)
    assert response(get(f.client_conn, "/v1/client/tracker-prompts", %{}), 422)
    assert response(post(f.client_conn, "/v1/client/tracker-entries", attrs(tracker, %{rating_value: 4, about_session_id: session.id})), 201)
    metrics = json_response(get(f.client_conn, "/v1/client/trackers/#{tracker["id"]}/metrics"), 200)["data"]
    assert metrics["workout_coverage"] == %{"recorded" => 1, "total" => 1}
    assert metrics["average"] == 4.0 && metrics["latest"]["rating_value"] == 4
  end

  test "ended coaching blocks client writes while history stays readable", f do
    tracker = tracker(f.coach_conn)
    Repo.update_all(from(t in CoachingTerm, where: t.client_id == ^f.client.id), set: [ends_on: Date.add(Date.utc_today(), -1)])
    assert json_response(post(f.client_conn, "/v1/client/tracker-entries", attrs(tracker, %{text_value: "Denied"})), 403)["error_code"] == "coaching_required"
    assert response(get(f.client_conn, "/v1/client/tracker-entries"), 200)
    assert json_response(get(f.client_conn, "/v1/client/tracker-today"), 200)["data"]["due"] == []
    assert {:ok, _} = Trackers.create_tracker(f.ctx, %{name: "Allowed", kind: :text})
  end
end
