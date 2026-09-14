defmodule EasyWeb.Coaches.TeamControllerTest do
  use Easy.ConnCase

  setup do
    owner_user = insert(:user)
    business = insert(:business, owner: owner_user)
    owner_coach = insert(:coach, user: owner_user, business: business)

    owner_conn =
      build_conn() |> authenticate_coach(owner_coach) |> put_req_header("content-type", "application/json")

    trainer = insert(:coach, business: business)

    trainer_conn =
      build_conn() |> authenticate_coach(trainer) |> put_req_header("content-type", "application/json")

    %{
      owner_conn: owner_conn,
      trainer_conn: trainer_conn,
      owner_coach: owner_coach,
      owner_user: owner_user,
      trainer: trainer,
      business: business
    }
  end

  describe "GET /v1/coach/team" do
    test "owner sees every trainer with is_owner computed", %{
      owner_conn: conn,
      owner_coach: owner_coach,
      owner_user: owner_user,
      trainer: trainer
    } do
      conn = get(conn, "/v1/coach/team")
      assert %{"data" => data} = json_response(conn, 200)

      assert length(data) == 2

      owner_row = Enum.find(data, &(&1["id"] == owner_coach.id))
      trainer_row = Enum.find(data, &(&1["id"] == trainer.id))

      assert owner_row == %{
               "assigned_client_count" => 0,
               "email" => owner_user.email,
               "first_name" => owner_coach.first_name,
               "id" => owner_coach.id,
               "invitation_expired" => false,
               "invitation_expires_at" => nil,
               "invitation_sent_at" => nil,
               "is_owner" => true,
               "last_name" => owner_coach.last_name,
               "status" => "active"
             }

      assert trainer_row == %{
               "assigned_client_count" => 0,
               "email" => Easy.Repo.preload(trainer, :user).user.email,
               "first_name" => trainer.first_name,
               "id" => trainer.id,
               "invitation_expired" => false,
               "invitation_expires_at" => nil,
               "invitation_sent_at" => nil,
               "is_owner" => false,
               "last_name" => trainer.last_name,
               "status" => "active"
             }
    end

    test "reports actual assigned-client counts on the list and detail", %{
      owner_conn: conn,
      trainer: trainer,
      business: business
    } do
      insert(:client, business: business, assigned_coach: trainer)
      insert(:client, business: business, assigned_coach: trainer)

      conn = get(conn, "/v1/coach/team")
      assert %{"data" => rows} = json_response(conn, 200)
      assert %{"assigned_client_count" => 2} = Enum.find(rows, &(&1["id"] == trainer.id))

      conn = get(conn, "/v1/coach/team/#{trainer.id}")
      assert %{"data" => %{"assigned_client_count" => 2}} = json_response(conn, 200)
    end

    test "returns 422 for an extra query parameter", %{owner_conn: conn} do
      conn = get(conn, "/v1/coach/team?unexpected=true")
      assert json_response(conn, 422)
    end

    test "cursor pages tied timestamps, survives a deleted anchor, and filters independently", %{
      owner_conn: conn,
      business: business
    } do
      stamp = ~U[2026-09-13 08:00:00Z]
      active = insert(:coach, business: business, inserted_at: stamp, status: :active)
      invited = insert(:coach, business: business, user: nil, inserted_at: stamp, status: :invited, email: "surname%_\\@test.com")
      inactive = insert(:coach, business: business, inserted_at: stamp, status: :inactive)

      first = conn |> get("/v1/coach/team?cursor=start&limit=1") |> json_response(200)
      assert %{"data" => [_], "count" => 5, "next_cursor" => cursor} = first
      Easy.Repo.delete!(active)

      second = conn |> recycle() |> get("/v1/coach/team?cursor=#{cursor}&limit=10") |> json_response(200)
      assert %{"count" => 4, "data" => rows} = second
      refute Enum.any?(rows, &(&1["id"] == active.id))

      filtered = conn |> recycle() |> get("/v1/coach/team?cursor=start&status=active&limit=10") |> json_response(200)
      assert %{"count" => 2, "data" => active_rows} = filtered
      assert Enum.all?(active_rows, &(&1["status"] == "active"))
      refute Enum.any?(active_rows, &(&1["id"] == inactive.id))

      search = conn |> recycle() |> get("/v1/coach/team?cursor=start&search=%25_%5C&limit=10") |> json_response(200)
      assert %{"data" => [%{"id" => id}]} = search
      assert id == invited.id
    end

    test "rejects malformed member ids and hides foreign members", %{owner_conn: conn} do
      assert json_response(get(conn, "/v1/coach/team/not-a-uuid"), 422)
      foreign = insert(:coach)
      assert json_response(get(recycle(conn), "/v1/coach/team/#{foreign.id}"), 404)
    end

    test "non-owner trainer gets 403", %{trainer_conn: conn} do
      conn = get(conn, "/v1/coach/team")
      assert json_response(conn, 403)
    end
  end

  describe "POST /v1/coach/team/invite" do
    test "owner invites a new trainer", %{owner_conn: conn} do
      conn = post(conn, "/v1/coach/team/invite", %{"email" => "new-trainer@test.com", "first_name" => "New"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["email"] == "new-trainer@test.com"
      assert data["status"] == "invited"
      assert data["is_owner"] == false
      assert data["invitation_sent_at"]
    end

    test "non-owner trainer gets 403", %{trainer_conn: conn} do
      conn = post(conn, "/v1/coach/team/invite", %{"email" => "new-trainer@test.com"})
      assert json_response(conn, 403)
    end

    test "returns 422 for an email already active on the team", %{owner_conn: conn, trainer: trainer} do
      conn = post(conn, "/v1/coach/team/invite", %{"email" => trainer.email})
      assert %{"error_detail" => %{"fields" => %{"email" => _}}} = json_response(conn, 422)
    end

    test "returns 422 for a badly formatted email", %{owner_conn: conn} do
      conn = post(conn, "/v1/coach/team/invite", %{"email" => "not-an-email"})
      assert json_response(conn, 422)
    end

    test "returns 422 for an extra body field", %{owner_conn: conn} do
      conn =
        post(conn, "/v1/coach/team/invite", %{
          "email" => "new-trainer@test.com",
          "unexpected" => true
        })

      assert json_response(conn, 422)
    end
  end

  describe "POST /v1/coach/team/:id/resend-invite" do
    test "resends an invited trainer's invitation", %{owner_conn: conn, business: business} do
      invited = insert(:coach, business: business, user: nil, status: :invited, invitation_token: "tok-a")

      conn = post(conn, "/v1/coach/team/#{invited.id}/resend-invite")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "invited"
    end

    test "returns 404 for an already-active coach", %{owner_conn: conn, trainer: trainer} do
      conn = post(conn, "/v1/coach/team/#{trainer.id}/resend-invite")
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/team/:id" do
    test "revokes an invited trainer's invitation", %{owner_conn: conn, business: business} do
      invited = insert(:coach, business: business, user: nil, status: :invited, invitation_token: "tok-b")

      conn = delete(conn, "/v1/coach/team/#{invited.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == invited.id

      refute Easy.Repo.get(Easy.Orgs.Coach, invited.id)
    end

    test "returns 404 for an already-active coach", %{owner_conn: conn, trainer: trainer} do
      conn = delete(conn, "/v1/coach/team/#{trainer.id}")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/team/:id/deactivate" do
    test "deactivates an active trainer", %{owner_conn: conn, trainer: trainer} do
      conn = post(conn, "/v1/coach/team/#{trainer.id}/deactivate")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "inactive"

      updated = Easy.Repo.get!(Easy.Orgs.Coach, trainer.id)
      assert updated.status == :inactive
    end

    test "returns 422 when the owner tries to deactivate themselves", %{
      owner_conn: conn,
      owner_coach: owner_coach
    } do
      conn = post(conn, "/v1/coach/team/#{owner_coach.id}/deactivate")
      assert json_response(conn, 422)
    end
  end

  describe "POST /v1/coach/team/:id/reactivate" do
    test "reactivates an inactive trainer", %{owner_conn: conn, business: business} do
      inactive = insert(:coach, business: business, status: :inactive)

      conn = post(conn, "/v1/coach/team/#{inactive.id}/reactivate")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "active"

      updated = Easy.Repo.get!(Easy.Orgs.Coach, inactive.id)
      assert updated.status == :active
    end

    test "returns 404 for an active trainer", %{owner_conn: conn, trainer: trainer} do
      conn = post(conn, "/v1/coach/team/#{trainer.id}/reactivate")
      assert json_response(conn, 404)
    end

    test "non-owner gets 403", %{trainer_conn: conn, business: business} do
      inactive = insert(:coach, business: business, status: :inactive)

      conn = post(conn, "/v1/coach/team/#{inactive.id}/reactivate")
      assert json_response(conn, 403)
    end
  end
end
