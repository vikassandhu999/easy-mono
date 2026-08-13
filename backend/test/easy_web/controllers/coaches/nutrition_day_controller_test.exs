defmodule EasyWeb.Coaches.NutritionDayControllerTest do
  use Easy.ConnCase

  alias Easy.Nutrition.MealLog

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)

    conn =
      build_conn()
      |> authenticate_coach(coach)
      |> put_req_header("content-type", "application/json")

    %{conn: conn, client: client, coach: coach, business: coach.business}
  end

  describe "GET /v1/coach/clients/:client_id/nutrition-days" do
    test "coach reads diary rows without live plan slots", ctx do
      plan =
        insert(:plan,
          creator: ctx.coach,
          business: ctx.business,
          client_id: ctx.client.id,
          status: :active
        )

      meal = insert(:meal, plan: plan, creator: ctx.coach, business: ctx.business)

      day =
        insert(:plan_day,
          plan: plan,
          business: ctx.business,
          weekdays: [Easy.Utils.weekday_name(Date.utc_today())]
        )

      insert(:day_meal, plan_day: day, meal: meal, business: ctx.business, meal_slot: "breakfast")

      conn = get(ctx.conn, "/v1/coach/clients/#{ctx.client.id}/nutrition-days")
      assert %{"data" => [%{"slots" => []}]} = json_response(conn, 200)

      refute MealLog
             |> MealLog.for_client(ctx.business.id, ctx.client.id)
             |> Easy.Repo.exists?()
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
end
