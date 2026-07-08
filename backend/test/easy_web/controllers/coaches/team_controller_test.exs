defmodule EasyWeb.Coaches.TeamControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

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
      trainer: trainer,
      business: business
    }
  end

  describe "GET /v1/coach/team" do
    test "owner sees every trainer with is_owner computed", %{
      owner_conn: conn,
      owner_coach: owner_coach,
      trainer: trainer
    } do
      conn = get(conn, "/v1/coach/team")
      assert %{"data" => data} = json_response(conn, 200)

      assert length(data) == 2
      Enum.each(data, &assert_schema(&1, "TeamMember", EasyWeb.ApiSpec.spec()))

      owner_row = Enum.find(data, &(&1["id"] == owner_coach.id))
      trainer_row = Enum.find(data, &(&1["id"] == trainer.id))

      assert owner_row["is_owner"] == true
      assert trainer_row["is_owner"] == false
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

    test "returns 422 for a badly formatted email (CastAndValidate)", %{owner_conn: conn} do
      conn = post(conn, "/v1/coach/team/invite", %{"email" => "not-an-email"})
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
end
