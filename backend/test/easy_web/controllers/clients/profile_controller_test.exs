defmodule EasyWeb.Clients.ProfileControllerTest do
  use Easy.ConnCase

  describe "GET /v1/client/me" do
    test "returns client profile" do
      coach = insert(:coach)
      user = insert(:user, email_confirmed_at: DateTime.utc_now(:second))

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          user: user,
          status: :active,
          program_name: "12 Week Shred"
        )

      conn =
        build_conn()
        |> authenticate_client(client)
        |> get("/v1/client/me")

      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == client.id
      assert data["email"] == client.email
      assert data["first_name"] == client.first_name
      assert data["last_name"] == client.last_name
      assert data["program_name"] == "12 Week Shred"
      assert data["business_id"] == coach.business_id
    end

    test "returns 401 without auth token" do
      conn = build_conn() |> get("/v1/client/me")
      assert json_response(conn, 401)
    end

    test "returns 403 with coach auth token" do
      coach = insert(:coach)

      conn =
        build_conn()
        |> authenticate_coach(coach)
        |> get("/v1/client/me")

      assert json_response(conn, 403)
    end
  end
end
