defmodule EasyWeb.Coaches.ProfileControllerTest do
  use Easy.ConnCase

  describe "GET /v1/coach/me" do
    test "returns coach profile with business info" do
      business = insert(:business, name: "FitCoach Pro", handle: "rajat-jain")

      coach =
        insert(:coach,
          business: business,
          first_name: "Rajat",
          last_name: "Jain",
          phone: "+91 99999 12345"
        )

      conn =
        build_conn()
        |> authenticate_coach(coach)
        |> get("/v1/coach/me")

      assert %{"data" => data} = json_response(conn, 200)

      assert data["id"] == coach.id
      assert data["first_name"] == "Rajat"
      assert data["last_name"] == "Jain"
      assert data["phone"] == "+91 99999 12345"
      assert data["email"] == coach.user.email
      refute Map.has_key?(data, "business_id")

      assert %{
               "id" => _,
               "name" => "FitCoach Pro",
               "slug" => "rajat-jain"
             } = data["business"]
    end

    test "returns nullable fields as null" do
      coach = insert(:coach, first_name: nil, last_name: nil, phone: nil)

      conn =
        build_conn()
        |> authenticate_coach(coach)
        |> get("/v1/coach/me")

      assert %{"data" => data} = json_response(conn, 200)
      assert is_nil(data["first_name"])
      assert is_nil(data["last_name"])
      assert is_nil(data["phone"])
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> get("/v1/coach/me")
      assert json_response(conn, 403)
    end

    test "returns 403 with client auth token" do
      coach = insert(:coach)

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          status: :active
        )

      conn =
        build_conn()
        |> authenticate_client(client)
        |> get("/v1/coach/me")

      assert json_response(conn, 403)
    end
  end

  describe "PATCH /v1/coach/me" do
    test "updates coach name and phone" do
      coach = insert(:coach, first_name: "Old", last_name: "Name", phone: nil)

      conn =
        build_conn()
        |> authenticate_coach(coach)
        |> patch("/v1/coach/me", %{
          "first_name" => "Rajat",
          "last_name" => "Jain",
          "phone" => "+91 99999 12345"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["first_name"] == "Rajat"
      assert data["last_name"] == "Jain"
      assert data["phone"] == "+91 99999 12345"
    end

    test "updates business name in the same call" do
      business = insert(:business, name: "Old Business")
      coach = insert(:coach, business: business)

      conn =
        build_conn()
        |> authenticate_coach(coach)
        |> patch("/v1/coach/me", %{
          "first_name" => "Updated",
          "business_name" => "New Business Name"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["first_name"] == "Updated"
      assert data["business"]["name"] == "New Business Name"

      # Verify in DB
      reloaded = Easy.Repo.get!(Easy.Orgs.Business, business.id)
      assert reloaded.name == "New Business Name"
    end

    test "partial update works (only phone)" do
      coach = insert(:coach, first_name: "Keep", last_name: "This", phone: nil)

      conn =
        build_conn()
        |> authenticate_coach(coach)
        |> patch("/v1/coach/me", %{"phone" => "+91 88888 77777"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["first_name"] == "Keep"
      assert data["last_name"] == "This"
      assert data["phone"] == "+91 88888 77777"
    end

    test "skips business update when business_name not provided" do
      business = insert(:business, name: "Original")
      coach = insert(:coach, business: business)

      conn =
        build_conn()
        |> authenticate_coach(coach)
        |> patch("/v1/coach/me", %{"first_name" => "New"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["business"]["name"] == "Original"
    end

    test "returns 403 without auth token" do
      conn = build_conn() |> patch("/v1/coach/me", %{"first_name" => "X"})
      assert json_response(conn, 403)
    end
  end
end
