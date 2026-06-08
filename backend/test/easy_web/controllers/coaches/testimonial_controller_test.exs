defmodule EasyWeb.Coaches.TestimonialControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "POST /v1/coach/testimonials" do
    test "creates testimonial with full data", %{conn: conn} do
      attrs = build(:testimonial_attrs)

      conn = post(conn, "/v1/coach/testimonials", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["client_name"] == attrs["client_name"]
      assert data["quote"] == attrs["quote"]
      assert data["rating"] == attrs["rating"]
      assert data["result_tag"] == attrs["result_tag"]
    end

    test "creates text-only testimonial", %{conn: conn} do
      attrs = %{
        "client_name" => "Priya",
        "quote" => "Best decision I ever made.",
        "rating" => 5
      }

      conn = post(conn, "/v1/coach/testimonials", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["client_name"] == "Priya"
      assert data["before_image_url"] == nil
    end

    test "creates photo-only testimonial", %{conn: conn} do
      attrs = %{
        "client_name" => "Rahul",
        "before_image_url" => "https://example.com/before.jpg",
        "after_image_url" => "https://example.com/after.jpg",
        "result_tag" => "Lost 8kg"
      }

      conn = post(conn, "/v1/coach/testimonials", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["client_name"] == "Rahul"
      assert data["quote"] == nil
    end

    test "returns 422 when neither quote nor image", %{conn: conn} do
      attrs = %{"client_name" => "Empty"}

      conn = post(conn, "/v1/coach/testimonials", attrs)
      assert json_response(conn, 422)
    end

    test "returns 422 when before image without after image", %{conn: conn} do
      attrs = %{
        "client_name" => "Incomplete",
        "before_image_url" => "https://example.com/before.jpg"
      }

      conn = post(conn, "/v1/coach/testimonials", attrs)
      assert json_response(conn, 422)
    end

    test "returns 422 for missing client_name", %{conn: conn} do
      attrs = %{"quote" => "Great coach"}

      conn = post(conn, "/v1/coach/testimonials", attrs)
      assert json_response(conn, 422)
    end

    test "auto-suggests result_tag from weights", %{conn: conn} do
      attrs = %{
        "client_name" => "Auto Tag",
        "quote" => "Works great",
        "before_weight" => "95",
        "after_weight" => "80"
      }

      conn = post(conn, "/v1/coach/testimonials", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["result_tag"] == "Lost 15.0kg"
    end

    test "does not override explicit result_tag", %{conn: conn} do
      attrs = %{
        "client_name" => "Explicit",
        "quote" => "Custom tag",
        "before_weight" => "95",
        "after_weight" => "80",
        "result_tag" => "Transformed!"
      }

      conn = post(conn, "/v1/coach/testimonials", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["result_tag"] == "Transformed!"
    end
  end

  describe "GET /v1/coach/testimonials" do
    test "lists testimonials for business", %{conn: conn, business: business} do
      insert(:testimonial, business: business)
      insert(:testimonial, business: business)

      other = insert(:business)
      insert(:testimonial, business: other)

      conn = get(conn, "/v1/coach/testimonials")
      assert %{"data" => data, "count" => count} = json_response(conn, 200)
      assert count == 2
      assert length(data) == 2
    end

    test "paginates results", %{conn: conn, business: business} do
      for _ <- 1..5, do: insert(:testimonial, business: business)

      conn = get(conn, "/v1/coach/testimonials?offset=0&limit=2")
      assert %{"data" => data, "count" => 5} = json_response(conn, 200)
      assert length(data) == 2
    end
  end

  describe "GET /v1/coach/testimonials/:id" do
    test "shows testimonial", %{conn: conn, business: business} do
      testimonial = insert(:testimonial, business: business)

      conn = get(conn, "/v1/coach/testimonials/#{testimonial.id}")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == testimonial.id
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:business)
      testimonial = insert(:testimonial, business: other)

      conn = get(conn, "/v1/coach/testimonials/#{testimonial.id}")
      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/testimonials/:id" do
    test "updates testimonial", %{conn: conn, business: business} do
      testimonial = insert(:testimonial, business: business)

      conn =
        patch(conn, "/v1/coach/testimonials/#{testimonial.id}", %{"client_name" => "Updated Name"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["client_name"] == "Updated Name"
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:business)
      testimonial = insert(:testimonial, business: other)

      conn = patch(conn, "/v1/coach/testimonials/#{testimonial.id}", %{"client_name" => "Nope"})
      assert json_response(conn, 404)
    end
  end

  describe "DELETE /v1/coach/testimonials/:id" do
    test "deletes testimonial", %{conn: conn, business: business} do
      testimonial = insert(:testimonial, business: business)

      conn = delete(conn, "/v1/coach/testimonials/#{testimonial.id}")
      assert response(conn, 204)
    end

    test "returns 404 for other business", %{conn: conn} do
      other = insert(:business)
      testimonial = insert(:testimonial, business: other)

      conn = delete(conn, "/v1/coach/testimonials/#{testimonial.id}")
      assert json_response(conn, 404)
    end
  end
end
