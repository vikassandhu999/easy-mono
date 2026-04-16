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

    test "rejects invite when email is already an active client of another business", %{
      conn: conn
    } do
      other_coach = insert(:coach)
      existing_user = insert(:user, email: "shared@email.com")

      insert(:client,
        creator: other_coach,
        business: other_coach.business,
        user: existing_user,
        status: :active
      )

      attrs = %{"email" => "shared@email.com", "first_name" => "Shared"}
      conn = post(conn, "/v1/coach/clients/invite", attrs)

      assert %{"error_detail" => %{"email" => [msg]}} = json_response(conn, 422)
      assert msg =~ "active client"
    end

    test "rejects invite when email is already an active client of the same business", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      existing_user = insert(:user, email: "dupe@email.com")

      insert(:client,
        creator: coach,
        business: business,
        user: existing_user,
        status: :active
      )

      attrs = %{"email" => "dupe@email.com", "first_name" => "Dupe"}
      conn = post(conn, "/v1/coach/clients/invite", attrs)

      assert json_response(conn, 422)
    end

    test "allows invite when email belongs to an archived client elsewhere", %{conn: conn} do
      other_coach = insert(:coach)
      existing_user = insert(:user, email: "archived@email.com")

      insert(:client,
        creator: other_coach,
        business: other_coach.business,
        user: existing_user,
        status: :archived
      )

      attrs = %{"email" => "archived@email.com", "first_name" => "Archived"}
      conn = post(conn, "/v1/coach/clients/invite", attrs)

      assert %{"data" => data} = json_response(conn, 201)
      assert data["status"] == "pending"
    end

    test "allows invite when email belongs to an inactive client elsewhere", %{conn: conn} do
      other_coach = insert(:coach)
      existing_user = insert(:user, email: "inactive@email.com")

      insert(:client,
        creator: other_coach,
        business: other_coach.business,
        user: existing_user,
        status: :inactive
      )

      attrs = %{"email" => "inactive@email.com", "first_name" => "Inactive"}
      conn = post(conn, "/v1/coach/clients/invite", attrs)

      assert json_response(conn, 201)
    end

    test "allows invite when email has no User record", %{conn: conn} do
      attrs = %{"email" => "brand-new@email.com", "first_name" => "Fresh"}
      conn = post(conn, "/v1/coach/clients/invite", attrs)

      assert json_response(conn, 201)
    end

    test "allows invite when email is not provided (phone only)", %{conn: conn} do
      # Sanity: the new validation must not block phone-only invites
      attrs = %{"phone" => "+91 98765 11111", "first_name" => "PhoneOnly"}
      conn = post(conn, "/v1/coach/clients/invite", attrs)

      assert json_response(conn, 201)
    end

    test "rejects coach inviting their own email" do
      user = insert(:user, email: "rajat@coach.com")
      coach = insert(:coach, user: user)
      conn = build_conn() |> authenticate_coach(coach)

      attrs = %{"email" => "rajat@coach.com", "first_name" => "Rajat"}
      conn = post(conn, "/v1/coach/clients/invite", attrs)

      assert %{"error_detail" => %{"email" => [msg]}} = json_response(conn, 422)
      assert msg =~ "yourself"
    end

    test "allows coach inviting a different email", %{conn: conn} do
      attrs = %{"email" => "someone-else@email.com", "first_name" => "Other"}
      conn = post(conn, "/v1/coach/clients/invite", attrs)

      assert json_response(conn, 201)
    end
  end

  describe "GET /v1/coach/clients/:id" do
    test "returns a client by id with MVP fields", %{conn: conn, coach: coach, business: business} do
      # Active client: User is linked and the User's name is authoritative.
      user = insert(:user, first_name: "Vikas", last_name: "Sandhu")

      client =
        insert(:client,
          creator: coach,
          business: business,
          user: user,
          email: "vikas@test.com",
          first_name: "Vikas",
          last_name: "Sandhu",
          phone: "+91 98765 43210",
          notes: "Test notes"
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == client.id
      assert data["email"] == "vikas@test.com"
      assert data["first_name"] == "Vikas"
      assert data["last_name"] == "Sandhu"
      assert data["phone"] == "+91 98765 43210"
      assert data["notes"] == "Test notes"
      assert data["status"] == "active"
      assert data["inserted_at"]
      assert data["updated_at"]

      # Post-MVP fields should not be in response
      refute Map.has_key?(data, "instagram_handle")
      refute Map.has_key?(data, "program_name")
      refute Map.has_key?(data, "program_start")
      refute Map.has_key?(data, "program_end")
      refute Map.has_key?(data, "payment_status")
      refute Map.has_key?(data, "payment_amount")
      refute Map.has_key?(data, "status_override")
      refute Map.has_key?(data, "offer")
      refute Map.has_key?(data, "source")
      refute Map.has_key?(data, "intake_answers")
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

    test "prefers User's first/last name over Client's when User is linked", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      user = insert(:user, first_name: "Vikas", last_name: "Kumar")

      client =
        insert(:client,
          creator: coach,
          business: business,
          user: user,
          status: :active,
          first_name: "Vikas K. (Pune gym)",
          last_name: "coach-override"
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["first_name"] == "Vikas"
      assert data["last_name"] == "Kumar"
    end

    test "falls back to Client's name when User's name is blank", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      user = insert(:user, first_name: "", last_name: "")

      client =
        insert(:client,
          creator: coach,
          business: business,
          user: user,
          status: :active,
          first_name: "Coach-set",
          last_name: "Name"
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["first_name"] == "Coach-set"
      assert data["last_name"] == "Name"
    end

    test "uses Client's name when User is not linked (pending client)", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :pending,
          first_name: "Invited",
          last_name: "Client",
          user: nil,
          user_id: nil
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["first_name"] == "Invited"
      assert data["last_name"] == "Client"
    end

    test "returns invitation_sent_at and invitation_expires_at for pending clients", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      sent_at = DateTime.utc_now(:second)

      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :pending,
          invitation_token: "exp-token",
          invitation_sent_at: sent_at
        )

      conn = get(conn, "/v1/coach/clients/#{client.id}")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["invitation_sent_at"]
      assert data["invitation_expires_at"]

      {:ok, expires_at, _} = DateTime.from_iso8601(data["invitation_expires_at"])
      expected_expiry = DateTime.add(sent_at, 30, :day)
      assert DateTime.compare(expires_at, expected_expiry) == :eq
    end

    test "returns null invitation_expires_at/sent_at for non-pending clients", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      for status <- [:active, :inactive, :archived] do
        client =
          insert(:client,
            creator: coach,
            business: business,
            status: status,
            invitation_token: "retained-token-#{status}",
            invitation_sent_at: DateTime.utc_now(:second)
          )

        conn = get(conn, "/v1/coach/clients/#{client.id}")
        assert %{"data" => data} = json_response(conn, 200)
        assert data["invitation_sent_at"] == nil
        assert data["invitation_expires_at"] == nil
      end
    end

    test "status is the DB value directly (no auto-computation)", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      for status <- [:active, :pending, :inactive, :archived] do
        client = insert(:client, creator: coach, business: business, status: status)

        conn = get(conn, "/v1/coach/clients/#{client.id}")
        assert %{"data" => data} = json_response(conn, 200)
        assert data["status"] == Atom.to_string(status)
      end
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
      client = insert(:client, creator: coach, business: business, notes: "before")

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"notes" => "after"})
      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == client.id
      assert data["notes"] == "after"
    end

    test "updates status to archived", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :active)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "archived"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "archived"
    end

    test "updates status to inactive", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :active)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "inactive"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "inactive"
    end

    test "rejects manual pending -> active (must go through accept-invite)", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business, status: :pending)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "active"})
      assert json_response(conn, 422)

      assert Easy.Repo.get!(Easy.Clients.Client, client.id).status == :pending
    end

    test "rejects pending -> inactive", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :pending)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "inactive"})
      assert json_response(conn, 422)
    end

    test "rejects pending -> archived", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :pending)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "archived"})
      assert json_response(conn, 422)
    end

    test "rejects active -> pending", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :active)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "pending"})
      assert json_response(conn, 422)
    end

    test "rejects inactive -> pending", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :inactive)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "pending"})
      assert json_response(conn, 422)
    end

    test "rejects archived -> pending", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :archived)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "pending"})
      assert json_response(conn, 422)
    end

    test "allows inactive -> active", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :inactive)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "active"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "active"
    end

    test "allows archived -> active (re-engage)", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business, status: :archived)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "active"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "active"
    end

    test "allows archived -> inactive", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business, status: :archived)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "inactive"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "inactive"
    end

    test "rejects invalid status", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "expired"})
      assert json_response(conn, 422)
    end

    test "rejects garbage status", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)

      conn = patch(conn, "/v1/coach/clients/#{client.id}", %{"status" => "garbage"})
      assert json_response(conn, 422)
    end

    test "updates email", %{conn: conn, coach: coach, business: business} do
      client = insert(:client, creator: coach, business: business)

      conn =
        patch(conn, "/v1/coach/clients/#{client.id}", %{"email" => "new@test.com"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["email"] == "new@test.com"
    end

    test "allows updating contact fields on a pending client (plans/notes prep work)", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client =
        insert(:client,
          creator: coach,
          business: business,
          status: :pending,
          user: nil,
          user_id: nil
        )

      attrs = %{
        "first_name" => "Vikas",
        "last_name" => "Sandhu",
        "phone" => "+91 98765 43210",
        "notes" => "Started coaching"
      }

      conn = patch(conn, "/v1/coach/clients/#{client.id}", attrs)
      assert %{"data" => data} = json_response(conn, 200)

      assert data["first_name"] == "Vikas"
      assert data["last_name"] == "Sandhu"
      assert data["phone"] == "+91 98765 43210"
      assert data["notes"] == "Started coaching"
      assert data["status"] == "pending"
    end

    test "updates multiple contact fields and a valid status transition in one call", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business, status: :active)

      attrs = %{
        "phone" => "+91 98765 43210",
        "notes" => "archived due to inactivity",
        "status" => "archived"
      }

      conn = patch(conn, "/v1/coach/clients/#{client.id}", attrs)
      assert %{"data" => data} = json_response(conn, 200)
      assert data["phone"] == "+91 98765 43210"
      assert data["notes"] == "archived due to inactivity"
      assert data["status"] == "archived"
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
      insert(:client, creator: coach, business: business, status: :inactive)

      conn = get(conn, "/v1/coach/clients")
      assert %{"data" => clients, "count" => 3, "summary" => summary} = json_response(conn, 200)

      assert length(clients) == 3
      assert summary["active"] == 1
      assert summary["pending"] == 1
      assert summary["inactive"] == 1
      assert summary["archived"] == 0
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
      assert summary["pending"] == 0
      assert summary["inactive"] == 0
      assert summary["archived"] == 0
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
  end

  describe "GET /v1/coach/clients - status filtering" do
    test "filters by active status", %{conn: conn, coach: coach, business: business} do
      active = insert(:client, status: :active, creator: coach, business: business)
      insert(:client, status: :pending, creator: coach, business: business)
      insert(:client, status: :inactive, creator: coach, business: business)

      conn = get(conn, "/v1/coach/clients", %{"status" => "active"})
      assert %{"data" => [client], "count" => 1} = json_response(conn, 200)
      assert client["id"] == active.id
      assert client["status"] == "active"
    end

    test "filters by pending status", %{conn: conn, coach: coach, business: business} do
      insert(:client, status: :active, creator: coach, business: business)
      pending = insert(:client, status: :pending, creator: coach, business: business)

      conn = get(conn, "/v1/coach/clients", %{"status" => "pending"})
      assert %{"data" => [client], "count" => 1} = json_response(conn, 200)
      assert client["id"] == pending.id
      assert client["status"] == "pending"
    end

    test "filters by inactive status", %{conn: conn, coach: coach, business: business} do
      insert(:client, status: :active, creator: coach, business: business)
      inactive = insert(:client, status: :inactive, creator: coach, business: business)

      conn = get(conn, "/v1/coach/clients", %{"status" => "inactive"})
      assert %{"data" => [client], "count" => 1} = json_response(conn, 200)
      assert client["id"] == inactive.id
      assert client["status"] == "inactive"
    end

    test "filters by archived status", %{conn: conn, coach: coach, business: business} do
      insert(:client, status: :active, creator: coach, business: business)
      archived = insert(:client, status: :archived, creator: coach, business: business)

      conn = get(conn, "/v1/coach/clients", %{"status" => "archived"})
      assert %{"data" => [client], "count" => 1} = json_response(conn, 200)
      assert client["id"] == archived.id
      assert client["status"] == "archived"
    end

    test "no filter returns all statuses", %{conn: conn, coach: coach, business: business} do
      insert(:client, status: :active, creator: coach, business: business)
      insert(:client, status: :pending, creator: coach, business: business)
      insert(:client, status: :inactive, creator: coach, business: business)
      insert(:client, status: :archived, creator: coach, business: business)

      conn = get(conn, "/v1/coach/clients")
      assert %{"data" => clients, "count" => 4} = json_response(conn, 200)
      assert length(clients) == 4
    end

    test "summary counts all statuses correctly", %{conn: conn, coach: coach, business: business} do
      insert(:client, status: :active, creator: coach, business: business)
      insert(:client, status: :active, creator: coach, business: business)
      insert(:client, status: :pending, creator: coach, business: business)
      insert(:client, status: :inactive, creator: coach, business: business)
      insert(:client, status: :archived, creator: coach, business: business)
      insert(:client, status: :archived, creator: coach, business: business)

      conn = get(conn, "/v1/coach/clients")
      assert %{"summary" => summary} = json_response(conn, 200)
      assert summary["active"] == 2
      assert summary["pending"] == 1
      assert summary["inactive"] == 1
      assert summary["archived"] == 2
    end

    test "summary is unaffected by status filter", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      insert(:client, status: :active, creator: coach, business: business)
      insert(:client, status: :pending, creator: coach, business: business)
      insert(:client, status: :inactive, creator: coach, business: business)

      # Filter by active, but summary should still count all
      conn = get(conn, "/v1/coach/clients", %{"status" => "active"})
      assert %{"data" => clients, "count" => 1, "summary" => summary} = json_response(conn, 200)
      assert length(clients) == 1
      assert summary["active"] == 1
      assert summary["pending"] == 1
      assert summary["inactive"] == 1
    end
  end

  describe "DELETE /v1/coach/clients/:id" do
    test "revokes a pending invitation (hard delete)", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business, status: :pending)

      conn = delete(conn, "/v1/coach/clients/#{client.id}")
      assert response(conn, 204)

      refute Easy.Repo.get(Easy.Clients.Client, client.id)
    end

    test "deletes personal training plans assigned to the pending client", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business, status: :pending)

      plan =
        insert(:training_plan,
          business: business,
          author: coach,
          client_id: client.id,
          start_date: ~D[2026-01-01],
          end_date: ~D[2026-03-01]
        )

      conn = delete(conn, "/v1/coach/clients/#{client.id}")
      assert response(conn, 204)

      refute Easy.Repo.get(Easy.Training.TrainingPlan, plan.id)
    end

    test "leaves templates (client_id IS NULL) untouched", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business, status: :pending)

      template =
        insert(:training_plan, business: business, author: coach, client_id: nil)

      conn = delete(conn, "/v1/coach/clients/#{client.id}")
      assert response(conn, 204)

      assert Easy.Repo.get(Easy.Training.TrainingPlan, template.id)
    end

    test "deletes personal nutrition plans assigned to the pending client", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      client = insert(:client, creator: coach, business: business, status: :pending)

      plan =
        insert(:plan,
          business: business,
          creator: coach,
          client_id: client.id
        )

      conn = delete(conn, "/v1/coach/clients/#{client.id}")
      assert response(conn, 204)

      refute Easy.Repo.get(Easy.Nutrition.Plan, plan.id)
    end

    test "returns 422 for non-pending clients", %{
      conn: conn,
      coach: coach,
      business: business
    } do
      for status <- [:active, :inactive, :archived] do
        client = insert(:client, creator: coach, business: business, status: status)

        conn = delete(conn, "/v1/coach/clients/#{client.id}")
        assert json_response(conn, 422)

        # Client still exists.
        assert Easy.Repo.get(Easy.Clients.Client, client.id)
      end
    end

    test "returns 404 for non-existent client", %{conn: conn} do
      conn = delete(conn, "/v1/coach/clients/#{Ecto.UUID.generate()}")
      assert json_response(conn, 404)
    end

    test "cannot revoke pending client from another business", %{conn: conn} do
      other_coach = insert(:coach)

      other_client =
        insert(:client,
          creator: other_coach,
          business: other_coach.business,
          status: :pending
        )

      conn = delete(conn, "/v1/coach/clients/#{other_client.id}")
      assert json_response(conn, 404)

      assert Easy.Repo.get(Easy.Clients.Client, other_client.id)
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> delete("/v1/coach/clients/#{Ecto.UUID.generate()}")
      assert json_response(conn, 403)
    end
  end
end
