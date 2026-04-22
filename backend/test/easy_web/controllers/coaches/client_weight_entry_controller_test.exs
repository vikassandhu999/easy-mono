defmodule EasyWeb.Coaches.ClientWeightEntryControllerTest do
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
  end
end
