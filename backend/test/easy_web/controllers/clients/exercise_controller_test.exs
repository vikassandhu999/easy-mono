defmodule EasyWeb.Clients.ExerciseControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    conn = build_conn() |> authenticate_client(client)

    %{conn: conn, coach: coach, client: client, business: coach.business}
  end

  describe "GET /v1/client/exercises" do
    test "lists business + system exercises", ctx do
      # Business exercise
      biz_exercise = insert(:exercise, business: ctx.business)
      # System exercise (no business)
      sys_exercise = insert(:exercise, business: nil)
      # Other business exercise — should not appear
      _other = insert(:exercise)

      conn = get(ctx.conn, "/v1/client/exercises")
      assert %{"data" => data, "count" => count} = json_response(conn, 200)
      assert count == 2
      ids = Enum.map(data, & &1["id"])
      assert biz_exercise.id in ids
      assert sys_exercise.id in ids
    end

    test "searches by name", ctx do
      insert(:exercise, business: ctx.business, name: "Barbell Bench Press")
      insert(:exercise, business: ctx.business, name: "Overhead Press")

      conn = get(ctx.conn, "/v1/client/exercises", %{"search" => "bench"})
      assert %{"data" => [data], "count" => 1} = json_response(conn, 200)
      assert data["name"] == "Barbell Bench Press"
    end

    test "paginates results", ctx do
      for _ <- 1..5, do: insert(:exercise, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/exercises", %{"offset" => "0", "limit" => "2"})
      assert %{"data" => data, "count" => 5} = json_response(conn, 200)
      assert length(data) == 2
    end

    test "does not expose business_id", ctx do
      insert(:exercise, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/exercises")
      assert %{"data" => [data]} = json_response(conn, 200)
      refute Map.has_key?(data, "business_id")
    end

    test "rejects unauthenticated request", _ctx do
      conn = build_conn() |> get("/v1/client/exercises")
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/client/exercises/:id" do
    test "shows exercise with muscles and equipment", ctx do
      exercise = insert(:exercise, business: ctx.business)

      conn = get(ctx.conn, "/v1/client/exercises/#{exercise.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == exercise.id
      assert data["name"] == exercise.name
      assert is_list(data["muscles"])
      assert is_list(data["equipment"])
      assert is_list(data["images"])
    end

    test "shows system exercise", ctx do
      exercise = insert(:exercise, business: nil)

      conn = get(ctx.conn, "/v1/client/exercises/#{exercise.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == exercise.id
    end

    test "returns 404 for other business exercise", ctx do
      other_exercise = insert(:exercise)

      conn = get(ctx.conn, "/v1/client/exercises/#{other_exercise.id}")
      assert json_response(conn, 404)
    end
  end
end
