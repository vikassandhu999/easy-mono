defmodule EasyWeb.Clients.NutritionDayControllerTest do
  use Easy.ConnCase

  import Easy.Nutrition.DiaryFixtures, only: [covering_setup: 0]

  setup do
    fixture = covering_setup()

    conn =
      build_conn()
      |> authenticate_client(fixture.client)
      |> put_req_header("content-type", "application/json")

    Map.put(fixture, :conn, conn)
  end

  describe "GET /v1/client/nutrition-days" do
    test "returns the current day's flattened pending rows", ctx do
      response = ctx.conn |> get("/v1/client/nutrition-days") |> json_response(200)

      assert %{"data" => [%{"date" => date, "slots" => [slot]}]} = response
      assert date == Date.to_iso8601(ctx.today)
      assert %{"entry_id" => nil, "planned_item_ref" => planned_item_ref, "status" => "pending"} = hd(slot["rows"])
      assert is_binary(planned_item_ref)
    end

    test "rejects unknown query parameters", ctx do
      assert ctx.conn |> get("/v1/client/nutrition-days?unexpected=true") |> json_response(422)
    end
  end

  describe "PATCH /v1/client/nutrition-days/:date" do
    test "rejects malformed UUIDs in diary input", ctx do
      conn = patch(ctx.conn, "/v1/client/nutrition-days/#{ctx.today}", %{"slots" => [%{"meal_slot" => "breakfast", "meal_id" => "not-a-uuid", "entries" => []}]})

      assert json_response(conn, 422)
    end

    test "is unavailable to a coach", ctx do
      conn =
        build_conn()
        |> authenticate_coach(ctx.coach)
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/client/nutrition-days/#{ctx.today}", %{"slots" => []})

      assert %{"error_code" => "unauthorized"} = json_response(conn, 403)
    end
  end
end
