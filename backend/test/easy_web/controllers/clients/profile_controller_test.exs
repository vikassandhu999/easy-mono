defmodule EasyWeb.Clients.ProfileControllerTest do
  use Easy.ConnCase

  alias Easy.Clients.Client

  describe "GET /v1/client/me" do
    test "returns client profile with coach info" do
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
          goal_weight_value: Decimal.new("82.5"),
          goal_weight_unit: :lbs,
          subscription_started_on: ~D[2026-07-01],
          subscription_ends_on: ~D[2026-09-30],
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
      assert data["goal_weight_value"] == "82.50"
      assert data["goal_weight_unit"] == "lbs"
      assert data["default_weight_unit"] == "kg"
      assert data["timezone"] == client.timezone
      assert data["local_date"] == Date.to_iso8601(Client.local_date(client, DateTime.utc_now()))
      assert data["status"] == "active"
      assert data["subscription_started_on"] == "2026-07-01"
      assert data["subscription_ends_on"] == "2026-09-30"
      refute Map.has_key?(data, "business_id")

      assert Map.keys(data) |> Enum.sort() == [
               "coach",
               "default_weight_unit",
               "email",
               "first_name",
               "goal_weight_unit",
               "goal_weight_value",
               "id",
               "last_name",
               "local_date",
               "phone",
               "status",
               "subscription_ends_on",
               "subscription_started_on",
               "timezone"
             ]

      assert %{
               "first_name" => "Rajat",
               "last_name" => "Jain",
               "phone" => "+91 99999 12345",
               "business_name" => _
             } = data["coach"]

      assert Map.keys(data["coach"]) |> Enum.sort() == ["business_name", "first_name", "last_name", "phone"]
    end

    test "returns assigned coach's info when business has multiple coaches" do
      business = insert(:business)
      owner_coach = insert(:coach, business: business)
      assigned_coach = insert(:coach, business: business, first_name: "Assigned", last_name: "Coach")

      user = insert(:user, email_confirmed_at: DateTime.utc_now(:second))

      client =
        insert(:client,
          business: business,
          creator: owner_coach,
          assigned_coach: assigned_coach,
          user: user,
          status: :active
        )

      conn =
        build_conn()
        |> authenticate_client(client)
        |> get("/v1/client/me")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["coach"]["first_name"] == "Assigned"
      assert data["coach"]["last_name"] == "Coach"
    end

    test "returns nil coach when client has no assigned coach" do
      coach = insert(:coach)
      user = insert(:user, email_confirmed_at: DateTime.utc_now(:second))

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          assigned_coach: nil,
          user: user,
          status: :active
        )

      conn =
        build_conn()
        |> authenticate_client(client)
        |> get("/v1/client/me")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["coach"] == nil
    end

    test "returns 422 when query has an extra key" do
      coach = insert(:coach)
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
        |> get("/v1/client/me", %{"nope" => "1"})

      assert %{"error_code" => "invalid_input"} = json_response(conn, 422)
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
    test "saves and clears the client's own goal without changing contact details or another client" do
      client = insert(:client, status: :active, first_name: "Keep")
      other = insert(:client, business: client.business, status: :active)

      for {body, expected_value, expected_unit} <- [
            {%{"goal_weight_value" => 72.5, "goal_weight_unit" => "kg"}, "72.50", "kg"},
            {%{"goal_weight_value" => 160, "goal_weight_unit" => "lbs"}, "160.00", "lbs"},
            {%{"goal_weight_value" => nil}, nil, nil},
            {%{"goal_weight_value" => 75, "goal_weight_unit" => "kg"}, "75.00", "kg"},
            {%{"goal_weight_unit" => nil}, nil, nil}
          ] do
        conn = build_conn() |> authenticate_client(client) |> patch("/v1/client/me", body)
        assert %{"data" => data} = json_response(conn, 200)
        assert if(expected_value, do: Decimal.equal?(data["goal_weight_value"], expected_value), else: is_nil(data["goal_weight_value"]))
        assert data["goal_weight_unit"] == expected_unit
        assert data["first_name"] == "Keep"

        read = build_conn() |> authenticate_client(client) |> get("/v1/client/me")
        assert json_response(read, 200)["data"]["goal_weight_value"] == expected_value
        assert Easy.Repo.get!(Client, other.id).goal_weight_value == nil
      end
    end

    test "rejects invalid and unpaired goals without writing" do
      client = insert(:client, status: :active)

      for body <- [
            %{"goal_weight_value" => 0, "goal_weight_unit" => "kg"},
            %{"goal_weight_value" => -1, "goal_weight_unit" => "kg"},
            %{"goal_weight_value" => 1000, "goal_weight_unit" => "kg"},
            %{"goal_weight_value" => 72, "goal_weight_unit" => "stone"},
            %{"goal_weight_value" => 72},
            %{"goal_weight_unit" => "kg"}
          ] do
        conn = build_conn() |> authenticate_client(client) |> patch("/v1/client/me", body)
        assert json_response(conn, 422)
        assert Easy.Repo.get!(Client, client.id).goal_weight_value == nil
        assert Easy.Repo.get!(Client, client.id).goal_weight_unit == nil
      end
    end

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
        |> put_req_header("content-type", "application/json")
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
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/client/me", %{"phone" => "+91 99999 00000"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["first_name"] == "Keep"
      assert data["last_name"] == "This"
      assert data["phone"] == "+91 99999 00000"
    end

    test "only updates allowed fields (first_name, last_name, phone)" do
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
        |> put_req_header("content-type", "application/json")
        |> patch("/v1/client/me", %{
          "first_name" => "Updated"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["first_name"] == "Updated"
      assert data["email"] == "original@test.com"
      assert data["status"] == "active"

      reloaded = Easy.Repo.get!(Easy.Clients.Client, client.id)
      assert reloaded.notes == "original notes"
    end

    test "returns 422 when body has an extra key" do
      coach = insert(:coach)
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
        |> patch("/v1/client/me", %{"first_name" => "New", "nope" => true})

      assert %{"error_code" => "invalid_input"} = json_response(conn, 422)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> patch("/v1/client/me", %{"first_name" => "X"})
      assert json_response(conn, 403)
    end
  end
end
