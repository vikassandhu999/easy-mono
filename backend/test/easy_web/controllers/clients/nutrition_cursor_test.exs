defmodule EasyWeb.Clients.NutritionCursorTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    client = insert(:client, creator: coach, business: coach.business)
    %{conn: build_conn() |> authenticate_client(client), coach: coach, client: client}
  end

  for {kind, path} <- [food: "nutrition-foods", recipe: "nutrition-recipes", plan: "nutrition-plans"] do
    test "#{kind} cursor pages preserve scope, search, count and deleted boundaries", ctx do
      kind = unquote(kind)
      path = "/v1/client/#{unquote(path)}"
      stamp = DateTime.utc_now(:second)

      visible = for n <- 1..3, do: resource(kind, ctx, name: "Cursor meal #{n}", inserted_at: stamp)
      resource(kind, ctx, name: "Unrelated name")
      foreign_coach = insert(:coach)
      foreign_client = insert(:client, creator: foreign_coach, business: foreign_coach.business)
      resource(kind, %{coach: foreign_coach, client: foreign_client}, name: "Cursor meal private")

      visible = add_scope_fixture(kind, ctx, visible, stamp)
      ids = visible |> Enum.map(& &1.id) |> Enum.sort(:desc)
      query = %{"cursor" => "start", "limit" => "2", "search" => "Cursor meal"}
      first = ctx.conn |> get(path, query) |> json_response(200)
      assert first["count"] == length(ids)
      assert Enum.map(first["data"], & &1["id"]) == Enum.take(ids, 2)
      assert is_binary(first["next_cursor"])
      Enum.each(first["data"], &refute(Map.has_key?(&1, "business_id")))

      boundary = Enum.at(ids, 1)
      visible |> Enum.find(&(&1.id == boundary)) |> Easy.Repo.delete!()
      resource(kind, ctx, name: "Cursor meal added later", inserted_at: DateTime.add(stamp, 10))
      second = ctx.conn |> get(path, %{query | "cursor" => first["next_cursor"]}) |> json_response(200)
      assert second["count"] == length(ids)
      assert Enum.map(second["data"], & &1["id"]) == Enum.drop(ids, 2)
      assert second["next_cursor"] == nil

      offset = ctx.conn |> get(path, %{"search" => "Cursor meal", "offset" => "1", "limit" => "1"}) |> json_response(200)
      assert length(offset["data"]) == 1
      assert offset["count"] == length(ids)
      assert offset["next_cursor"] == nil
      assert ctx.conn |> get(path, %{"cursor" => "broken"}) |> json_response(422)
      assert ctx.conn |> get(path, %{"cursor" => "start", "offset" => "1"}) |> json_response(422)
    end
  end

  test "assigned plan cursor archive filters retain client isolation", ctx do
    archived = resource(:plan, ctx, name: "Past meals", status: :archived)
    resource(:plan, ctx, name: "Present meals")
    response = ctx.conn |> get("/v1/client/nutrition-plans", %{"cursor" => "start", "archived" => "true"}) |> json_response(200)
    assert %{"count" => 1, "next_cursor" => nil, "data" => [%{"id" => id, "lifecycle" => "archived"}]} = response
    assert id == archived.id
  end

  test "food cursors cap page size at 100", ctx do
    for n <- 1..101, do: resource(:food, ctx, name: "Page cap #{n}")
    response = ctx.conn |> get("/v1/client/nutrition-foods", %{"cursor" => "start", "limit" => "1000", "search" => "Page cap"}) |> json_response(200)
    assert response["count"] == 101
    assert length(response["data"]) == 100
    assert is_binary(response["next_cursor"])
  end

  defp resource(:plan, ctx, attrs) do
    day = ExMachina.sequence(:nutrition_cursor_day, &Date.add(Date.utc_today(), &1))
    insert(:plan, Keyword.merge([creator: ctx.coach, business: ctx.coach.business, client_id: ctx.client.id, start_date: day, end_date: day], attrs))
  end

  defp resource(kind, ctx, attrs) do
    insert(kind, Keyword.merge([creator: ctx.coach, business: ctx.coach.business], attrs))
  end

  defp add_scope_fixture(:food, _ctx, visible, stamp) do
    [insert(:food, name: "Cursor meal system", business: nil, creator: nil, inserted_at: stamp) | visible]
  end

  defp add_scope_fixture(:plan, ctx, visible, _stamp) do
    other = insert(:client, creator: ctx.coach, business: ctx.coach.business)
    resource(:plan, %{ctx | client: other}, name: "Cursor meal other client")
    insert(:plan, creator: ctx.coach, business: ctx.coach.business, name: "Cursor meal template")
    visible
  end

  defp add_scope_fixture(:recipe, _ctx, visible, _stamp), do: visible
end
