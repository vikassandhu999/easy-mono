defmodule EasyWeb.Clients.TrainingCursorControllerTest do
  use Easy.ConnCase

  alias Easy.Repo

  setup do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach)
    %{coach: coach, client: client, conn: authenticate_client(build_conn(), client)}
  end

  test "plan cursors retain tied rows after the boundary is deleted and newer plans arrive", ctx do
    timestamp = DateTime.add(DateTime.utc_now(:second), -60, :second)
    plans = for _ <- 1..5, do: plan(ctx, name: "Strength", inserted_at: timestamp)
    plan(ctx, name: "Mobility")
    plan(ctx, name: "Strength archived", archived_at: DateTime.utc_now(:second))
    other_client = insert(:client, business: ctx.coach.business, coach: ctx.coach)
    plan(%{ctx | client: other_client}, name: "Strength private")
    foreign_coach = insert(:coach)
    foreign_client = insert(:client, business: foreign_coach.business, coach: foreign_coach)
    plan(%{ctx | client: foreign_client, coach: foreign_coach}, name: "Strength foreign")

    query = %{cursor: "start", limit: 2, search: "Strength"}
    first = page(ctx.conn, "/v1/client/training-plans", query)
    assert first["count"] == 5
    assert length(first["data"]) == 2
    assert is_binary(first["next_cursor"])
    boundary_id = List.last(first["data"])["id"]
    plans |> Enum.find(&(&1.id == boundary_id)) |> Repo.delete!()
    newer = plan(ctx, name: "Strength new")

    second = page(ctx.conn, "/v1/client/training-plans", %{query | cursor: first["next_cursor"]})
    third = page(ctx.conn, "/v1/client/training-plans", %{query | cursor: second["next_cursor"]})
    assert second["count"] == 5
    assert third["next_cursor"] == nil
    ids = Enum.map(first["data"] ++ second["data"] ++ third["data"], & &1["id"])
    assert ids == plans |> Enum.map(& &1.id) |> Enum.sort(:desc)
    refute newer.id in ids
  end

  test "session cursor filters and counts belong to the authenticated client", ctx do
    today = Date.utc_today()
    timestamp = DateTime.add(DateTime.utc_now(:second), -60, :second)

    sessions =
      for _ <- 1..5 do
        session(ctx, date: today, inserted_at: timestamp)
      end

    session(ctx, date: Date.add(today, -1))
    session(ctx, state: :discarded)
    other_client = insert(:client, business: ctx.coach.business, coach: ctx.coach)
    session(%{ctx | client: other_client}, date: today)
    foreign_coach = insert(:coach)
    foreign_client = insert(:client, business: foreign_coach.business, coach: foreign_coach)
    session(%{ctx | client: foreign_client, coach: foreign_coach}, date: today)

    query = %{cursor: "start", limit: 2, state: "completed", search: "Freestyle", from: today, to: today}
    first = page(ctx.conn, "/v1/client/training-sessions", query)
    assert first["count"] == 5
    assert length(first["data"]) == 2
    boundary_id = List.last(first["data"])["id"]
    sessions |> Enum.find(&(&1.id == boundary_id)) |> Repo.delete!()
    newer = session(ctx, date: today)
    second = page(ctx.conn, "/v1/client/training-sessions", %{query | cursor: first["next_cursor"]})
    third = page(ctx.conn, "/v1/client/training-sessions", %{query | cursor: second["next_cursor"]})
    assert second["count"] == 5
    assert third["next_cursor"] == nil
    ids = Enum.map(first["data"] ++ second["data"] ++ third["data"], & &1["id"])
    assert ids == sessions |> Enum.map(& &1.id) |> Enum.sort(:desc)
    refute newer.id in ids
    assert Enum.all?(first["data"], &(&1["performed_sets"] == []))

    empty = page(ctx.conn, "/v1/client/training-sessions", %{query | search: "No such workout"})
    assert empty == %{"data" => [], "count" => 0, "next_cursor" => nil}
  end

  test "indexes retain offset reads and validate cursor inputs", ctx do
    for _ <- 1..3 do
      plan(ctx, [])
      session(ctx, [])
    end

    for path <- ["/v1/client/training-plans", "/v1/client/training-sessions"] do
      assert %{"data" => [_], "count" => 3, "next_cursor" => nil} = page(ctx.conn, path, %{offset: 1, limit: 1})

      for query <- [
            %{cursor: "invalid"},
            %{cursor: "start", offset: 1},
            %{cursor: "start", limit: 0},
            %{cursor: "start", offset: -1}
          ] do
        assert ctx.conn |> get(path, query) |> json_response(422)
      end

      assert build_conn() |> get(path, %{cursor: "start"}) |> json_response(403)
      assert build_conn() |> authenticate_coach(ctx.coach) |> get(path, %{cursor: "start"}) |> json_response(403)
    end

    assert ctx.conn |> get("/v1/client/training-sessions", %{state: "unknown"}) |> json_response(422)

    assert ctx.conn
           |> get("/v1/client/training-sessions", %{from: Date.utc_today(), to: Date.add(Date.utc_today(), -1)})
           |> json_response(422)
  end

  test "cursor page sizes respect the repository maximum", ctx do
    for _ <- 1..101 do
      plan(ctx, [])
      session(ctx, [])
    end

    for path <- ["/v1/client/training-plans", "/v1/client/training-sessions"] do
      page = page(ctx.conn, path, %{cursor: "start", limit: 500})
      assert page["count"] == 101
      assert length(page["data"]) == 100
      assert is_binary(page["next_cursor"])
    end
  end

  defp page(conn, path, query), do: conn |> get(path, query) |> json_response(200)

  defp plan(ctx, attrs) do
    date = ExMachina.sequence(:training_cursor_date, &Date.add(Date.utc_today(), &1))

    insert(
      :training_plan,
      Keyword.merge(
        [kind: :client_plan, business: ctx.coach.business, creator: ctx.coach.user, client: ctx.client, start_date: date, end_date: date],
        attrs
      )
    )
  end

  defp session(ctx, attrs) do
    insert(:workout_session, Keyword.merge([business: ctx.coach.business, client: ctx.client, state: :completed], attrs))
  end
end
