defmodule EasyWeb.Clients.WeightEntryControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)

    client =
      insert(:client,
        creator: coach,
        business: coach.business,
        goal_weight_value: Decimal.new("88.00"),
        goal_weight_unit: :kg
      )

    conn =
      build_conn()
      |> put_req_header("content-type", "application/json")
      |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/client/weight_entries" do
    test "lists entries with goal and summary", ctx do
      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-03-01],
        value: Decimal.new("95.20")
      )

      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-04-20],
        value: Decimal.new("91.40"),
        note: "morning weigh-in"
      )

      conn = get(ctx.conn, "/v1/client/weight_entries")

      assert %{
               "entries" => entries,
               "goal" => goal,
               "summary" => summary,
               "adherence" => adherence
             } =
               json_response(conn, 200)

      assert length(entries) == 2
      assert hd(entries)["date"] == "2026-03-01"
      assert List.last(entries)["note"] == "morning weigh-in"
      assert goal == %{"value" => "88.00", "unit" => "kg"}
      assert summary["first_entry"]["date"] == "2026-03-01"
      assert summary["latest_entry"]["date"] == "2026-04-20"
      assert summary["change_unit"] == "kg"
      assert summary["total_change"] == -3.8
      assert adherence == %{"logged_days" => 0, "window_days" => 30}
    end

    test "filters by since", ctx do
      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-03-01],
        value: Decimal.new("95.20")
      )

      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-04-20],
        value: Decimal.new("91.40")
      )

      conn = get(ctx.conn, "/v1/client/weight_entries", %{"since" => "2026-04-01"})
      assert %{"entries" => [entry]} = json_response(conn, 200)
      assert entry["date"] == "2026-04-20"
    end

    test "summary converts mixed units to the latest entry's unit", ctx do
      # First entry in lbs, latest in kg — summary should report kg.
      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-03-01],
        value: Decimal.new("210.00"),
        unit: :lbs
      )

      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-04-20],
        value: Decimal.new("91.40"),
        unit: :kg
      )

      conn = get(ctx.conn, "/v1/client/weight_entries")
      assert %{"summary" => summary} = json_response(conn, 200)

      assert summary["change_unit"] == "kg"
      assert summary["first_entry"]["unit"] == "kg"
      assert summary["latest_entry"]["unit"] == "kg"
      # 210 lbs / 2.20462 = 95.25... kg
      assert Decimal.eq?(Decimal.new(summary["first_entry"]["value"]), Decimal.new("95.25"))
      assert Decimal.eq?(Decimal.new(summary["latest_entry"]["value"]), Decimal.new("91.40"))
      # total_change = 91.40 - 95.25 = -3.85
      assert summary["total_change"] == -3.85
    end

    test "summary is correct even when entries arrive out of order", ctx do
      # Force a specific ordering via ID; the JSON view should compute
      # first/latest from the data, not list position.
      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-04-20],
        value: Decimal.new("91.40")
      )

      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: ~D[2026-03-01],
        value: Decimal.new("95.20")
      )

      conn = get(ctx.conn, "/v1/client/weight_entries")
      assert %{"summary" => summary} = json_response(conn, 200)
      assert summary["first_entry"]["date"] == "2026-03-01"
      assert summary["latest_entry"]["date"] == "2026-04-20"
    end

    test "returns empty response when no entries exist", ctx do
      conn = get(ctx.conn, "/v1/client/weight_entries")

      assert %{
               "entries" => [],
               "goal" => %{"value" => "88.00", "unit" => "kg"},
               "summary" => %{
                 "first_entry" => nil,
                 "latest_entry" => nil,
                 "total_change" => nil,
                 "change_unit" => nil
               }
             } = json_response(conn, 200)
    end

    test "returns 422 for invalid since", ctx do
      conn = get(ctx.conn, "/v1/client/weight_entries", %{"since" => "bad-date"})
      assert json_response(conn, 422)
    end

    test "returns 422 for an unknown query parameter", ctx do
      conn = get(ctx.conn, "/v1/client/weight_entries", %{"unexpected" => "value"})
      assert json_response(conn, 422)
    end
  end

  describe "POST /v1/client/weight_entries" do
    test "creates a new entry", ctx do
      conn =
        post(ctx.conn, "/v1/client/weight_entries", %{
          "date" => "2026-04-22",
          "value" => 91.4,
          "unit" => "kg",
          "note" => "morning"
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["date"] == "2026-04-22"
      assert Decimal.eq?(Decimal.new(data["value"]), Decimal.new("91.40"))
      assert data["unit"] == "kg"
      assert data["note"] == "morning"
    end

    test "upserts an existing date", ctx do
      existing =
        insert(:weight_entry,
          client: ctx.client,
          business: ctx.business,
          date: ~D[2026-04-22],
          value: Decimal.new("92.10")
        )

      conn =
        post(ctx.conn, "/v1/client/weight_entries", %{
          "date" => "2026-04-22",
          "value" => 91.4,
          "unit" => "kg",
          "note" => "updated"
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["id"] == existing.id
      assert Decimal.eq?(Decimal.new(data["value"]), Decimal.new("91.40"))
      assert data["note"] == "updated"
    end

    test "returns 422 for invalid input", ctx do
      conn =
        post(ctx.conn, "/v1/client/weight_entries", %{
          "date" => "bad-date",
          "value" => 0,
          "unit" => "kg"
        })

      assert json_response(conn, 422)
    end

    test "returns 422 for an unknown body field", ctx do
      conn =
        post(ctx.conn, "/v1/client/weight_entries", %{
          "date" => "2026-04-22",
          "value" => 91.4,
          "unit" => "kg",
          "unexpected" => true
        })

      assert json_response(conn, 422)
    end

    test "returns 422 for a future date beyond the timezone buffer", ctx do
      conn =
        post(ctx.conn, "/v1/client/weight_entries", %{
          "date" => Date.utc_today() |> Date.add(2) |> Date.to_iso8601(),
          "value" => 91.4,
          "unit" => "kg"
        })

      assert %{"error_detail" => %{"fields" => %{"date" => ["cannot be in the future"]}}} =
               json_response(conn, 422)
    end

    test "returns 403 without auth" do
      conn = build_conn() |> post("/v1/client/weight_entries", %{})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/weight-entry" do
    test "reads only the authenticated client's self-recorded measurement for that date", ctx do
      today = Date.utc_today()
      other = insert(:client, creator: ctx.coach, business: ctx.business)
      insert(:weight_entry, client: other, business: ctx.business, date: today)
      insert(:weight_entry)
      template = insert(:form_template, business: ctx.business)
      assignment = insert(:form_assignment, business: ctx.business, client: ctx.client, form_template: template)
      submission = insert(:form_submission, business: ctx.business, client: ctx.client, form_assignment: assignment)
      form_entry = insert(:weight_entry, business: ctx.business, client: ctx.client, date: today, form_submission: submission)
      assert %{"data" => nil} = ctx.conn |> get("/v1/client/weight-entry", %{date: Date.to_iso8601(today)}) |> json_response(200)
      attrs = %{date: Date.to_iso8601(today), value: 80, unit: "kg", expected_entry: nil}
      created = ctx.conn |> recycle() |> post("/v1/client/weight_entries", attrs) |> json_response(201) |> Map.fetch!("data")
      assert created["id"] != form_entry.id
      response = ctx.conn |> recycle() |> get("/v1/client/weight-entry", %{date: Date.to_iso8601(today)}) |> json_response(200)
      assert response["data"]["id"] == created["id"]
      assert response["data"]["revision"] == 1
      assert %{"data" => nil} = ctx.conn |> recycle() |> get("/v1/client/weight-entry", %{date: Date.add(today, -1) |> Date.to_iso8601()}) |> json_response(200)
      assert Easy.Repo.reload!(form_entry).form_submission_id == submission.id
      progress = ctx.conn |> recycle() |> get("/v1/client/weight-progress") |> json_response(200)
      derived = Enum.find(progress["data"], &(&1["id"] == form_entry.id))
      assert derived["form_assignment_id"] == assignment.id
      self_recorded = Enum.find(progress["data"], &(&1["id"] == created["id"]))
      assert self_recorded["form_assignment_id"] == nil
    end

    test "requires a valid date and disallows caller-selected identity", ctx do
      for params <- [%{}, %{date: "bad"}, %{date: Date.to_iso8601(Date.utc_today()), client_id: Ecto.UUID.generate()}] do
        assert ctx.conn |> recycle() |> get("/v1/client/weight-entry", params) |> json_response(422)
      end

      assert build_conn() |> get("/v1/client/weight-entry", %{date: Date.to_iso8601(Date.utc_today())}) |> json_response(403)
    end
  end

  describe "observed weight writes" do
    test "rejects stale creation, edits and deletion without changing saved content", ctx do
      attrs = %{date: Date.to_iso8601(Date.utc_today()), value: 80, unit: "kg", note: "morning", expected_entry: nil}
      created = ctx.conn |> post("/v1/client/weight_entries", attrs) |> json_response(201) |> Map.fetch!("data")
      assert created["revision"] == 1
      assert ctx.conn |> recycle() |> post("/v1/client/weight_entries", %{attrs | value: 81}) |> json_response(409)
      expected = %{id: created["id"], revision: created["revision"]}
      edit = %{attrs | value: 82, expected_entry: expected}
      updated = ctx.conn |> recycle() |> post("/v1/client/weight_entries", edit) |> json_response(201) |> Map.fetch!("data")
      assert updated["id"] == created["id"]
      assert updated["revision"] == 2
      assert ctx.conn |> recycle() |> post("/v1/client/weight_entries", %{edit | value: 83}) |> json_response(409)
      path = "/v1/client/weight_entries/#{created["id"]}"
      assert ctx.conn |> recycle() |> delete(path <> "?expected_revision=1") |> json_response(409)
      saved = Easy.Repo.get!(Easy.Fitness.WeightEntry, created["id"])
      assert Decimal.eq?(saved.value, Decimal.new("82"))
      assert saved.revision == 2
      assert ctx.conn |> recycle() |> delete(path <> "?expected_revision=2") |> response(204)
      assert ctx.conn |> recycle() |> post("/v1/client/weight_entries", edit) |> json_response(409)
      replacement = ctx.conn |> recycle() |> post("/v1/client/weight_entries", attrs) |> json_response(201) |> Map.fetch!("data")
      assert replacement["id"] != created["id"]
      assert replacement["revision"] == 1
      assert ctx.conn |> recycle() |> post("/v1/client/weight_entries", edit) |> json_response(409)
    end

    test "validates expected identity and revision without accepting a caller-set revision", ctx do
      attrs = %{date: Date.to_iso8601(Date.utc_today()), value: 80, unit: "kg"}

      expectations = [%{id: "bad", revision: 1}, %{id: Ecto.UUID.generate(), revision: 0}, %{id: Ecto.UUID.generate()}, "bad"]

      for expected <- expectations do
        invalid = Map.put(attrs, :expected_entry, expected)
        assert ctx.conn |> recycle() |> post("/v1/client/weight_entries", invalid) |> json_response(422)
      end

      assert ctx.conn |> recycle() |> post("/v1/client/weight_entries", Map.put(attrs, :revision, 10)) |> json_response(422)
      entry = insert(:weight_entry, client: ctx.client, business: ctx.business, date: Date.utc_today())

      for revision <- [0, -1, "bad"] do
        assert ctx.conn |> recycle() |> delete("/v1/client/weight_entries/#{entry.id}?expected_revision=#{revision}") |> json_response(422)
      end

      assert Easy.Repo.reload!(entry).revision == 1
    end
  end

  describe "DELETE /v1/client/weight_entries/:id" do
    test "deletes an owned entry", ctx do
      entry = insert(:weight_entry, client: ctx.client, business: ctx.business)

      conn = delete(ctx.conn, "/v1/client/weight_entries/#{entry.id}")
      assert response(conn, 204)
      assert Easy.Repo.get(Easy.Fitness.WeightEntry, entry.id) == nil
    end

    test "returns 404 for another client's entry", ctx do
      other_client = insert(:client, creator: ctx.coach, business: ctx.business)
      entry = insert(:weight_entry, client: other_client, business: ctx.business)

      conn = delete(ctx.conn, "/v1/client/weight_entries/#{entry.id}")
      assert json_response(conn, 404)
    end
  end
end
