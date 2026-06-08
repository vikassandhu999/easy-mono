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

    test "returns v2 fields in profile", %{business: _business, profile: profile} do
      # Update profile with v2 fields
      Easy.Repo.update!(
        Ecto.Changeset.change(profile, %{
          headline: "Transform your body",
          trust_stats: [%{"value" => "500+", "label" => "Clients"}],
          faq_items: [%{"question" => "How?", "answer" => "Custom plans."}],
          whatsapp_cta_enabled: true,
          whatsapp_cta_message: "Hi coach!"
        })
      )

      conn = build_conn() |> get("/v1/public/coaches/test-coach/profile")
      assert %{"data" => data} = json_response(conn, 200)

      assert data["profile"]["headline"] == "Transform your body"
      assert length(data["profile"]["trust_stats"]) == 1
      assert hd(data["profile"]["trust_stats"])["value"] == "500+"
      assert length(data["profile"]["faq_items"]) == 1
      assert data["profile"]["whatsapp_cta_enabled"] == true
      assert data["profile"]["whatsapp_cta_message"] == "Hi coach!"
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

  describe "POST /v1/public/coaches/:slug/inquiries" do
    test "creates client from public inquiry", %{} do
      attrs = build(:inquiry_attrs)

      conn = build_conn() |> post("/v1/public/coaches/test-coach/inquiries", attrs)
      assert %{"data" => data} = json_response(conn, 201)

      assert data["first_name"] == "Vikas"
      assert data["email"] == attrs["email"]
      assert data["status"] == "pending"
    end

    test "parses name into first_name and last_name", %{} do
      attrs = build(:inquiry_attrs) |> Map.put("name", "Vikas Sandhu")

      conn = build_conn() |> post("/v1/public/coaches/test-coach/inquiries", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["first_name"] == "Vikas"
    end

    test "returns 422 for missing required fields" do
      conn =
        build_conn()
        |> post("/v1/public/coaches/test-coach/inquiries", %{"first_name" => "Incomplete"})

      assert json_response(conn, 422)
    end

    test "returns 404 for unpublished profile" do
      insert(:store_profile,
        business: insert(:business),
        slug: "hidden-coach",
        is_published: false
      )

      attrs = build(:inquiry_attrs)
      conn = build_conn() |> post("/v1/public/coaches/hidden-coach/inquiries", attrs)
      assert json_response(conn, 404)
    end

    test "returns 404 for non-existent slug" do
      attrs = build(:inquiry_attrs)
      conn = build_conn() |> post("/v1/public/coaches/ghost/inquiries", attrs)
      assert json_response(conn, 404)
    end
  end
end
