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
      assert slot["write_eligible"] == true
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

      assert %{"data" => days, "count" => 3} = json_response(conn, 200)
      assert_schema(json_response(conn, 200), "NutritionDayListResponse", EasyWeb.ApiSpec.spec())
      assert Enum.map(days, & &1["date"]) == ["2026-08-10", "2026-08-11", "2026-08-12"]
      assert hd(days)["applied_timezone"]
      assert hd(days)["summary"]["adherence"] == "none"
      refute hd(days)["summary"]["has_intake"]
    end

    test "paginates a local-date range", ctx do
      conn =
        get(ctx.conn, "/v1/client/nutrition-days", %{
          "from" => "2026-08-10",
          "to" => "2026-08-14",
          "offset" => "1",
          "limit" => "2"
        })

      assert %{"data" => days, "count" => 5} = json_response(conn, 200)
      assert Enum.map(days, & &1["date"]) == ["2026-08-11", "2026-08-12"]
    end

    test "rejects reversed, incomplete, and oversized ranges", ctx do
      reversed =
        get(ctx.conn, "/v1/client/nutrition-days", %{"from" => "2026-08-12", "to" => "2026-08-10"})

      assert json_response(reversed, 422)

      incomplete = get(ctx.conn, "/v1/client/nutrition-days", %{"from" => "2026-08-10"})
      assert json_response(incomplete, 422)

      wide =
        get(ctx.conn, "/v1/client/nutrition-days", %{"from" => "2026-08-01", "to" => "2026-09-01"})

      assert json_response(wide, 422)
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

  describe "inactive client access" do
    test "follows account lifecycle and forbids Diary reads", ctx do
      inactive =
        insert(:client,
          creator: ctx.coach,
          business: ctx.business,
          assigned_coach: ctx.coach,
          status: :inactive,
          inactive_reason: :manual
        )

      conn =
        build_conn()
        |> authenticate_client(inactive)
        |> put_req_header("content-type", "application/json")
        |> get("/v1/client/nutrition-days")

      assert json_response(conn, 403)
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

  describe "POST /v1/client/nutrition-days/:date/planned-items" do
    test "logs a planned item, freezes Coverage, and replays an identical key", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      assign_covering_plan(ctx, food)
      today = Date.to_iso8601(local_today(ctx.client))
      meal_item_id = live_meal_item_id(ctx)
      key = Ecto.UUID.generate()

      body = %{"meal_slot" => "breakfast", "meal_item_id" => meal_item_id}

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/planned-items", body)

      assert %{"data" => data} = json_response(conn, 201)
      [slot] = data["slots"]
      assert Enum.any?(slot["rows"], &(&1["status"] == "as_planned" and &1["entry"]["name"] == "Oats"))
      assert_schema(data, "NutritionDay", EasyWeb.ApiSpec.spec())

      replay =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/planned-items", body)

      assert %{"data" => replayed} = json_response(replay, 201)
      assert replayed["slots"] == data["slots"]
    end

    test "returns conflict when the same key is reused with a different payload", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      assign_covering_plan(ctx, food)
      today = Date.to_iso8601(local_today(ctx.client))
      meal_item_id = live_meal_item_id(ctx)
      key = Ecto.UUID.generate()

      ctx.conn
      |> put_req_header("idempotency-key", key)
      |> post("/v1/client/nutrition-days/#{today}/planned-items", %{
        "meal_slot" => "breakfast",
        "meal_item_id" => meal_item_id
      })
      |> json_response(201)

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/planned-items", %{
          "meal_slot" => "lunch",
          "meal_item_id" => meal_item_id
        })

      assert json_response(conn, 409)
    end
  end

  describe "POST /v1/client/nutrition-days/:date/planned-options" do
    test "logs the active option and remains idempotent under a fresh key", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      assign_covering_plan(ctx, food)
      today = Date.to_iso8601(local_today(ctx.client))

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> post("/v1/client/nutrition-days/#{today}/planned-options", %{"meal_slot" => "breakfast"})

      assert %{"data" => data} = json_response(conn, 201)
      assert Enum.all?(hd(data["slots"])["rows"], &(&1["status"] == "as_planned"))
      assert_schema(data, "NutritionDay", EasyWeb.ApiSpec.spec())

      again =
        ctx.conn
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> post("/v1/client/nutrition-days/#{today}/planned-options", %{"meal_slot" => "breakfast"})

      assert %{"data" => replayed} = json_response(again, 201)

      assert Enum.map(hd(replayed["slots"])["rows"], & &1["entry"]["id"]) ==
               Enum.map(hd(data["slots"])["rows"], & &1["entry"]["id"])
    end
  end

  describe "POST /v1/client/nutrition-days/:date/planned-day" do
    test "logs every scheduled slot for the day", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      assign_covering_plan(ctx, food)
      today = Date.to_iso8601(local_today(ctx.client))

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> post("/v1/client/nutrition-days/#{today}/planned-day", %{})

      assert %{"data" => data} = json_response(conn, 201)
      assert Enum.any?(data["slots"], &(&1["meal_slot"] == "breakfast"))
      assert Enum.all?(hd(data["slots"])["rows"], &(&1["status"] == "as_planned"))
      assert_schema(data, "NutritionDay", EasyWeb.ApiSpec.spec())
    end
  end

  describe "POST /v1/client/nutrition-days/:date/active-option" do
    test "switches the frozen active option and replays an identical key", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      assign_covering_plan(ctx, food, menu: :two_options)
      today = Date.to_iso8601(local_today(ctx.client))
      [option_a, option_b] = live_options(ctx)
      key = Ecto.UUID.generate()

      ctx.conn
      |> put_req_header("idempotency-key", Ecto.UUID.generate())
      |> post("/v1/client/nutrition-days/#{today}/planned-items", %{
        "meal_slot" => "breakfast",
        "meal_item_id" => hd(option_a["items"])["meal_item_id"]
      })
      |> json_response(201)

      body = %{
        "meal_slot" => "breakfast",
        "meal_id" => option_b["meal_id"],
        "expected_revision" => 1
      }

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/active-option", body)

      assert %{"data" => data} = json_response(conn, 200)
      [slot] = data["slots"]
      assert slot["meal_id"] == option_b["meal_id"]
      assert slot["revision"] == 2
      assert Enum.any?(slot["rows"], &(&1["status"] == "added"))
      assert Enum.any?(slot["rows"], &(&1["status"] == "pending"))
      assert_schema(data, "NutritionDay", EasyWeb.ApiSpec.spec())

      replay =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/active-option", body)

      assert %{"data" => replayed} = json_response(replay, 200)
      assert replayed["slots"] == data["slots"]
    end

    test "returns conflict for a stale revision", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      assign_covering_plan(ctx, food, menu: :two_options)
      today = Date.to_iso8601(local_today(ctx.client))
      [option_a, option_b] = live_options(ctx)

      ctx.conn
      |> put_req_header("idempotency-key", Ecto.UUID.generate())
      |> post("/v1/client/nutrition-days/#{today}/active-option", %{
        "meal_slot" => "breakfast",
        "meal_id" => option_b["meal_id"],
        "expected_revision" => 1
      })
      |> json_response(200)

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> post("/v1/client/nutrition-days/#{today}/active-option", %{
          "meal_slot" => "breakfast",
          "meal_id" => option_a["meal_id"],
          "expected_revision" => 9
        })

      assert %{"error_code" => "stale_revision", "error_detail" => %{"current_revision" => 1}} =
               json_response(conn, 409)
    end

    test "rejects a missing idempotency key", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      assign_covering_plan(ctx, food, menu: :two_options)
      today = Date.to_iso8601(local_today(ctx.client))
      [_option_a, option_b] = live_options(ctx)

      conn =
        post(ctx.conn, "/v1/client/nutrition-days/#{today}/active-option", %{
          "meal_slot" => "breakfast",
          "meal_id" => option_b["meal_id"],
          "expected_revision" => 1
        })

      assert json_response(conn, 422)
    end

    test "is not available to coaches", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      assign_covering_plan(ctx, food, menu: :two_options)
      today = Date.to_iso8601(local_today(ctx.client))
      [_option_a, option_b] = live_options(ctx)

      conn =
        build_conn()
        |> authenticate_coach(ctx.coach)
        |> put_req_header("content-type", "application/json")
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> post("/v1/client/nutrition-days/#{today}/active-option", %{
          "meal_slot" => "breakfast",
          "meal_id" => option_b["meal_id"],
          "expected_revision" => 1
        })

      assert conn.status in [401, 403, 404]
    end
  end

  describe "POST /v1/client/nutrition-days/:date/replacements" do
    test "replaces a fulfilment and replays an identical idempotency key", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      eggs = insert(:food, creator: ctx.coach, business: ctx.business, name: "Eggs", calories_per_100g: 140.0)
      assign_covering_plan(ctx, food)
      today = Date.to_iso8601(local_today(ctx.client))
      meal_item_id = live_meal_item_id(ctx)

      ctx.conn
      |> put_req_header("idempotency-key", Ecto.UUID.generate())
      |> post("/v1/client/nutrition-days/#{today}/planned-items", %{
        "meal_slot" => "breakfast",
        "meal_item_id" => meal_item_id
      })
      |> json_response(201)

      key = Ecto.UUID.generate()

      body = %{
        "meal_slot" => "breakfast",
        "meal_item_id" => meal_item_id,
        "food_id" => eggs.id,
        "portion" => %{"kind" => "gram", "grams" => 80},
        "expected_revision" => 1
      }

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/replacements", body)

      assert %{"data" => data} = json_response(conn, 200)
      swapped = Enum.find(hd(data["slots"])["rows"], &(&1["status"] == "swapped"))
      assert swapped["entry"]["name"] == "Eggs"
      assert swapped["entry"]["portion"]["grams"] == 80.0
      assert swapped["entry"]["nutrients"]["calories"] == 112.0
      assert swapped["entry"]["revision"] == 2
      assert_schema(data, "NutritionDay", EasyWeb.ApiSpec.spec())

      replay =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/replacements", body)

      assert %{"data" => replayed} = json_response(replay, 200)
      assert replayed["slots"] == data["slots"]
    end

    test "returns conflict when the same key is reused with a different payload", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      eggs = insert(:food, creator: ctx.coach, business: ctx.business, name: "Eggs")
      assign_covering_plan(ctx, food)
      today = Date.to_iso8601(local_today(ctx.client))
      meal_item_id = live_meal_item_id(ctx)
      key = Ecto.UUID.generate()

      ctx.conn
      |> put_req_header("idempotency-key", Ecto.UUID.generate())
      |> post("/v1/client/nutrition-days/#{today}/planned-items", %{
        "meal_slot" => "breakfast",
        "meal_item_id" => meal_item_id
      })
      |> json_response(201)

      ctx.conn
      |> put_req_header("idempotency-key", key)
      |> post("/v1/client/nutrition-days/#{today}/replacements", %{
        "meal_slot" => "breakfast",
        "meal_item_id" => meal_item_id,
        "food_id" => eggs.id,
        "portion" => %{"kind" => "gram", "grams" => 80},
        "expected_revision" => 1
      })
      |> json_response(200)

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", key)
        |> post("/v1/client/nutrition-days/#{today}/replacements", %{
          "meal_slot" => "breakfast",
          "meal_item_id" => meal_item_id,
          "food_id" => eggs.id,
          "portion" => %{"kind" => "gram", "grams" => 90},
          "expected_revision" => 1
        })

      assert json_response(conn, 409)
    end
  end

  describe "PATCH /v1/client/nutrition-days/:date/entries/:id" do
    test "updates portion and notes at the expected revision", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Banana")
      today = Date.to_iso8601(local_today(ctx.client))

      created =
        ctx.conn
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> post("/v1/client/nutrition-days/#{today}/extras", %{
          "meal_slot" => "breakfast",
          "food_id" => food.id,
          "portion" => %{"kind" => "gram", "grams" => 80}
        })

      assert %{"data" => data} = json_response(created, 201)
      entry = hd(hd(data["slots"])["rows"])["entry"]

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> patch("/v1/client/nutrition-days/#{today}/entries/#{entry["id"]}", %{
          "expected_revision" => entry["revision"],
          "portion" => %{"kind" => "gram", "grams" => 40},
          "notes" => "half"
        })

      assert %{"data" => updated} = json_response(conn, 200)
      corrected = hd(hd(updated["slots"])["rows"])["entry"]
      assert corrected["portion"]["grams"] == 40.0
      assert corrected["notes"] == "half"
      assert corrected["revision"] == entry["revision"] + 1
      assert_schema(updated, "NutritionDay", EasyWeb.ApiSpec.spec())
    end

    test "returns conflict for a stale entry revision", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business)
      today = Date.to_iso8601(local_today(ctx.client))

      created =
        ctx.conn
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> post("/v1/client/nutrition-days/#{today}/extras", %{
          "meal_slot" => "breakfast",
          "food_id" => food.id,
          "portion" => %{"kind" => "gram", "grams" => 50}
        })

      entry = json_response(created, 201)["data"]["slots"] |> hd() |> Map.fetch!("rows") |> hd() |> Map.fetch!("entry")

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> patch("/v1/client/nutrition-days/#{today}/entries/#{entry["id"]}", %{
          "expected_revision" => 9,
          "portion" => %{"kind" => "gram", "grams" => 10}
        })

      assert %{"error_code" => "stale_revision", "error_detail" => %{"current_revision" => 1}} =
               json_response(conn, 409)
    end
  end

  describe "DELETE /v1/client/nutrition-days/:date/entries/:id" do
    test "deletes the entry and keeps frozen guidance", ctx do
      food = insert(:food, creator: ctx.coach, business: ctx.business, name: "Oats")
      assign_covering_plan(ctx, food)
      today = Date.to_iso8601(local_today(ctx.client))
      meal_item_id = live_meal_item_id(ctx)

      logged =
        ctx.conn
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> post("/v1/client/nutrition-days/#{today}/planned-items", %{
          "meal_slot" => "breakfast",
          "meal_item_id" => meal_item_id
        })

      assert %{"data" => data} = json_response(logged, 201)
      entry_id = hd(hd(data["slots"])["rows"])["entry"]["id"]

      conn =
        ctx.conn
        |> put_req_header("idempotency-key", Ecto.UUID.generate())
        |> delete("/v1/client/nutrition-days/#{today}/entries/#{entry_id}", %{"expected_revision" => 1})

      assert %{"data" => remaining} = json_response(conn, 200)
      [slot] = remaining["slots"]
      assert slot["options"] != []
      refute Enum.any?(slot["rows"], &(&1["entry"] && &1["entry"]["id"] == entry_id))
      assert Enum.any?(slot["rows"], &(&1["status"] == "pending"))
      assert_schema(remaining, "NutritionDay", EasyWeb.ApiSpec.spec())
    end
  end

  defp assign_covering_plan(ctx, food, opts \\ []) do
    coach_ctx = trainer_ctx(ctx.coach)
    {:ok, template} = Programming.create_template(coach_ctx, %{"name" => "Cut", "target_calories" => 2000.0})

    menu =
      case Keyword.get(opts, :menu) do
        :two_options -> two_option_menu(template, food)
        _ -> breakfast_menu(template, food)
      end

    {:ok, source} = Programming.replace_menu(coach_ctx, template.id, 1, menu)
    today = local_today(ctx.client)
    start_date = Date.add(today, Keyword.get(opts, :start_offset, 0))

    {:ok, plan} =
      Programming.assign_template_to_client(coach_ctx, ctx.client.id, source.id, 2, %{
        "start_date" => Date.to_iso8601(start_date),
        "end_date" => nil
      })

    plan
  end

  defp live_meal_item_id(ctx) do
    hd(live_meal_item_ids(ctx))
  end

  defp live_meal_item_ids(ctx) do
    hd(live_options(ctx))["items"] |> Enum.map(& &1["meal_item_id"])
  end

  defp live_options(ctx) do
    today = Date.to_iso8601(local_today(ctx.client))
    conn = get(ctx.conn, "/v1/client/nutrition-days", %{"date" => today})
    assert %{"data" => [data]} = json_response(conn, 200)
    hd(data["slots"])["options"]
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

  defp two_option_menu(plan, food) do
    pattern = hd(plan.day_patterns)

    %{
      meals: [
        %{
          local_ref: "a",
          name: "Breakfast A",
          position: 0,
          meal_items: [
            %{local_ref: "a-item", kind: :food, food_id: food.id, position: 0, portion: %{kind: :gram, grams: 50}}
          ]
        },
        %{
          local_ref: "b",
          name: "Breakfast B",
          position: 1,
          meal_items: [
            %{local_ref: "b-item", kind: :food, food_id: food.id, position: 0, portion: %{kind: :gram, grams: 40}}
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          position: 0,
          slots: [
            %{
              meal_slot: :breakfast,
              options: [
                %{local_ref: "opt-a", meal_local_ref: "a", position: 0},
                %{local_ref: "opt-b", meal_local_ref: "b", position: 1}
              ]
            }
          ]
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
