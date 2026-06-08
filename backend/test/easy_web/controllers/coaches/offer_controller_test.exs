defmodule EasyWeb.Coaches.OfferControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/offers" do
    test "creates offer", %{conn: conn} do
      attrs = build(:offer_attrs)

      conn = post(conn, "/v1/coach/offers", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == attrs["name"]
      assert data["price"] == attrs["price"]
      assert data["features"] == attrs["features"]
      assert data["slug"] != nil
    end

    test "auto-generates slug from name", %{conn: conn} do
      attrs = build(:offer_attrs, %{"name" => "Fat Loss Program"})

      conn = post(conn, "/v1/coach/offers", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["slug"] == "fat-loss-program"
    end

    test "returns 422 for missing name", %{conn: conn} do
      conn = post(conn, "/v1/coach/offers", %{"description" => "no name"})
      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/offers" do
    test "lists offers for business", %{conn: conn, business: business} do
      insert(:offer, business: business)
      insert(:offer, business: business)

      other = insert(:business)
      insert(:offer, business: other)

      conn = get(conn, "/v1/coach/offers")
      assert %{"data" => data, "count" => count} = json_response(conn, 200)
      assert count == 2
      assert length(data) == 2
    end

    test "returns empty list when no offers", %{conn: conn} do
      conn = get(conn, "/v1/coach/offers")
      assert %{"data" => [], "count" => 0} = json_response(conn, 200)
    end

    test "paginates results", %{conn: conn, business: business} do
      for _ <- 1..5, do: insert(:offer, business: business)

      conn = get(conn, "/v1/coach/offers?offset=0&limit=2")
      assert %{"data" => data, "count" => 5} = json_response(conn, 200)
      assert length(data) == 2
    end
  end

  describe "GET /v1/coach/offers/:id" do
    test "shows offer", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)

      conn = get(conn, "/v1/coach/offers/#{offer.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == offer.id
      assert data["name"] == offer.name
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:business)
      offer = insert(:offer, business: other)

      conn = get(conn, "/v1/coach/offers/#{offer.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/offers/:id" do
    test "updates offer", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)

      conn = patch(conn, "/v1/coach/offers/#{offer.id}", %{"name" => "Updated Offer"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["name"] == "Updated Offer"
      assert data["slug"] == "updated-offer"
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:business)
      offer = insert(:offer, business: other)

      conn = patch(conn, "/v1/coach/offers/#{offer.id}", %{"name" => "Nope"})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/offers/:id" do
    test "deletes offer", %{conn: conn, business: business} do
      offer = insert(:offer, business: business)

      conn = delete(conn, "/v1/coach/offers/#{offer.id}")
      assert response(conn, 204)
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:business)
      offer = insert(:offer, business: other)

      conn = delete(conn, "/v1/coach/offers/#{offer.id}")
      assert json_response(conn, 404)
    end
  end
end
