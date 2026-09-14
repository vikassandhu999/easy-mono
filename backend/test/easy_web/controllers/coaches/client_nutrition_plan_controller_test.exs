defmodule EasyWeb.Coaches.ClientNutritionPlanControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/coach/clients/:client_id/nutrition-plans" do
    test "paginates client plans, searches literal text, and renders lifecycle values", ctx do
      today = Date.utc_today()
      inserted_at = DateTime.utc_now(:second)

      plans = [
        insert(:plan,
          creator: ctx.coach.user,
          business: ctx.business,
          client: ctx.client,
          kind: :client_plan,
          name: "Nutrition 100% ended",
          start_date: Date.add(today, -4),
          end_date: Date.add(today, -2),
          inserted_at: inserted_at,
          updated_at: inserted_at
        ),
        insert(:plan,
          creator: ctx.coach.user,
          business: ctx.business,
          client: ctx.client,
          kind: :client_plan,
          name: "Nutrition 100% current",
          start_date: Date.add(today, -1),
          end_date: Date.add(today, 1),
          inserted_at: inserted_at,
          updated_at: inserted_at
        ),
        insert(:plan,
          creator: ctx.coach.user,
          business: ctx.business,
          client: ctx.client,
          kind: :client_plan,
          name: "Nutrition 100% upcoming",
          start_date: Date.add(today, 2),
          end_date: Date.add(today, 4),
          inserted_at: inserted_at,
          updated_at: inserted_at
        )
      ]

      insert(:plan, creator: ctx.coach.user, business: ctx.business, name: "Nutrition 100% template")

      other_client = insert(:client, creator: ctx.coach, business: ctx.business)

      insert(:plan,
        creator: ctx.coach.user,
        business: ctx.business,
        client: other_client,
        kind: :client_plan,
        name: "Nutrition 100% another client"
      )

      first =
        ctx.conn
        |> get("/v1/coach/clients/#{ctx.client.id}/nutrition-plans", %{
          "cursor" => "start",
          "limit" => "1",
          "search" => "100%"
        })
        |> json_response(200)

      assert %{"data" => [first_plan], "count" => 3, "next_cursor" => first_cursor} = first

      second =
        ctx.conn
        |> recycle()
        |> get("/v1/coach/clients/#{ctx.client.id}/nutrition-plans", %{
          "cursor" => first_cursor,
          "limit" => "1",
          "search" => "100%"
        })
        |> json_response(200)

      assert %{"data" => [second_plan], "count" => 3, "next_cursor" => second_cursor} = second

      third =
        ctx.conn
        |> recycle()
        |> get("/v1/coach/clients/#{ctx.client.id}/nutrition-plans", %{
          "cursor" => second_cursor,
          "limit" => "1",
          "search" => "100%"
        })
        |> json_response(200)

      assert %{"data" => [third_plan], "count" => 3, "next_cursor" => nil} = third

      returned = [first_plan, second_plan, third_plan]

      assert Enum.sort(Enum.map(returned, & &1["id"])) == Enum.sort(Enum.map(plans, & &1.id))
      assert Enum.all?(returned, &(&1["kind"] == "client_plan" and &1["client_id"] == ctx.client.id))

      assert Map.new(returned, &{&1["name"], &1["lifecycle"]}) == %{
               "Nutrition 100% ended" => "ended",
               "Nutrition 100% current" => "current",
               "Nutrition 100% upcoming" => "upcoming"
             }
    end

    test "filters archived plans", ctx do
      active =
        insert(:plan,
          creator: ctx.coach.user,
          business: ctx.business,
          client: ctx.client,
          kind: :client_plan
        )

      archived =
        insert(:plan,
          creator: ctx.coach.user,
          business: ctx.business,
          client: ctx.client,
          kind: :client_plan,
          archived_at: DateTime.utc_now(:second)
        )

      assert %{"data" => [%{"id" => active_id}], "count" => 1} =
               ctx.conn
               |> get("/v1/coach/clients/#{ctx.client.id}/nutrition-plans", %{"archived" => "false"})
               |> json_response(200)

      assert active_id == active.id

      assert %{"data" => [%{"id" => archived_id, "lifecycle" => "archived"}], "count" => 1} =
               ctx.conn
               |> recycle()
               |> get("/v1/coach/clients/#{ctx.client.id}/nutrition-plans", %{"archived" => "true"})
               |> json_response(200)

      assert archived_id == archived.id
    end

    test "rejects malformed cursor and limit query values", ctx do
      for params <- [%{"cursor" => "invalid"}, %{"cursor" => "start", "limit" => "0"}, %{"cursor" => "start", "limit" => "-1"}] do
        assert ctx.conn
               |> recycle()
               |> get("/v1/coach/clients/#{ctx.client.id}/nutrition-plans", params)
               |> json_response(422)
      end
    end

    test "enforces trainer visibility and tenant isolation", ctx do
      other_trainer = insert(:coach, business: ctx.business)
      other_trainer_conn = build_conn() |> authenticate_coach(other_trainer)
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)

      assert other_trainer_conn
             |> get("/v1/coach/clients/#{ctx.client.id}/nutrition-plans")
             |> json_response(404)

      assert ctx.conn
             |> get("/v1/coach/clients/#{other_client.id}/nutrition-plans")
             |> json_response(404)
    end

    test "uses the client timezone override in list and detail", ctx do
      now = DateTime.utc_now()
      {timezone, local_today} = opposite_day_timezone(now)

      client =
        insert(:client,
          creator: ctx.coach,
          business: ctx.business,
          timezone: timezone
        )

      plan =
        insert(:plan,
          creator: ctx.coach.user,
          business: ctx.business,
          client: client,
          kind: :client_plan,
          start_date: local_today,
          end_date: local_today
        )

      assert %{"data" => [%{"id" => plan_id, "lifecycle" => "current"}]} =
               ctx.conn
               |> get("/v1/coach/clients/#{client.id}/nutrition-plans")
               |> json_response(200)

      assert plan_id == plan.id

      assert %{"data" => %{"id" => ^plan_id, "lifecycle" => "current"}} =
               ctx.conn
               |> recycle()
               |> get("/v1/coach/nutrition-plans/#{plan.id}")
               |> json_response(200)
    end
  end

  defp opposite_day_timezone(now) do
    utc_today = DateTime.to_date(now)

    Enum.find_value(["Etc/GMT+12", "Pacific/Kiritimati"], fn timezone ->
      local_today = Easy.LocalCalendar.to_local_date(now, timezone)
      if local_today != utc_today, do: {timezone, local_today}
    end)
  end
end
