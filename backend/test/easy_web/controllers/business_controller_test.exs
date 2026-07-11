defmodule EasyWeb.BusinessControllerTest do
  use Easy.ConnCase

  import OpenApiSpex.TestAssertions

  setup do
    owner_user = insert(:user)
    business = insert(:business, owner: owner_user)
    owner_coach = insert(:coach, user: owner_user, business: business)
    trainer = insert(:coach, business: business)

    owner_conn =
      build_conn()
      |> authenticate_coach(owner_coach)
      |> put_req_header("content-type", "application/json")

    trainer_conn =
      build_conn()
      |> authenticate_coach(trainer)
      |> put_req_header("content-type", "application/json")

    %{business: business, owner_conn: owner_conn, trainer_conn: trainer_conn}
  end

  describe "PATCH /v1/businesses/me/dashboard-setup" do
    test "stores the terminal state and renders the updated business", %{owner_conn: conn} do
      conn =
        patch(conn, "/v1/businesses/me/dashboard-setup", %{
          "dashboard_setup_hidden_reason" => "dismissed"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["dashboard_setup_hidden_reason"] == "dismissed"
      assert data["dashboard_setup_hidden_at"]
      assert_schema(data, "Business", EasyWeb.ApiSpec.spec())
    end

    test "rejects non-owners", %{trainer_conn: conn} do
      conn =
        patch(conn, "/v1/businesses/me/dashboard-setup", %{
          "dashboard_setup_hidden_reason" => "dismissed"
        })

      assert json_response(conn, 403)
    end

    test "validates the reason at the request boundary", %{owner_conn: conn} do
      conn =
        patch(conn, "/v1/businesses/me/dashboard-setup", %{
          "dashboard_setup_hidden_reason" => "later"
        })

      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/coach/me" do
    test "exposes owner and dashboard setup state", %{business: business, owner_conn: conn} do
      business
      |> Ecto.Changeset.change(%{
        dashboard_setup_hidden_at: DateTime.utc_now(:second),
        dashboard_setup_hidden_reason: :completed
      })
      |> Easy.Repo.update!()

      conn = get(conn, "/v1/coach/me")

      assert %{"data" => data} = json_response(conn, 200)
      assert data["is_owner"] == true
      assert data["business"]["dashboard_setup_hidden_reason"] == "completed"
      assert data["business"]["dashboard_setup_hidden_at"]
      assert_schema(data, "CoachProfile", EasyWeb.ApiSpec.spec())
    end
  end

  describe "PATCH /v1/businesses/me" do
    test "updates the default weight unit", %{owner_conn: conn} do
      conn = patch(conn, "/v1/businesses/me", %{"default_weight_unit" => "lbs"})

      assert %{"data" => data} = json_response(conn, 200)
      assert data["default_weight_unit"] == "lbs"
      assert_schema(data, "Business", EasyWeb.ApiSpec.spec())
    end
  end
end
