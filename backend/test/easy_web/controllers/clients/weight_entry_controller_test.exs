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

    conn = build_conn() |> authenticate_client(client)

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

      assert %{"entries" => entries, "goal" => goal, "summary" => summary} =
               json_response(conn, 200)

      assert length(entries) == 2
      assert hd(entries)["date"] == "2026-03-01"
      assert List.last(entries)["note"] == "morning weigh-in"
      assert goal == %{"value" => "88.00", "unit" => "kg"}
      assert summary["first_entry"]["date"] == "2026-03-01"
      assert summary["latest_entry"]["date"] == "2026-04-20"
      assert summary["change_unit"] == "kg"
      assert summary["total_change"] == -3.8
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
