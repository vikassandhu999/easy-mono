defmodule EasyWeb.NutritionCollisionTest do
  use Easy.ConnCase, async: true
  alias Easy.Clients.Client
  alias Easy.Nutrition.DiaryEntry
  alias Easy.Nutrition.DiaryMeal
  alias Easy.Repo

  setup %{conn: conn} do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, coach: coach, timezone: "Etc/UTC")
    client_conn = authenticate_client(conn, client)
    path = "/v1/client/nutrition-days/#{Date.utc_today()}"
    meal = meal("Original")
    assert response(patch(client_conn, path, %{meals: [meal]}), 200)
    %{client: client, conn: client_conn, path: path, meal: meal, coach: coach}
  end

  test "reused meal request returns validation error and rolls back the complete batch", f do
    conflicting = %{meal("Conflict") | request_id: f.meal.request_id}
    body = json_response(patch(f.conn, f.path, %{meals: [meal("Before conflict"), conflicting]}), 422)
    assert body["error_detail"]["fields"]["request_id"] == ["has already been taken"]
    assert_unchanged(f)
  end

  test "another client's meal id cannot cause an unhandled primary key error", f do
    other = insert(:client, business: f.coach.business, coach: f.coach, timezone: "Etc/UTC")
    conn = authenticate_client(build_conn(), other)
    conflicting = %{meal("Other client") | id: f.meal.id}
    body = json_response(patch(conn, f.path, %{meals: [conflicting]}), 422)
    assert body["error_detail"]["fields"]["id"] == ["has already been taken"]
    assert Repo.get!(Client, other.id).last_change_seq == 0
    assert_unchanged(f)
  end

  test "entry id collision rolls back the new meal and journal", f do
    conflicting = meal("New meal")
    entry = %{hd(conflicting.entries) | id: hd(f.meal.entries).id}
    body = json_response(patch(f.conn, f.path, %{meals: [%{conflicting | entries: [entry]}]}), 422)
    assert body["error_detail"]["fields"]["id"] == ["has already been taken"]
    assert_unchanged(f)
  end

  test "reused entry request rolls back the meal revision and changes", f do
    old_entry = hd(f.meal.entries)
    duplicate = %{old_entry | id: Ecto.UUID.generate()}
    changed = %{f.meal | request_id: Ecto.UUID.generate(), expected_revision: 1, entries: [old_entry, duplicate]}
    body = json_response(patch(f.conn, f.path, %{meals: [changed]}), 422)
    assert body["error_detail"]["fields"]["request_id"] == ["has already been taken"]
    assert Repo.get!(DiaryMeal, f.meal.id).revision == 1
    assert_unchanged(f)
  end

  defp assert_unchanged(f) do
    assert Repo.aggregate(DiaryMeal, :count) == 1
    assert Repo.aggregate(DiaryEntry, :count) == 1
    assert Repo.get!(Client, f.client.id).last_change_seq == 1
    assert Repo.query!("SELECT count(*) FROM record_changes WHERE client_id=$1", [Ecto.UUID.dump!(f.client.id)]).rows == [[2]]
  end

  defp meal(name) do
    %{
      id: Ecto.UUID.generate(),
      request_id: Ecto.UUID.generate(),
      expected_revision: 0,
      plan_revision_id: nil,
      slot_id: nil,
      chosen_meal_id: nil,
      name: name,
      entries: [
        %{
          id: Ecto.UUID.generate(),
          request_id: Ecto.UUID.generate(),
          planned_item_id: nil,
          source: nil,
          portion: nil,
          name: "Quick add",
          nutrients: %{energy_kcal: 50}
        }
      ]
    }
  end
end
