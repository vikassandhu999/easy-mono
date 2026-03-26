defmodule EasyWeb.Coaches.StoreProfileControllerTest do
  use Easy.ConnCase

  setup do
    coach = insert(:coach)
    conn = build_conn() |> authenticate_coach(coach)

    %{conn: conn, coach: coach, business: coach.business}
  end

  describe "GET /v1/coach/storefront/profile" do
    test "returns nil when no profile exists", %{conn: conn} do
      conn = get(conn, "/v1/coach/storefront/profile")
      assert %{"data" => nil} = json_response(conn, 200)
    end

    test "returns existing profile", %{conn: conn, business: business} do
      insert(:store_profile, business: business)

      conn = get(conn, "/v1/coach/storefront/profile")
      assert %{"data" => data} = json_response(conn, 200)
      assert data["slug"] != nil
      assert data["display_name"] != nil
    end
  end

  describe "PATCH /v1/coach/storefront/profile" do
    test "creates profile when none exists", %{conn: conn} do
      attrs = build(:store_profile_attrs)

      conn = patch(conn, "/v1/coach/storefront/profile", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["slug"] == attrs["slug"]
      assert data["display_name"] == attrs["display_name"]
      assert data["theme_color"] == attrs["theme_color"]
    end

    test "updates existing profile", %{conn: conn, business: business} do
      insert(:store_profile, business: business, slug: "original-slug")

      conn = patch(conn, "/v1/coach/storefront/profile", %{"display_name" => "Updated Name"})
      assert %{"data" => data} = json_response(conn, 200)
      assert data["display_name"] == "Updated Name"
      assert data["slug"] == "original-slug"
    end

    test "returns 422 for invalid slug", %{conn: conn} do
      attrs = build(:store_profile_attrs, %{"slug" => "INVALID SLUG!"})

      conn = patch(conn, "/v1/coach/storefront/profile", attrs)
      assert json_response(conn, 422)
    end

    test "returns 422 for duplicate slug", %{conn: conn} do
      other_business = insert(:business)
      insert(:store_profile, business: other_business, slug: "taken-slug")

      attrs = build(:store_profile_attrs, %{"slug" => "taken-slug"})
      conn = patch(conn, "/v1/coach/storefront/profile", attrs)
      assert json_response(conn, 422)
    end

    test "saves intake questions", %{conn: conn} do
      questions = [
        %{"label" => "Weight?", "type" => "number", "required" => true},
        %{
          "label" => "Goal?",
          "type" => "select",
          "required" => true,
          "options" => ["Fat loss", "Muscle gain"]
        }
      ]

      attrs = build(:store_profile_attrs, %{"intake_questions" => questions})
      conn = patch(conn, "/v1/coach/storefront/profile", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert length(data["intake_questions"]) == 2
    end

    test "saves headline", %{conn: conn} do
      attrs = build(:store_profile_attrs, %{"headline" => "Transform your body in 12 weeks"})

      conn = patch(conn, "/v1/coach/storefront/profile", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["headline"] == "Transform your body in 12 weeks"
    end

    test "saves trust stats", %{conn: conn} do
      stats = [
        %{"value" => "500+", "label" => "Clients"},
        %{"value" => "6", "label" => "Years"},
        %{"value" => "4.9★", "label" => "Rating"}
      ]

      attrs = build(:store_profile_attrs, %{"trust_stats" => stats})
      conn = patch(conn, "/v1/coach/storefront/profile", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert length(data["trust_stats"]) == 3
      assert hd(data["trust_stats"])["value"] == "500+"
    end

    test "saves faq items", %{conn: conn} do
      faqs = [
        %{
          "question" => "How does coaching work?",
          "answer" => "Custom plans and weekly check-ins."
        },
        %{
          "question" => "Can you help vegetarians?",
          "answer" => "Yes, I create veg-friendly plans."
        }
      ]

      attrs = build(:store_profile_attrs, %{"faq_items" => faqs})
      conn = patch(conn, "/v1/coach/storefront/profile", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert length(data["faq_items"]) == 2
      assert hd(data["faq_items"])["question"] == "How does coaching work?"
    end

    test "saves whatsapp cta settings", %{conn: conn} do
      attrs =
        build(:store_profile_attrs, %{
          "whatsapp_cta_enabled" => true,
          "whatsapp_cta_message" => "Hi! I saw your page and I'm interested."
        })

      conn = patch(conn, "/v1/coach/storefront/profile", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["whatsapp_cta_enabled"] == true
      assert data["whatsapp_cta_message"] == "Hi! I saw your page and I'm interested."
    end

    test "new fields default gracefully when not provided", %{conn: conn} do
      attrs = build(:store_profile_attrs)

      conn = patch(conn, "/v1/coach/storefront/profile", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["headline"] == nil
      assert data["trust_stats"] == []
      assert data["faq_items"] == []
      assert data["whatsapp_cta_enabled"] == false
      assert data["whatsapp_cta_message"] == nil
    end

    test "saves social links", %{conn: conn} do
      social = %{
        "instagram" => "https://instagram.com/test",
        "youtube" => "https://youtube.com/@test"
      }

      attrs = build(:store_profile_attrs, %{"social_links" => social})

      conn = patch(conn, "/v1/coach/storefront/profile", attrs)
      assert %{"data" => data} = json_response(conn, 201)
      assert data["social_links"]["instagram"] == "https://instagram.com/test"
    end
  end

  describe "POST /v1/coach/storefront/check-slug" do
    test "returns available true for unused slug", %{conn: conn} do
      conn = post(conn, "/v1/coach/storefront/check-slug", %{"slug" => "fresh-slug"})
      assert %{"available" => true} = json_response(conn, 200)
    end

    test "returns available false for taken slug", %{conn: conn} do
      insert(:store_profile, slug: "taken-slug")

      conn = post(conn, "/v1/coach/storefront/check-slug", %{"slug" => "taken-slug"})
      assert %{"available" => false} = json_response(conn, 200)
    end

    test "returns 422 when slug param missing", %{conn: conn} do
      conn = post(conn, "/v1/coach/storefront/check-slug", %{})
      assert json_response(conn, 422)
    end
  end
end
