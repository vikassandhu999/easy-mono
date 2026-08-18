defmodule EasyWeb.Coaches.NutritionDayControllerTest do
  use Easy.ConnCase

  import Easy.DataCase, only: [trainer_ctx: 1]
  import OpenApiSpex.TestAssertions

  alias Easy.LocalCalendar
  alias Easy.Nutrition.{Programming, WeekSchedule}

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business, assigned_coach: coach)

    conn =
      build_conn()
      |> authenticate_coach(coach)
      |> put_req_header("content-type", "application/json")

    %{conn: conn, client: client, coach: coach, business: coach.business}
  end

  describe "GET /v1/coach/clients/:client_id/nutrition-days" do
    test "returns the same live Nutrition Day as the client", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      plan = assign_covering_plan(ctx, food)
      today = local_today(ctx.client)

      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-days")
      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["date"] == Date.to_iso8601(today)
      assert data["plan_id"] == plan.id
      assert data["write_eligible"] == true
      assert hd(data["slots"])["meal_slot"] == "breakfast"
      assert hd(data["slots"])["rows"] == []
      assert data["applied_timezone"]
      assert data["summary"]["adherence"] == "none"
      refute data["summary"]["has_intake"]
      assert_schema(data, "NutritionDay", EasyWeb.ApiSpec.spec())
    end

    test "rejects reversed ranges and paginates history", ctx do
      reversed =
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-days", %{
          "from" => "2026-08-12",
          "to" => "2026-08-10"
        })

      assert json_response(reversed, 422)

      conn =
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-days", %{
          "from" => "2026-08-10",
          "to" => "2026-08-14",
          "offset" => "1",
          "limit" => "2"
        })

      assert %{"data" => days, "count" => 5} = json_response(conn, 200)
      assert Enum.map(days, & &1["date"]) == ["2026-08-11", "2026-08-12"]
    end

    test "conceals a client from another business", ctx do
      other = insert(:client)
      conn = get(ctx.conn, "/v1/coach/clients/#{other.id}/nutrition-days")
      assert json_response(conn, 404)
    end

    test "rejects malformed range dates", ctx do
      conn =
        get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-days", %{
          "from" => "not-a-date",
          "to" => "also-not-a-date"
        })

      assert %{"error_detail" => %{"fields" => %{"date" => ["is invalid"]}}} = json_response(conn, 422)
    end
  end

  defp assign_covering_plan(ctx, food) do
    coach_ctx = trainer_ctx(ctx.coach)
    {:ok, template} = Programming.create_template(coach_ctx, %{"name" => "Cut", "target_calories" => 2000.0})
    pattern = hd(template.day_patterns)

    menu = %{
      meals: [
        %{
          local_ref: "breakfast",
          name: "Breakfast",
          position: 0,
          meal_items: [
            %{local_ref: "oats", kind: :food, food_id: food.id, position: 0, portion: %{kind: :gram, grams: 50}}
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          position: 0,
          slots: [%{meal_slot: :breakfast, options: [%{local_ref: "opt", meal_local_ref: "breakfast", position: 0}]}]
        }
      ],
      schedule: Map.new(WeekSchedule.weekdays(), &{&1, pattern.id})
    }

    {:ok, source} = Programming.replace_menu(coach_ctx, template.id, 1, menu)
    today = local_today(ctx.client)

    {:ok, plan} =
      Programming.assign_template_to_client(coach_ctx, ctx.client.id, source.id, 2, %{
        "start_date" => Date.to_iso8601(today),
        "end_date" => nil
      })

    plan
  end

  defp local_today(client) do
    LocalCalendar.to_local_date(
      DateTime.utc_now(),
      LocalCalendar.applied_timezone(client.timezone, client.business && client.business.timezone)
    )
  end
end
