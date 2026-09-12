defmodule EasyWeb.Coaches.ClientWeightEntryControllerTest do
  use Easy.ConnCase

  alias Easy.Repo

  setup do
    coach = insert(:coach)

    client =
      insert(:client,
        creator: coach,
        business: coach.business,
        goal_weight_value: Decimal.new("88.00"),
        goal_weight_unit: :kg
      )

    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/coach/clients/:client_id/weight_entries" do
    test "lists entries with goal, summary, and adherence", ctx do
      today = Date.utc_today()

      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: Date.add(today, -10),
        value: Decimal.new("95.20")
      )

      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: today,
        value: Decimal.new("91.40")
      )

      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: Date.add(today, -40),
        value: Decimal.new("96.10")
      )

      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/weight_entries")

      assert %{
               "entries" => entries,
               "goal" => goal,
               "summary" => summary,
               "adherence" => adherence
             } = json_response(conn, 200)

      assert length(entries) == 3
      assert goal == %{"value" => "88.00", "unit" => "kg"}
      assert summary["latest_entry"]["date"] == Date.to_iso8601(today)
      assert adherence == %{"logged_days" => 2, "window_days" => 30}
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

      conn =
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/weight_entries", %{
          "since" => "2026-04-01"
        })

      assert %{"entries" => [entry]} = json_response(conn, 200)
      assert entry["date"] == "2026-04-20"
    end

    test "returns empty state payload when no entries exist", ctx do
      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/weight_entries")

      assert %{
               "entries" => [],
               "goal" => %{"value" => "88.00", "unit" => "kg"},
               "summary" => %{
                 "first_entry" => nil,
                 "latest_entry" => nil,
                 "total_change" => nil,
                 "change_unit" => nil
               },
               "adherence" => %{"logged_days" => 0, "window_days" => 30}
             } = json_response(conn, 200)
    end

    test "returns 404 for a client in another business", ctx do
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)

      conn = get(ctx.conn, "/v1/coach/clients/#{other_client.id}/weight_entries")
      assert json_response(conn, 404)
    end

    test "returns 422 for invalid since", ctx do
      conn =
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/weight_entries", %{
          "since" => "bad-date"
        })

      assert json_response(conn, 422)
    end

    test "returns 422 for an unknown query parameter", ctx do
      conn =
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/weight_entries", %{
          "unexpected" => "value"
        })

      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/clients/:client_id/weight-progress" do
    test "pages newest entries and continues after a deleted cursor anchor", ctx do
      entries =
        for day <- 0..2 do
          insert(:weight_entry,
            client: ctx.client,
            business: ctx.business,
            date: Date.add(Date.utc_today(), -day),
            value: Decimal.new("#{90 + day}.00")
          )
        end

      first =
        ctx.conn
        |> get("/v1/coach/clients/#{ctx.client.id}/weight-progress", %{"cursor" => "start", "limit" => "1"})
        |> json_response(200)

      assert %{"data" => [first_entry], "count" => 3, "next_cursor" => cursor} = first
      assert is_binary(cursor)
      assert first_entry["date"] == Date.to_iso8601(Date.utc_today())

      Repo.delete!(Repo.get!(Easy.Fitness.WeightEntry, first_entry["id"]))

      second =
        ctx.conn
        |> recycle()
        |> get("/v1/coach/clients/#{ctx.client.id}/weight-progress", %{"cursor" => cursor, "limit" => "10"})
        |> json_response(200)

      assert %{"data" => remaining, "count" => 2, "next_cursor" => nil} = second
      assert Enum.sort([first_entry["id"] | Enum.map(remaining, & &1["id"])]) == Enum.sort(Enum.map(entries, & &1.id))
    end

    test "keeps summary independent of the page and converts mixed-unit measurements", ctx do
      oldest = Date.add(Date.utc_today(), -2)
      latest = Date.utc_today()

      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: oldest,
        value: Decimal.new("100.00"),
        unit: :kg
      )

      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: latest,
        value: Decimal.new("220.00"),
        unit: :lbs
      )

      response =
        ctx.conn
        |> get("/v1/coach/clients/#{ctx.client.id}/weight-progress", %{
          "cursor" => "start",
          "limit" => "1",
          "unit" => "kg"
        })
        |> json_response(200)

      assert %{"data" => [_], "unit" => "kg", "goal" => %{"unit" => "kg"}, "summary" => summary, "chart" => chart} = response
      assert summary["first_entry"] == %{"date" => Date.to_iso8601(oldest), "value" => "100.00", "unit" => "kg"}
      assert summary["latest_entry"] == %{"date" => Date.to_iso8601(latest), "value" => "99.79", "unit" => "kg"}
      assert summary["total_change"] == -0.21
      assert summary["change_unit"] == "kg"
      assert Enum.map(chart["points"], & &1["value"]) == [100.0, 99.79]
    end

    test "orders same-day form measurements by insertion then id and charts the latest one", ctx do
      timestamp = DateTime.add(DateTime.utc_now(:second), -1, :hour)
      today = Date.utc_today()

      previous =
        insert(:weight_entry,
          client: ctx.client,
          business: ctx.business,
          form_submission: form_submission_for(ctx.client, ctx.business),
          date: Date.add(today, -1),
          value: Decimal.new("79.00")
        )

      older_same_day =
        insert(:weight_entry,
          id: "00000000-0000-0000-0000-000000000001",
          client: ctx.client,
          business: ctx.business,
          form_submission: form_submission_for(ctx.client, ctx.business),
          date: today,
          inserted_at: timestamp,
          value: Decimal.new("80.00")
        )

      latest_same_day =
        insert(:weight_entry,
          id: "00000000-0000-0000-0000-000000000002",
          client: ctx.client,
          business: ctx.business,
          form_submission: form_submission_for(ctx.client, ctx.business),
          date: today,
          inserted_at: timestamp,
          value: Decimal.new("81.00")
        )

      response =
        ctx.conn
        |> get("/v1/coach/clients/#{ctx.client.id}/weight-progress", %{"cursor" => "start", "limit" => "10"})
        |> json_response(200)

      assert Enum.map(response["data"], & &1["id"]) == [latest_same_day.id, older_same_day.id, previous.id]
      assert response["summary"]["latest_entry"] == %{"date" => Date.to_iso8601(today), "value" => "81.00", "unit" => "kg"}
      assert Enum.map(response["chart"]["points"], & &1["id"]) == [previous.id, latest_same_day.id]
    end

    test "uses a stable chart scale for empty and constant history", ctx do
      empty = ctx.conn |> get("/v1/coach/clients/#{ctx.client.id}/weight-progress") |> json_response(200)
      assert %{"data" => [], "chart" => %{"points" => [], "min" => nil, "max" => nil}} = empty

      insert(:weight_entry,
        client: ctx.client,
        business: ctx.business,
        date: Date.utc_today(),
        value: Decimal.new("82.00")
      )

      constant = ctx.conn |> recycle() |> get("/v1/coach/clients/#{ctx.client.id}/weight-progress") |> json_response(200)
      assert %{"chart" => %{"points" => [%{"value" => 82.0}], "min" => 81.5, "max" => 82.5}} = constant
    end

    test "caps pages and rejects malformed query values and date bounds", ctx do
      for day <- 0..100 do
        insert(:weight_entry,
          client: ctx.client,
          business: ctx.business,
          date: Date.add(Date.utc_today(), -day),
          value: Decimal.new("80.00")
        )
      end

      capped =
        ctx.conn
        |> get("/v1/coach/clients/#{ctx.client.id}/weight-progress", %{
          "from" => Date.add(Date.utc_today(), -365) |> Date.to_iso8601(),
          "to" => Date.utc_today() |> Date.to_iso8601(),
          "cursor" => "start",
          "limit" => "1000"
        })
        |> json_response(200)

      assert %{"data" => data, "count" => 101, "next_cursor" => cursor} = capped
      assert length(data) == 100
      assert is_binary(cursor)

      for params <- [
            %{"cursor" => "not-a-cursor"},
            %{"unit" => "stone"},
            %{"from" => "not-a-date"},
            %{"from" => "2026-08-12", "to" => "2026-08-10"},
            %{"from" => "2025-01-01", "to" => "2026-02-01"}
          ] do
        assert json_response(ctx.conn |> recycle() |> get("/v1/coach/clients/#{ctx.client.id}/weight-progress", params), 422)
      end
    end

    test "validates client ids and conceals other trainers and tenants", ctx do
      assert ctx.conn
             |> get("/v1/coach/clients/not-a-uuid/weight-progress")
             |> json_response(422)

      other_coach = insert(:coach, business: ctx.business)

      other_client =
        insert(:client,
          creator: other_coach,
          assigned_coach: other_coach,
          business: ctx.business
        )

      assert ctx.conn
             |> recycle()
             |> get("/v1/coach/clients/#{other_client.id}/weight-progress")
             |> json_response(404)

      tenant_client = insert(:client)

      assert ctx.conn
             |> recycle()
             |> get("/v1/coach/clients/#{tenant_client.id}/weight-progress")
             |> json_response(404)
    end
  end

  defp form_submission_for(client, business) do
    template = insert(:form_template, business: business, purpose: :check_in)

    assignment =
      insert(:form_assignment,
        business: business,
        client: client,
        form_template: template,
        purpose: :check_in
      )

    insert(:form_submission, business: business, client: client, form_assignment: assignment)
  end
end
