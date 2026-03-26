defmodule EasyWeb.Coaches.ClientControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/clients/invite" do
    test "invites a client with valid params", %{conn: conn} do
      attrs = build(:client_attrs)

      conn = post(conn, "/v1/coach/clients/invite", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["email"] == attrs["email"]
      assert data["first_name"] == attrs["first_name"]
      assert data["last_name"] == attrs["last_name"]
      assert data["phone"] == attrs["phone"]
      assert data["notes"] == attrs["notes"]
      assert data["status"] == "invited"
      assert data["id"]
      assert data["inserted_at"]
      assert data["invite_url"] =~ "/invite/"
    end

    test "invites with phone only (no email)", %{conn: conn} do
      attrs = build(:client_attrs) |> Map.delete("email")

      conn = post(conn, "/v1/coach/clients/invite", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["phone"] == attrs["phone"]
      assert data["email"] == nil
      assert data["status"] == "invited"
      assert data["invite_url"] =~ "/invite/"
    end

    test "returns 422 when both email and phone are missing", %{conn: conn} do
      attrs = build(:client_attrs) |> Map.delete("email") |> Map.delete("phone")

      conn = post(conn, "/v1/coach/clients/invite", attrs)
      assert json_response(conn, 422)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> post("/v1/coach/clients/invite", %{"email" => "test@test.com"})
      assert json_response(conn, 403)
    end
  end

  describe "GET /v1/coach/clients/:id" do
    test "returns a client by id", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == client.id
      assert data["email"] == client.email
    end

    test "returns invite_url for invited clients", %{conn: conn, coach: coach, business: business} do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :invited,
          invitation_token: "test-token-abc123"
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["invite_url"] =~ "/invite/test-token-abc123"
    end

    test "returns null invite_url for active clients", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business, status: :active)

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["invite_url"] == nil
    end

    test "returns 404 for non-existent client", %{conn: conn} do
      conn = get(conn, "/v1/coach/clients/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "cannot access client from another business", %{conn: conn} do
      other_coach = insert(:coach)
      other_client = insert(:client, creator: other_coach, business: other_coach.business)

      conn = get(conn, "/v1/coach/clients/#{other_client.id}")
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/clients/:id/resend-invite" do
    test "resends invite for invited client with email", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :invited,
          email: "invited@test.com",
          invitation_token: "existing-token"
        )

      conn = post(conn, "/v1/coach/clients/#{client.id}/resend-invite")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == client.id
      assert data["status"] == "invited"
    end

    test "returns 422 for invited client without email", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :invited,
          email: nil,
          phone: "+91 99999 88888",
          invitation_token: "existing-token"
        )

      conn = post(conn, "/v1/coach/clients/#{client.id}/resend-invite")
      assert json_response(conn, 422)
    end

    test "returns 422 for active client", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :active)

      conn = post(conn, "/v1/coach/clients/#{client.id}/resend-invite")
      assert json_response(conn, 422)
    end

    test "returns 404 for other business", %{conn: conn} do
      other_coach = insert(:coach)

      client =
        insert(:client, creator: other_coach, business: other_coach.business, status: :invited)

      conn = post(conn, "/v1/coach/clients/#{client.id}/resend-invite")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/clients/:id" do
    test "updates a client", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"first_name" => "Updated Name"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == client.id
      assert data["first_name"] == "Updated Name"
    end

    test "returns 404 for non-existent client", %{conn: conn} do
      conn = patch(conn, "/v1/coach/clients/#{Ecto.UUID.generate()}", %{"first_name" => "Foo"})
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/clients" do
    test "returns paginated list of clients", %{conn: conn, coach: coach, business: business} do
      for _ <- 1..3, do: insert(:client, creator: coach, business: business)

      conn = get(conn, "/v1/coach/clients")
      assert %{"data" => clients, "count" => count} = json_response(conn, 200)

      assert count == 3
      assert length(clients) == 3
    end

    test "paginates results with offset and limit", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      for _ <- 1..5, do: insert(:client, creator: coach, business: business)

      conn = get(conn, "/v1/coach/clients", %{"offset" => "2", "limit" => "2"})
      assert %{"data" => clients, "count" => 5} = json_response(conn, 200)

      assert length(clients) == 2
    end

    test "does not return clients from another business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      insert(:client, creator: coach, business: business)

      other_coach = insert(:coach)
      insert(:client, creator: other_coach, business: other_coach.business)

      conn = get(conn, "/v1/coach/clients")
      assert %{"data" => clients, "count" => 1} = json_response(conn, 200)

      assert length(clients) == 1
    end

    test "returns empty list when no clients exist", %{conn: conn} do
      conn = get(conn, "/v1/coach/clients")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "filters by search term", %{conn: conn, coach: coach, business: business} do
      insert(:client,
        email: "jane@test.com",
        first_name: "Jane",
        last_name: "Doe",
        creator: coach,
        business: business
      )

      insert(:client,
        email: "john@test.com",
        first_name: "John",
        last_name: "Smith",
        creator: coach,
        business: business
      )

      conn = get(conn, "/v1/coach/clients", %{"search" => "jane"})
      assert %{"data" => [client], "count" => 1} = json_response(conn, 200)

      assert client["email"] == "jane@test.com"
    end

    test "filters by status", %{conn: conn, coach: coach, business: business} do
      insert(:client, status: :active, creator: coach, business: business)
      insert(:client, status: :inactive, creator: coach, business: business)

      conn = get(conn, "/v1/coach/clients", %{"status" => "inactive"})
      assert %{"data" => clients, "count" => 1} = json_response(conn, 200)

      assert Enum.all?(clients, &(&1["status"] == "inactive"))
    end
  end
end
