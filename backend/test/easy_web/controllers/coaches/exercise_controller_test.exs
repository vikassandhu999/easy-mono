defmodule EasyWeb.Coaches.ExerciseControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/exercises" do
    test "creates exercise", %{conn: conn} do
      attrs = build(:exercise_attrs)

      conn = post(conn, "/v1/coach/exercises", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["name"] == attrs["name"]
      assert data["mechanics"] == attrs["mechanics"]
      assert data["force"] == attrs["force"]
    end

    test "returns 422 for invalid payload", %{conn: conn} do
      conn = post(conn, "/v1/coach/exercises", %{"description" => "missing name"})
      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/exercises" do
    test "lists business and system exercises", %{conn: conn, business: business} do
      insert(:exercise, business: business)
      insert(:exercise, business: nil)

      other = insert(:coach)
      insert(:exercise, business: other.business)

      conn = get(conn, "/v1/coach/exercises")
      assert %{"data" => data, "count" => count} = json_response(conn, 200)

      assert count == 2
      assert length(data) == 2
    end
  end

  describe "GET /v1/coach/exercises/:id" do
    test "shows exercise in business", %{conn: conn, business: business} do
      exercise = insert(:exercise, business: business)

      conn = get(conn, "/v1/coach/exercises/#{exercise.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == exercise.id
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:coach)
      exercise = insert(:exercise, business: other.business)

      conn = get(conn, "/v1/coach/exercises/#{exercise.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/exercises/:id" do
    test "updates business exercise", %{conn: conn, business: business} do
      exercise = insert(:exercise, business: business)

      conn = patch(conn, "/v1/coach/exercises/#{exercise.id}", %{"name" => "Updated"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated"
    end

    test "cannot update system exercise", %{conn: conn} do
      exercise = insert(:exercise, business: nil)

      conn = patch(conn, "/v1/coach/exercises/#{exercise.id}", %{"name" => "Nope"})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/exercises/:id" do
    test "deletes business exercise", %{conn: conn, business: business} do
      exercise = insert(:exercise, business: business)

      conn = delete(conn, "/v1/coach/exercises/#{exercise.id}")
      assert response(conn, 204)
    end
  end

  describe "POST /v1/coach/exercises/:id/duplicate" do
    test "duplicates system exercise into business", %{conn: conn, business: business} do
      exercise = insert(:exercise, business: nil, name: "Deadlift")

      conn = post(conn, "/v1/coach/exercises/#{exercise.id}/duplicate")
      assert %{"data" => data} = json_response(conn, 201)

      assert data["name"] == "Deadlift (Copy)"
      assert data["business_id"] == business.id
    end
  end
end
