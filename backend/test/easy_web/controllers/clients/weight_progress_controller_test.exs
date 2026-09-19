defmodule EasyWeb.Clients.WeightProgressControllerTest do
  use Easy.ConnCase

  alias Easy.Fitness.WeightEntry
  alias Easy.Repo

  setup do
    client = insert(:client, goal_weight_value: Decimal.new("80"), goal_weight_unit: :kg)
    %{client: client, conn: build_conn() |> authenticate_client(client)}
  end

  test "pages the client's records with full-range converted summary and chart", %{client: client, conn: conn} do
    today = Date.utc_today()
    first = insert(:weight_entry, client: client, business: client.business, date: Date.add(today, -2), value: Decimal.new("100"))
    last = insert(:weight_entry, client: client, business: client.business, date: today, value: Decimal.new("220"), unit: :lbs)
    insert(:weight_entry, client: client, business: client.business, date: Date.add(today, -100))
    other = insert(:client, business: client.business, creator: client.creator)
    insert(:weight_entry, client: other, business: client.business, date: today)
    insert(:weight_entry)

    response = conn |> get("/v1/client/weight-progress", %{"limit" => 1, "unit" => "kg"}) |> json_response(200)
    assert %{"data" => [entry], "count" => 2, "next_cursor" => cursor, "unit" => "kg"} = response
    assert entry["id"] == last.id
    assert entry["revision"] == 1
    assert response["summary"]["total_change"] == -0.21
    assert response["summary"]["first_entry"]["value"] == "100.00"
    assert response["summary"]["latest_entry"]["value"] == "99.79"
    assert Enum.map(response["chart"]["points"], & &1["id"]) == [first.id, last.id]
    assert response["goal"] == %{"value" => "80.00", "unit" => "kg"}

    Repo.delete!(last)
    page = conn |> recycle() |> get("/v1/client/weight-progress", %{"cursor" => cursor}) |> json_response(200)
    assert %{"data" => [%{"id" => id}], "count" => 1, "next_cursor" => nil} = page
    assert id == first.id
  end

  test "empty and explicitly selected client-local date ranges are supported", %{client: client, conn: conn} do
    tomorrow = Date.add(Date.utc_today(), 1)
    empty = conn |> get("/v1/client/weight-progress") |> json_response(200)
    assert empty["count"] == 0
    assert empty["chart"] == %{"points" => [], "min" => nil, "max" => nil}
    entry = insert(:weight_entry, client: client, business: client.business, date: tomorrow)
    range = %{"from" => Date.to_iso8601(tomorrow), "to" => Date.to_iso8601(tomorrow)}
    response = conn |> recycle() |> get("/v1/client/weight-progress", range) |> json_response(200)
    assert response["count"] == 1
    assert [%{"id" => id}] = response["data"]
    assert id == entry.id
  end

  test "caps pages and validates all query boundaries", %{client: client, conn: conn} do
    today = Date.utc_today()
    for days <- 0..100, do: insert(:weight_entry, client: client, business: client.business, date: Date.add(today, -days))
    range = %{"from" => Date.add(today, -365) |> Date.to_iso8601(), "to" => Date.to_iso8601(today), "limit" => 1000}
    response = conn |> get("/v1/client/weight-progress", range) |> json_response(200)
    assert length(response["data"]) == 100
    assert response["count"] == 101
    assert is_binary(response["next_cursor"])

    for params <- [
          %{"cursor" => "bad"},
          %{"unit" => "stone"},
          %{"from" => "bad"},
          %{"limit" => 0},
          %{"from" => Date.to_iso8601(today), "to" => Date.add(today, -1) |> Date.to_iso8601()},
          %{"from" => Date.add(today, -366) |> Date.to_iso8601(), "to" => Date.to_iso8601(today)},
          %{"client_id" => Ecto.UUID.generate()}
        ] do
      assert conn |> recycle() |> get("/v1/client/weight-progress", params) |> json_response(422)
    end
  end

  test "requires client authentication", %{client: client} do
    assert build_conn() |> get("/v1/client/weight-progress") |> json_response(403)
    assert build_conn() |> authenticate_coach(client.creator) |> get("/v1/client/weight-progress") |> json_response(403)
    assert Repo.aggregate(WeightEntry, :count) == 0
  end
end
