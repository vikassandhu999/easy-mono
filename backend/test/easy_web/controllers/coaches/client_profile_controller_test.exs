defmodule EasyWeb.Coaches.ClientProfileControllerTest do
  use Easy.ConnCase

  alias Easy.ClientProfiles.ClientProfile
  alias Easy.Repo

  describe "GET /v1/coach/clients/:client_id/profile" do
    test "returns or creates profile for a client in the coach business" do
      coach = insert(:coach)

      client =
        insert(:client,
          business: coach.business,
          creator: coach,
          status: :active
        )

      conn =
        build_conn()
        |> authenticate_coach(coach)
        |> get("/v1/coach/clients/#{client.id}/profile")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["client_id"] == client.id
      refute Map.has_key?(data, "business_id")
      assert data["general"] == %{}
      assert data["nutrition"] == %{}
      assert data["training"] == %{}
      assert data["lifestyle"] == %{}
      assert data["intake_status"] == "assigned"
      assert is_binary(data["id"])

      assert Repo.get_by!(ClientProfile, client_id: client.id).id == data["id"]
    end

    test "returns 404 for a client from another business" do
      coach = insert(:coach)
      other_coach = insert(:coach)

      other_client =
        insert(:client,
          business: other_coach.business,
          creator: other_coach,
          status: :active
        )

      conn =
        build_conn()
        |> authenticate_coach(coach)
        |> get("/v1/coach/clients/#{other_client.id}/profile")

      assert json_response(conn, 404)
    end
  end

  describe "PATCH /v1/coach/clients/:client_id/profile" do
    test "updates structured sections" do
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
        |> authenticate_coach(coach)
        |> patch("/v1/coach/clients/#{client.id}/profile", %{
          "general" => %{"goal" => "strength"},
          "nutrition" => %{"protein_goal" => "120g"},
          "training" => %{"experience" => "intermediate"},
          "lifestyle" => %{"sleep_hours" => 7}
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["client_id"] == client.id
      refute Map.has_key?(data, "business_id")
      assert data["general"] == %{"goal" => "strength"}
      assert data["nutrition"] == %{"protein_goal" => "120g"}
      assert data["training"] == %{"experience" => "intermediate"}
      assert data["lifestyle"] == %{"sleep_hours" => 7}
    end

    test "returns 404 for a client from another business without creating or updating a profile" do
      coach = insert(:coach)
      other_coach = insert(:coach)

      other_client_without_profile =
        insert(:client,
          business: other_coach.business,
          creator: other_coach,
          status: :active
        )

      other_client_with_profile =
        insert(:client,
          business: other_coach.business,
          creator: other_coach,
          status: :active
        )

      profile =
        insert(:client_profile,
          business: other_client_with_profile.business,
          client: other_client_with_profile,
          general: %{"goal" => "unchanged"}
        )

      create_conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_coach(coach)
        |> patch("/v1/coach/clients/#{other_client_without_profile.id}/profile", %{
          "general" => %{"goal" => "created"}
        })

      update_conn =
        build_conn()
        |> put_req_header("content-type", "application/json")
        |> authenticate_coach(coach)
        |> patch("/v1/coach/clients/#{other_client_with_profile.id}/profile", %{
          "general" => %{"goal" => "updated"}
        })

      assert json_response(create_conn, 404)
      assert json_response(update_conn, 404)
      refute Repo.get_by(ClientProfile, client_id: other_client_without_profile.id)
      assert Repo.get!(ClientProfile, profile.id).general == %{"goal" => "unchanged"}
    end
  end
end
