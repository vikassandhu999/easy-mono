defmodule EasyWeb.Clients.ClientProfileControllerTest do
  use Easy.ConnCase

  describe "GET /v1/client/profile" do
    test "returns authenticated client profile without business_id" do
      coach = insert(:coach)

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          status: :active
        )

      profile = insert(:client_profile, business: client.business, client: client)

      conn =
        build_conn()
        |> authenticate_client(client)
        |> get("/v1/client/profile")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == profile.id
      assert data["client_id"] == client.id
      refute Map.has_key?(data, "business_id")
      assert data["general"] == %{}
      assert data["nutrition"] == %{}
      assert data["training"] == %{}
      assert data["lifestyle"] == %{}
      assert data["intake_status"] == "assigned"
    end
  end

  describe "PATCH /v1/client/profile" do
    test "updates authenticated client profile sections" do
      coach = insert(:coach)

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          status: :active
        )

      conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_client(client)
        |> patch("/v1/client/profile", %{
          "general" => %{"goal" => "fat loss"},
          "nutrition" => %{"allergies" => ["peanuts"]},
          "training" => %{"days_per_week" => 4},
          "lifestyle" => %{"job" => "desk"}
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["client_id"] == client.id
      refute Map.has_key?(data, "business_id")
      assert data["general"] == %{"goal" => "fat loss"}
      assert data["nutrition"] == %{"allergies" => ["peanuts"]}
      assert data["training"] == %{"days_per_week" => 4}
      assert data["lifestyle"] == %{"job" => "desk"}
    end
  end
end
