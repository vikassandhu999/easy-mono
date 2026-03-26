defmodule EasyWeb.Public.StorefrontControllerTest do
  use Easy.ConnCase

  setup do
    business = insert(:business)

    profile =
      insert(:store_profile,
        business: business,
        slug: "test-coach",
        is_published: true
      )

    %{business: business, profile: profile}
  end

  describe "GET /v1/public/coaches/:slug/profile" do
    test "returns profile with offers and testimonials", %{business: business} do
      insert(:offer, business: business, status: :active)
      insert(:offer, business: business, status: :active)
      insert(:testimonial, business: business, status: :active)

      conn = build_conn() |> get("/v1/public/coaches/test-coach/profile")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["profile"]["slug"] == "test-coach"
      assert data["profile"]["display_name"] != nil
      assert length(data["offers"]) == 2
      assert length(data["testimonials"]) == 1
    end

    test "only returns active offers", %{business: business} do
      insert(:offer, business: business, status: :active)
      insert(:offer, business: business, status: :archived)

      conn = build_conn() |> get("/v1/public/coaches/test-coach/profile")
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data["offers"]) == 1
    end

    test "only returns active testimonials", %{business: business} do
      insert(:testimonial, business: business, status: :active)
      insert(:testimonial, business: business, status: :archived)

      conn = build_conn() |> get("/v1/public/coaches/test-coach/profile")
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data["testimonials"]) == 1
    end

    test "returns 404 for unpublished profile", %{business: _business} do
      insert(:store_profile,
        business: insert(:business),
        slug: "unpublished-coach",
        is_published: false
      )

      conn = build_conn() |> get("/v1/public/coaches/unpublished-coach/profile")
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent slug" do
      conn = build_conn() |> get("/v1/public/coaches/does-not-exist/profile")
      assert json_response(conn, 404)
    end

    test "does not leak data from other businesses", %{business: business} do
      insert(:offer, business: business, status: :active)

      other = insert(:business)
      insert(:offer, business: other, status: :active)

      conn = build_conn() |> get("/v1/public/coaches/test-coach/profile")
      assert %{"data" => data} = json_response(conn, 200)
      assert length(data["offers"]) == 1
    end
  end

  describe "POST /v1/public/coaches/:slug/leads" do
    test "creates lead from public form", %{business: business} do
      offer = insert(:offer, business: business)

      attrs = %{
        "name" => "Vikas",
        "email" => "vikas@test.com",
        "phone" => "+91 98765 43210",
        "instagram_handle" => "@vikas_fit",
        "offer_id" => offer.id,
        "intake_answers" => %{"weight" => "90", "goal" => "Fat loss"}
      }

      conn = build_conn() |> post("/v1/public/coaches/test-coach/leads", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == "Vikas"
      assert data["email"] == "vikas@test.com"
      assert data["status"] == "new"
    end

    test "creates lead without offer", %{} do
      attrs = %{
        "name" => "No Offer Lead",
        "email" => "nooffer@test.com",
        "phone" => "+91 11111 22222"
      }

      conn = build_conn() |> post("/v1/public/coaches/test-coach/leads", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["name"] == "No Offer Lead"
    end

    test "returns 422 for missing required fields" do
      conn =
        build_conn() |> post("/v1/public/coaches/test-coach/leads", %{"name" => "Incomplete"})

      assert json_response(conn, 422)
    end

    test "returns 404 for unpublished profile" do
      insert(:store_profile,
        business: insert(:business),
        slug: "hidden-coach",
        is_published: false
      )

      attrs = %{
        "name" => "Lead",
        "email" => "lead@test.com",
        "phone" => "+91 99999 88888"
      }

      conn = build_conn() |> post("/v1/public/coaches/hidden-coach/leads", attrs)
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent slug" do
      attrs = %{
        "name" => "Lead",
        "email" => "lead@test.com",
        "phone" => "+91 99999 88888"
      }

      conn = build_conn() |> post("/v1/public/coaches/ghost/leads", attrs)
      assert json_response(conn, 404)
    end

    test "ignores invalid offer_id gracefully", %{} do
      attrs = %{
        "name" => "Bad Offer",
        "email" => "badoffer@test.com",
        "phone" => "+91 11111 22222",
        "offer_id" => Ecto.UUID.generate()
      }

      conn = build_conn() |> post("/v1/public/coaches/test-coach/leads", attrs)
      assert %{"data" => _data} = json_response(conn, 201)
    end
  end
end
