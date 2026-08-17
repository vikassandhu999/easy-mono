defmodule EasyWeb.Clients.NutritionDayControllerTest do
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
      |> authenticate_client(client)
      |> put_req_header("content-type", "application/json")

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/client/nutrition-days" do
    test "returns today's live options without pending or skipped status", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      plan = assign_covering_plan(ctx, food)
      today = local_today(ctx.client)

      conn = get(ctx.conn, "/v1/client/nutrition-days")
      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["date"] == Date.to_iso8601(today)
      assert data["plan_id"] == plan.id
      assert data["write_eligible"] == true
      assert data["targets"]["calories"] == 2000.0

      [slot] = data["slots"]
      assert slot["meal_slot"] == "breakfast"
      assert slot["rows"] == []
      refute Enum.any?(slot["rows"], &(&1["status"] in ["pending", "skipped"]))
      assert hd(slot["options"])["meal_name"] == "Breakfast"
      assert hd(hd(slot["options"])["items"])["name"] == "Oats"
      assert hd(hd(slot["options"])["items"])["kind"] == "food"
      assert_schema(data, "NutritionDay", EasyWeb.ApiSpec.spec())
    end

    test "returns an empty successful day when Coverage is missing", ctx do
      conn = get(ctx.conn, "/v1/client/nutrition-days")
      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["plan_id"] == nil
      assert data["slots"] == []
      assert data["write_eligible"] == true
    end

    test "past dates do not expose live Programming", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      assign_covering_plan(ctx, food, start_offset: -7)
      past = Date.add(local_today(ctx.client), -1)

      conn = get(ctx.conn, "/v1/client/nutrition-days", %{"date" => Date.to_iso8601(past)})
      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["date"] == Date.to_iso8601(past)
      assert data["plan_id"] == nil
      assert data["slots"] == []
    end

    test "future dates are readable and write-ineligible", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      plan = assign_covering_plan(ctx, food)
      future = Date.add(local_today(ctx.client), 1)

      conn = get(ctx.conn, "/v1/client/nutrition-days", %{"date" => Date.to_iso8601(future)})
      assert %{"data" => [data]} = json_response(conn, 200)
      assert data["plan_id"] == plan.id
      assert data["write_eligible"] == false
      assert hd(data["slots"])["meal_slot"] == "breakfast"
    end

    test "range returns one day per local date", ctx do
      conn =
        get(ctx.conn, "/v1/client/nutrition-days", %{
          "from" => "2026-08-10",
          "to" => "2026-08-12"
        })

      assert %{"data" => days} = json_response(conn, 200)
      assert Enum.map(days, & &1["date"]) == ["2026-08-10", "2026-08-11", "2026-08-12"]
    end

    test "rejects a malformed exact date", ctx do
      conn = get(ctx.conn, "/v1/client/nutrition-days", %{"date" => "not-a-date"})

      assert %{"error_detail" => %{"fields" => %{"date" => ["is invalid"]}}} = json_response(conn, 422)
    end

    test "rejects a range whose dates are malformed", ctx do
      conn =
        get(ctx.conn, "/v1/client/nutrition-days", %{
          "from" => "not-a-date",
          "to" => "also-not-a-date"
        })

      assert %{"error_detail" => %{"fields" => %{"date" => ["is invalid"]}}} = json_response(conn, 422)
    end
  end

  describe "POST /v1/client/nutrition-days/:date/extras" do
    test "records an extra, freezes Coverage, and replays an identical idempotency key", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      extra = insert(:food, creator: ctx.coach, business: ctx.business, name: "Banana")
      assign_covering_plan(ctx, food)
      today = Date.to_iso8601(local_today(ctx.client))
      key = Ecto.UUID.generate()

      body = %{
        "meal_slot" => "breakfast",
        "food_id" => extra.id,
        "portion" => %{"kind" => "gram", "grams" => 80}
      }

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/extras", body)

      assert %{"data" => data} = json_response(conn, 201)
      assert data["date"] == today
      [slot] = data["slots"]
      assert slot["meal_slot"] == "breakfast"
      assert hd(slot["options"])["meal_name"] == "Breakfast"
      assert Enum.any?(slot["rows"], &(&1["status"] == "added" and &1["entry"]["name"] == "Banana"))
      assert_schema(data, "NutritionDay", EasyWeb.ApiSpec.spec())

      replay =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/extras", body)

      assert %{"data" => replayed} = json_response(replay, 201)
      assert replayed["slots"] == data["slots"]
    end

    test "returns conflict when the same key is reused with a different payload", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Banana")
      other = insert(:food, creator: ctx.coach, business: ctx.business, name: "Apple")
      today = Date.to_iso8601(local_today(ctx.client))
      key = Ecto.UUID.generate()

      ctx.conn
      |> put_req_header("idempotency-key", key)
      |> post("/v1/client/nutrition-days/#{today}/extras", %{
        "meal_slot" => "breakfast",
        "food_id" => food.id,
        "portion" => %{"kind" => "gram", "grams" => 50}
      })
      |> json_response(201)

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/extras", %{
          "meal_slot" => "breakfast",
          "food_id" => other.id,
          "portion" => %{"kind" => "gram", "grams" => 50}
        })

      assert json_response(conn, 409)
    end

    test "rejects a missing idempotency key", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business)
      today = Date.to_iso8601(local_today(ctx.client))

      conn =
        post(ctx.conn, "/v1/client/nutrition-days/#{today}/extras", %{
          "meal_slot" => "breakfast",
          "food_id" => food.id,
          "portion" => %{"kind" => "gram", "grams" => 50}
        })

      assert json_response(conn, 422)
    end

    test "is not available to coaches", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business)
      today = Date.to_iso8601(local_today(ctx.client))

      conn =
        build_conn()
        |> authenticate_coach(ctx.coach)
        |> put_req_header("content-type", "application/json")
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> post("/v1/client/nutrition-days/#{today}/extras", %{
          "meal_slot" => "breakfast",
          "food_id" => food.id,
          "portion" => %{"kind" => "gram", "grams" => 50}
        })

      assert conn.status in [401, 403, 404]
    end
  end

  defp assign_covering_plan(ctx, food, opts \\ []) do
    coach_ctx = trainer_ctx(ctx.coach)
    {:ok, template} = Programming.create_template(coach_ctx, %{"name" => "Cut", "target_calories" => 2000.0})
    {:ok, source} = Programming.replace_menu(coach_ctx, template.id, 1, breakfast_menu(template, food))
    today = local_today(ctx.client)
    start_date = Date.add(today, Keyword.get(opts, :start_offset, 0))

    {:ok, plan} =
      Programming.assign_template_to_client(coach_ctx, ctx.client.id, source.id, 2, %{
        "start_date" => Date.to_iso8601(start_date),
        "end_date" => nil
      })

    plan
  end

  defp breakfast_menu(plan, food) do
    pattern = hd(plan.day_patterns)

    %{
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
  end

  defp local_today(client) do
    LocalCalendar.to_local_date(
      DateTime.utc_now(),
      LocalCalendar.applied_timezone(client.timezone, client.business && client.business.timezone)
    )
  end
end
