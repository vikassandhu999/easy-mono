defmodule EasyWeb.Coaches.PerformedSetControllerTest do
  use Easy.ConnCase

  # Coach performed-set write routes have been removed.
  # All coach performed-set routes (POST/PATCH/DELETE) are gone as of Task 9.
  # Coaches access performed sets through read-only training-session endpoints.

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "coach performed-set write routes are gone" do
    test "POST /v1/coach/performed_sets returns 404", %{conn: conn} do
      conn = post(conn, "/v1/coach/performed_sets", %{})
      assert json_response(conn, 404)
    end

    test "PATCH /v1/coach/performed_sets/:id returns 404", %{conn: conn} do
      conn = patch(conn, "/v1/coach/performed_sets/some-id", %{})
      assert json_response(conn, 404)
    end

    test "DELETE /v1/coach/performed_sets/:id returns 404", %{conn: conn} do
      conn = delete(conn, "/v1/coach/performed_sets/some-id")
      assert json_response(conn, 404)
    end
  end
end
