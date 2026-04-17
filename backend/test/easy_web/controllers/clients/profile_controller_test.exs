defmodule EasyWeb.Clients.ProfileControllerTest do
  use Easy.ConnCase

  describe "GET /v1/client/me" do
    test "returns client profile with coach info and workout_streak" do
      coach = insert(:coach, first_name: "Rajat", last_name: "Jain", phone: "+91 99999 12345")
      user = insert(:user, email_confirmed_at: DateTime.utc_now(:second))

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          user: user,
          first_name: "Vikas",
          last_name: "Kumar",
          phone: "+91 98765 43210",
          status: :active
        )

      conn =
        build_conn()
        |> authenticate_client(client)
        |> get("/v1/client/me")

      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == client.id
      assert data["email"] == client.email
      assert data["first_name"] == "Vikas"
      assert data["last_name"] == "Kumar"
      assert data["phone"] == "+91 98765 43210"
      assert data["status"] == "active"
      refute Map.has_key?(data, "business_id")

      assert %{
               "first_name" => "Rajat",
               "last_name" => "Jain",
               "phone" => "+91 99999 12345",
               "photo_url" => nil,
               "business_name" => _
             } = data["coach"]

      assert %{"current" => 0, "includes_today" => false} = data["workout_streak"]
    end

    test "returns coach photo_url when set" do
      coach =
        insert(:coach,
          first_name: "Rajat",
          photo_url: "https://example.com/rajat.jpg"
        )

      user = insert(:user, email_confirmed_at: DateTime.utc_now(:second))

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          user: user,
          status: :active
        )

      conn =
        build_conn()
        |> authenticate_client(client)
        |> get("/v1/client/me")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["coach"]["photo_url"] == "https://example.com/rajat.jpg"
      assert data["coach"]["first_name"] == "Rajat"
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> get("/v1/client/me")
      assert json_response(conn, 403)
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

  describe "PATCH /v1/client/me" do
    test "updates first_name, last_name, and phone" do
      coach = insert(:coach)
      user = insert(:user, email_confirmed_at: DateTime.utc_now(:second))

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          user: user,
          first_name: "Old",
          last_name: "Name",
          phone: "000",
          status: :active
        )

      conn =
        build_conn()
        |> authenticate_client(client)
        |> patch("/v1/client/me", %{
          "first_name" => "New",
          "last_name" => "Person",
          "phone" => "+91 11111 22222"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["first_name"] == "New"
      assert data["last_name"] == "Person"
      assert data["phone"] == "+91 11111 22222"
      assert data["status"] == "active"
      assert is_map(data["coach"])
    end

    test "partial update works (only phone)" do
      coach = insert(:coach)
      user = insert(:user, email_confirmed_at: DateTime.utc_now(:second))

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          user: user,
          first_name: "Keep",
          last_name: "This",
          status: :active
        )

      conn =
        build_conn()
        |> authenticate_client(client)
        |> patch("/v1/client/me", %{"phone" => "+91 99999 00000"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["first_name"] == "Keep"
      assert data["last_name"] == "This"
      assert data["phone"] == "+91 99999 00000"
    end

    test "ignores email, status, and notes fields" do
      coach = insert(:coach)
      user = insert(:user, email_confirmed_at: DateTime.utc_now(:second))

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          user: user,
          email: "original@test.com",
          status: :active,
          notes: "original notes"
        )

      conn =
        build_conn()
        |> authenticate_client(client)
        |> patch("/v1/client/me", %{
          "email" => "hacked@evil.com",
          "status" => "archived",
          "notes" => "hacked notes",
          "first_name" => "Updated"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["first_name"] == "Updated"
      assert data["email"] == "original@test.com"
      assert data["status"] == "active"

      # Verify in DB
      reloaded = Easy.Repo.get!(Easy.Clients.Client, client.id)
      assert reloaded.notes == "original notes"
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> patch("/v1/client/me", %{"first_name" => "X"})
      assert json_response(conn, 403)
    end
  end
end
