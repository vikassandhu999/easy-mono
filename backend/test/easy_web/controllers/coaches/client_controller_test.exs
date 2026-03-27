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
      assert data["status"] == "pending"
      assert data["source"] == "invite"
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
      assert data["status"] == "pending"
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
    test "returns a client by id with all fields", %{conn: conn, coach: coach, business: business} do
      offer = insert(:offer, business: business)

      client =
        insert(:client,
          creator: coach,
          business: business,
          instagram_handle: "@test_fit",
          program_name: "Fat Loss 12 Weeks",
          program_start: ~D[2026-03-01],
          program_end: ~D[2026-05-24],
          payment_status: :paid,
          payment_amount: 4999,
          payment_currency: "INR",
          payment_notes: "UPI received",
          intake_answers: %{"weight" => "90"},
          offer: offer,
          source: "storefront"
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == client.id
      assert data["instagram_handle"] == "@test_fit"
      assert data["program_name"] == "Fat Loss 12 Weeks"
      assert data["program_start"] == "2026-03-01"
      assert data["program_end"] == "2026-05-24"
      assert data["payment_status"] == "paid"
      assert data["payment_amount"] == 4999
      assert data["payment_currency"] == "INR"
      assert data["payment_notes"] == "UPI received"
      assert data["intake_answers"] == %{"weight" => "90"}
      assert data["source"] == "storefront"
      assert data["offer"]["id"] == offer.id
      assert data["offer"]["name"] == offer.name
    end

    test "returns invite_url for pending clients", %{conn: conn, coach: coach, business: business} do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :pending,
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

  describe "GET /v1/coach/clients/:id - status auto-computation" do
    test "computes active when program_end is far away", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :active,
          program_end: Date.add(Date.utc_today(), 30)
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "active"
    end

    test "computes expiring when program_end within 7 days", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :active,
          program_end: Date.add(Date.utc_today(), 3)
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "expiring"
    end

    test "computes expired when program_end in the past", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :active,
          program_end: Date.add(Date.utc_today(), -5)
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "expired"
    end

    test "status_override bypasses auto-computation", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :active,
          program_end: Date.add(Date.utc_today(), 3),
          status_override: "archived"
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "archived"
      assert data["status_override"] == "archived"
    end

    test "pending stays pending regardless of dates", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :pending,
          program_end: Date.add(Date.utc_today(), 3)
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "pending"
    end
  end

  describe "POST /v1/coach/clients/:id/resend-invite" do
    test "resends invite for pending client with email", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :pending,
          email: "invited@test.com",
          invitation_token: "existing-token"
        )

      conn = post(conn, "/v1/coach/clients/#{client.id}/resend-invite")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == client.id
      assert data["status"] == "pending"
    end

    test "returns 422 for pending client without email", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :pending,
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
        insert(:client, creator: other_coach, business: other_coach.business, status: :pending)

      conn = post(conn, "/v1/coach/clients/#{client.id}/resend-invite")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/clients/:id" do
    test "updates basic fields", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"first_name" => "Updated Name"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == client.id
      assert data["first_name"] == "Updated Name"
    end

    test "updates program fields", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :pending)

      attrs = %{
        "program_name" => "Fat Loss 12 Weeks",
        "program_start" => "2026-03-01",
        "program_end" => "2026-05-24"
      }

      conn = patch(conn, "/v1/coach/clients/#{client.id}", attrs)
      assert %{"data" => data} = json_response(conn, 200)

      assert data["program_name"] == "Fat Loss 12 Weeks"
      assert data["program_start"] == "2026-03-01"
      assert data["program_end"] == "2026-05-24"
    end

    test "updates payment fields", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)

      attrs = %{
        "payment_status" => "paid",
        "payment_amount" => 4999,
        "payment_currency" => "INR",
        "payment_notes" => "UPI received"
      }

      conn = patch(conn, "/v1/coach/clients/#{client.id}", attrs)
      assert %{"data" => data} = json_response(conn, 200)

      assert data["payment_status"] == "paid"
      assert data["payment_amount"] == 4999
      assert data["payment_notes"] == "UPI received"
    end

    test "updates status_override", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :active)

      conn =
        patch(conn, "/v1/coach/clients/#{client.id}", %{"status_override" => "archived"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "archived"
      assert data["status_override"] == "archived"
    end

    test "rejects invalid status_override", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)

      conn =
        patch(conn, "/v1/coach/clients/#{client.id}", %{"status_override" => "garbage"})

      assert json_response(conn, 422)
    end

    test "returns 404 for non-existent client", %{conn: conn} do
      conn = patch(conn, "/v1/coach/clients/#{Ecto.UUID.generate()}", %{"first_name" => "Foo"})
      assert json_response(conn, 404)
    end
  end

  describe "GET /v1/coach/clients" do
    test "returns paginated list with summary", %{conn: conn, coach: coach, business: business} do
      insert(:client, creator: coach, business: business, status: :active)
      insert(:client, creator: coach, business: business, status: :pending)

      insert(:client,
        creator: coach,
        business: business,
        status: :active,
        payment_status: :pending
      )

      conn = get(conn, "/v1/coach/clients")
      assert %{"data" => clients, "count" => 3, "summary" => summary} = json_response(conn, 200)

      assert length(clients) == 3
      assert is_map(summary)
      assert Map.has_key?(summary, "active")
      assert Map.has_key?(summary, "expiring")
      assert Map.has_key?(summary, "pending")
      assert Map.has_key?(summary, "expired")
      assert Map.has_key?(summary, "payment_due")
      assert summary["pending"] == 1
      assert summary["payment_due"] == 1
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
      assert %{"data" => [], "count" => 0, "summary" => summary} = json_response(conn, 200)
      assert summary["active"] == 0
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

    test "filters by payment_status", %{conn: conn, coach: coach, business: business} do
      insert(:client,
        creator: coach,
        business: business,
        status: :active,
        payment_status: :pending
      )

      insert(:client,
        creator: coach,
        business: business,
        status: :active,
        payment_status: :paid
      )

      insert(:client, creator: coach, business: business, status: :active, payment_status: nil)

      conn = get(conn, "/v1/coach/clients", %{"payment_status" => "pending"})
      assert %{"data" => clients, "count" => 1} = json_response(conn, 200)
      assert hd(clients)["payment_status"] == "pending"
    end
  end
end
