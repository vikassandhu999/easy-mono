defmodule EasyWeb.Clients.ProfileControllerTest do
  use Easy.ConnCase

  alias Easy.Clients.Client
  alias Easy.Repo

  describe "GET /v1/client/me" do
    test "returns full and preferred names, client units, applied calendar and current term" do
      business = insert(:business, timezone: "Etc/UTC")
      coach = insert(:coach, business: business, full_name: "Rajat Jain", preferred_name: "Raj", phone: "+91 99999 12345")
      today = Date.utc_today()
      term = build(:coaching_term, starts_on: Date.add(today, -30))

      client =
        insert(:client,
          business: business,
          coach: coach,
          full_name: "Vikas Kumar",
          preferred_name: "Vik",
          phone: "+91 98765 43210",
          timezone: nil,
          unit_system: :imperial,
          terms: [term]
        )

      conn = build_conn() |> authenticate_client(client) |> get("/v1/client/me")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == client.id
      assert data["email"] == client.email
      assert data["full_name"] == "Vikas Kumar"
      assert data["preferred_name"] == "Vik"
      assert data["phone"] == "+91 98765 43210"
      assert data["unit_system"] == "imperial"
      assert data["timezone"] == "Etc/UTC"
      assert data["local_date"] == Date.to_iso8601(today)
      assert data["state"] == "active"
      assert data["current_term"]["starts_on"] == Date.to_iso8601(Date.add(today, -30))
      assert data["current_term"]["ends_on"] == nil
      assert data["terms"] == [data["current_term"]]
      refute Map.has_key?(data, "business_id")

      assert Enum.sort(Map.keys(data)) == Enum.sort(~w(coach current_term email focus full_name id local_date phone preferred_name state terms timezone unit_system))

      assert data["coach"] == %{
               "full_name" => "Rajat Jain",
               "preferred_name" => "Raj",
               "phone" => "+91 99999 12345",
               "business_name" => business.name
             }
    end

    test "returns the assigned coach when a business has multiple coaches" do
      business = insert(:business)
      insert(:coach, business: business)
      assigned = insert(:coach, business: business, full_name: "Assigned Coach", preferred_name: "Sam")
      client = insert(:client, business: business, coach: assigned)

      conn = build_conn() |> authenticate_client(client) |> get("/v1/client/me")
      assert %{"data" => %{"coach" => %{"full_name" => "Assigned Coach", "preferred_name" => "Sam"}}} = json_response(conn, 200)
    end

    test "joined and ended clients keep read access with their derived state and term history" do
      today = Date.utc_today()
      ended = build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, -1))

      for {state, terms} <- [{"joined", []}, {"ended", [ended]}] do
        client = insert(:client, terms: terms, timezone: "Etc/UTC")
        conn = build_conn() |> authenticate_client(client) |> get("/v1/client/me")
        assert %{"data" => data} = json_response(conn, 200)
        assert data["state"] == state
        assert data["current_term"] == nil
        assert data["full_name"] == client.full_name
        assert Enum.map(data["terms"], & &1["ends_on"]) == Enum.map(terms, &Date.to_iso8601(&1.ends_on))
      end
    end

    test "returns 422 when query has an extra key" do
      client = insert(:client)
      conn = build_conn() |> authenticate_client(client) |> get("/v1/client/me", %{"nope" => "1"})
      assert %{"error_code" => "invalid_input"} = json_response(conn, 422)
    end

    test "rejects missing auth, coach auth and a client identity from another business" do
      client = insert(:client)
      foreign = %{client | business_id: insert(:business).id}

      for conn <- [build_conn(), authenticate_coach(build_conn(), insert(:coach))] do
        conn = get(conn, "/v1/client/me")
        assert %{"error_code" => _} = json_response(conn, 403)
      end

      conn = build_conn() |> authenticate_client(foreign) |> get("/v1/client/me")
      assert %{"error_code" => "not_found"} = json_response(conn, 404)
    end
  end

  describe "PATCH /v1/client/me" do
    test "updates full name, preferred name, phone and client units" do
      client = insert(:client, full_name: "Old Name", phone: "000")

      conn =
        build_conn()
        |> authenticate_client(client)
        |> patch("/v1/client/me", %{
          "full_name" => "New Person",
          "preferred_name" => "New",
          "phone" => "+91 11111 22222",
          "unit_system" => "imperial"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["full_name"] == "New Person"
      assert data["preferred_name"] == "New"
      assert data["phone"] == "+91 11111 22222"
      assert data["unit_system"] == "imperial"
      assert data["state"] == "active"
      assert Repo.get!(Client, client.id).full_name == "New Person"
    end

    test "partial update keeps names and coach-managed profile facts" do
      client = insert(:client, full_name: "Keep This", preferred_name: "Keep", email: "original@test.com", notes: "original notes")
      conn = build_conn() |> authenticate_client(client) |> patch("/v1/client/me", %{"phone" => "+91 99999 00000"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["full_name"] == "Keep This"
      assert data["preferred_name"] == "Keep"
      assert data["phone"] == "+91 99999 00000"
      assert data["email"] == "original@test.com"
      assert Repo.get!(Client, client.id).notes == "original notes"
    end

    test "joined and ended clients cannot change their profiles" do
      today = Date.utc_today()
      ended = build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, -1))

      for terms <- [[], [ended]] do
        client = insert(:client, terms: terms, timezone: "Etc/UTC")
        conn = build_conn() |> authenticate_client(client) |> patch("/v1/client/me", %{"full_name" => "Unexpected"})
        assert %{"error_code" => "coaching_required"} = json_response(conn, 403)
        assert Repo.get!(Client, client.id).full_name == client.full_name
      end
    end

    test "the term's final local date still allows profile changes" do
      today = Date.utc_today()
      term = build(:coaching_term, starts_on: Date.add(today, -30), ends_on: today)
      client = insert(:client, terms: [term], timezone: "Etc/UTC")
      conn = build_conn() |> authenticate_client(client) |> patch("/v1/client/me", %{"full_name" => "Last day"})
      assert %{"data" => %{"full_name" => "Last day", "state" => "ending_soon"}} = json_response(conn, 200)
    end

    test "rejects invalid units and undeclared profile fields" do
      client = insert(:client)

      for attrs <- [%{"unit_system" => "kg"}, %{"full_name" => "New", "timezone" => "Europe/London"}, %{"business_id" => Ecto.UUID.generate()}] do
        conn = build_conn() |> authenticate_client(client) |> patch("/v1/client/me", attrs)
        assert %{"error_code" => "invalid_input"} = json_response(conn, 422)
        assert Repo.get!(Client, client.id).full_name == client.full_name
      end
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> patch("/v1/client/me", %{"full_name" => "X"})
      assert %{"error_code" => _} = json_response(conn, 403)
    end
  end
end
