defmodule EasyWeb.Coaches.TeamControllerTest do
  use Easy.ConnCase, async: true

  setup %{conn: conn} do
    business = insert(:business)
    owner = insert(:coach, business: business, user: business.owner)
    trainer = insert(:coach, business: business)
    %{conn: authenticate_coach(conn, owner), trainer: trainer, business: business, owner: owner}
  end

  test "owner invites resends revokes and filters coaches", %{conn: conn} do
    assert %{"data" => invited} = post(conn, "/v1/coach/coaches", %{full_name: "New Coach", preferred_name: "New", email: "coach@example.test"}) |> json_response(200)
    assert invited["state"] == "invited"
    assert invited["invite_url"]
    assert %{"data" => renewed} = post(conn, "/v1/coach/coaches/#{invited["id"]}/invite") |> json_response(200)
    assert renewed["invite_url"] != invited["invite_url"]
    assert %{"count" => 1, "data" => [found]} = get(conn, "/v1/coach/coaches", %{state: "invited", q: "New Coach"}) |> json_response(200)
    assert found["id"] == invited["id"]
    assert delete(conn, "/v1/coach/coaches/#{invited["id"]}") |> json_response(200)
  end

  test "removal reassigns clients and protects owner and tenant", %{conn: conn, trainer: trainer, business: business, owner: owner} do
    client = insert(:client, business: business, coach: trainer)
    assert %{"data" => removed} = post(conn, "/v1/coach/coaches/#{trainer.id}/remove") |> json_response(200)
    assert removed["state"] == "removed"
    assert removed["removed_on"] == Date.to_iso8601(Date.utc_today())
    assert Easy.Repo.get!(Easy.Clients.Client, client.id).coach_id == owner.id
    assert post(conn, "/v1/coach/coaches/#{owner.id}/remove") |> json_response(422)
    assert get(conn, "/v1/coach/coaches/#{insert(:coach).id}") |> json_response(404)
  end

  test "reinviting a removed coach returns and lists a usable invitation with its expiry", %{conn: conn, trainer: trainer} do
    assert post(conn, "/v1/coach/coaches/#{trainer.id}/remove") |> json_response(200)

    assert %{"data" => invited} =
             post(conn, "/v1/coach/coaches", %{full_name: trainer.full_name, email: trainer.email}) |> json_response(200)

    assert invited["id"] == trainer.id
    assert invited["state"] == "invited"
    assert is_binary(invited["invite_url"])
    assert is_binary(invited["invitation_expires_at"])
    assert invited["invitation_expired"] == false
    assert %{"count" => 1, "data" => [listed]} = get(conn, "/v1/coach/coaches", %{state: "invited"}) |> json_response(200)
    assert listed["invite_url"] == invited["invite_url"]
    assert listed["invitation_expires_at"] == invited["invitation_expires_at"]

    assert %{"data" => resent} = post(conn, "/v1/coach/coaches/#{trainer.id}/invite") |> json_response(200)
    assert is_binary(resent["invite_url"])
    assert resent["invite_url"] != invited["invite_url"]
    assert resent["removed_on"] == Date.to_iso8601(Date.utc_today())
  end

  test "trainers cannot invite or list the team", %{trainer: trainer} do
    conn = build_conn() |> authenticate_coach(trainer)
    assert get(conn, "/v1/coach/coaches") |> json_response(403)
    assert post(conn, "/v1/coach/coaches", %{full_name: "No", email: "no@example.test"}) |> json_response(403)
  end
end
