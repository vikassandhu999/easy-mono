defmodule EasyWeb.Coaches.NutritionDayControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)

    conn =
      build_conn()
      |> authenticate_coach(coach)
      |> put_req_header("content-type", "application/json")

    %{conn: conn, client: client}
  end

  describe "GET /v1/coach/clients/:client_id/nutrition-days" do
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
