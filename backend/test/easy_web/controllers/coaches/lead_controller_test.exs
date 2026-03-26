defmodule EasyWeb.Coaches.LeadControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "GET /v1/coach/leads" do
    test "lists leads for business", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)
      insert(:lead, business: business, offer: offer)
      insert(:lead, business: business, offer: offer)

      other = insert(:business)
      other_offer = insert(:offer, business: other)
      insert(:lead, business: other, offer: other_offer)

      conn = get(conn, "/v1/coach/leads")
      assert %{"data" => data, "count" => count} = json_response(conn, 200)
      assert count == 2
      assert length(data) == 2
    end

    test "filters by status", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)
      insert(:lead, business: business, offer: offer, status: :new)
      insert(:lead, business: business, offer: offer, status: :contacted)
      insert(:lead, business: business, offer: offer, status: :new)

      conn = get(conn, "/v1/coach/leads?status=new")
      assert %{"data" => data, "count" => 2} = json_response(conn, 200)
      assert length(data) == 2
      assert Enum.all?(data, &(&1["status"] == "new"))
    end

    test "paginates results", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)
      for _ <- 1..5, do: insert(:lead, business: business, offer: offer)

      conn = get(conn, "/v1/coach/leads?offset=0&limit=2")
      assert %{"data" => data, "count" => 5} = json_response(conn, 200)
      assert length(data) == 2
    end

    test "includes offer in preloads", %{conn: conn, business: business} do
      offer = insert(:offer, business: business, name: "Fat Loss")
      insert(:lead, business: business, offer: offer)

      conn = get(conn, "/v1/coach/leads")
      assert %{"data" => [lead]} = json_response(conn, 200)
      assert lead["offer"]["name"] == "Fat Loss"
    end
  end

  describe "GET /v1/coach/leads/:id" do
    test "shows lead with preloads", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)
      lead = insert(:lead, business: business, offer: offer)

      conn = get(conn, "/v1/coach/leads/#{lead.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == lead.id
      assert data["name"] == lead.name
      assert data["offer"] != nil
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:business)
      other_offer = insert(:offer, business: other)
      lead = insert(:lead, business: other, offer: other_offer)

      conn = get(conn, "/v1/coach/leads/#{lead.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/leads/:id" do
    test "updates lead status", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)
      lead = insert(:lead, business: business, offer: offer)

      conn = patch(conn, "/v1/coach/leads/#{lead.id}", %{"status" => "contacted"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "contacted"
    end

    test "updates lead notes", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)
      lead = insert(:lead, business: business, offer: offer)

      conn = patch(conn, "/v1/coach/leads/#{lead.id}", %{"notes" => "Followed up via WhatsApp"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["notes"] == "Followed up via WhatsApp"
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:business)
      other_offer = insert(:offer, business: other)
      lead = insert(:lead, business: other, offer: other_offer)

      conn = patch(conn, "/v1/coach/leads/#{lead.id}", %{"status" => "contacted"})
      assert json_response(conn, 404)
    end
  end

  describe "POST /v1/coach/leads/:id/convert" do
    test "converts lead to client", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)
      lead = insert(:lead, business: business, offer: offer)

      conn = post(conn, "/v1/coach/leads/#{lead.id}/convert")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["status"] == "converted"
      assert data["client"] != nil
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:business)
      other_offer = insert(:offer, business: other)
      lead = insert(:lead, business: other, offer: other_offer)

      conn = post(conn, "/v1/coach/leads/#{lead.id}/convert")
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/leads/:id" do
    test "deletes lead", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)
      lead = insert(:lead, business: business, offer: offer)

      conn = delete(conn, "/v1/coach/leads/#{lead.id}")
      assert response(conn, 204)
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:business)
      other_offer = insert(:offer, business: other)
      lead = insert(:lead, business: other, offer: other_offer)

      conn = delete(conn, "/v1/coach/leads/#{lead.id}")
      assert json_response(conn, 404)
    end
  end
end
