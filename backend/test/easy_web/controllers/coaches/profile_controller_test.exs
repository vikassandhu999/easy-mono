defmodule EasyWeb.Coaches.ProfileControllerTest do
  use Easy.ConnCase, async: true

  test "profile reads and writes canonical names, handle and phone", %{conn: conn} do
    business = insert(:business)
    coach = insert(:coach, business: business, user: business.owner)
    conn = authenticate_coach(conn, coach)
    assert %{"data" => profile} = get(conn, "/v1/coach/me") |> json_response(200)
    assert profile["business"]["handle"] == business.handle
    assert profile["is_owner"]
    attrs = %{full_name: "Full Name", preferred_name: "Short", phone: "123", business_name: "Studio"}
    assert %{"data" => updated} = conn |> patch("/v1/coach/me", attrs) |> json_response(200)
    assert updated["full_name"] == "Full Name"
    assert updated["preferred_name"] == "Short"
    assert updated["business"]["name"] == "Studio"
    assert patch(conn, "/v1/coach/me", %{first_name: "Old"}) |> json_response(422)
  end

  test "trainer cannot change business or partially update mixed profile edits", %{conn: conn} do
    coach = insert(:coach)
    conn = authenticate_coach(conn, coach)
    assert patch(conn, "/v1/coach/me", %{full_name: "Forbidden", business_name: "No"}) |> json_response(403)
    assert Easy.Repo.get!(Easy.Orgs.Coach, coach.id).full_name == coach.full_name
  end
end
