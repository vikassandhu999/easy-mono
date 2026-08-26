defmodule EasyWeb.BusinessControllerTest do
  use Easy.ConnCase

  alias Easy.Identity.Token
  alias Ecto.UUID

  setup do
    owner_user = insert(:user)
    business = insert(:business, owner: owner_user) |> Easy.Repo.reload!()
    owner_coach = insert(:coach, user: owner_user, business: business)
    trainer = insert(:coach, business: business)
    user = insert(:user)

    owner_conn =
      build_conn()
      |> authenticate_coach(owner_coach)
      |> put_req_header("content-type", "application/json")

    trainer_conn =
      build_conn()
      |> authenticate_coach(trainer)
      |> put_req_header("content-type", "application/json")

    user_conn =
      build_conn()
      |> authenticate_user(user)
      |> put_req_header("content-type", "application/json")

    %{business: business, owner_conn: owner_conn, trainer_conn: trainer_conn, user_conn: user_conn}
  end

  describe "POST /v1/businesses" do
    test "creates and renders a business", %{user_conn: conn} do
      conn =
        post(conn, "/v1/businesses", %{
          "about" => nil,
          "default_weight_unit" => "lbs",
          "handle" => "strong-coaching",
          "name" => "Strong Coaching"
        })

      assert %{"data" => data} = json_response(conn, 201)
      assert data["id"]
      assert data["name"] == "Strong Coaching"
      assert data["handle"] == "strong-coaching"
      assert data["about"] == nil
      assert data["default_weight_unit"] == "lbs"
      assert data["dashboard_setup_hidden_at"] == nil
      assert data["dashboard_setup_hidden_reason"] == nil
      assert data["inserted_at"]
      assert data["updated_at"]
    end

    test "rejects unexpected body fields", %{user_conn: conn} do
      conn =
        post(conn, "/v1/businesses", %{
          "handle" => "strong-coaching",
          "name" => "Strong Coaching",
          "unexpected" => true
        })

      assert json_response(conn, 422)
    end
  end

  describe "PATCH /v1/businesses/me/dashboard-setup" do
    test "stores the terminal state and renders the updated business", %{
      business: business,
      owner_conn: conn
    } do
      conn =
        patch(conn, "/v1/businesses/me/dashboard-setup", %{
          "dashboard_setup_hidden_reason" => "dismissed"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == business.id
      assert data["name"] == business.name
      assert data["handle"] == business.handle
      assert data["about"] == business.about
      assert data["default_weight_unit"] == Atom.to_string(business.default_weight_unit)
      assert data["dashboard_setup_hidden_at"]
      assert data["dashboard_setup_hidden_reason"] == "dismissed"
      assert data["inserted_at"] == DateTime.to_iso8601(business.inserted_at)
      assert data["updated_at"]
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

    test "rejects unexpected body fields", %{owner_conn: conn} do
      conn =
        patch(conn, "/v1/businesses/me/dashboard-setup", %{
          "dashboard_setup_hidden_reason" => "dismissed",
          "unexpected" => true
        })

      assert json_response(conn, 422)
    end
  end

  describe "GET /v1/businesses/me" do
    test "renders the current business", %{business: business, owner_conn: conn} do
      conn = get(conn, "/v1/businesses/me")

      assert json_response(conn, 200) == %{
               "data" => %{
                 "about" => business.about,
                 "dashboard_setup_hidden_at" => nil,
                 "dashboard_setup_hidden_reason" => nil,
                 "default_weight_unit" => Atom.to_string(business.default_weight_unit),
                 "handle" => business.handle,
                 "id" => business.id,
                 "inserted_at" => DateTime.to_iso8601(business.inserted_at),
                 "name" => business.name,
                 "updated_at" => DateTime.to_iso8601(business.updated_at)
               }
             }
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
    end
  end

  describe "PATCH /v1/businesses/me" do
    test "updates editable fields", %{business: business, owner_conn: conn} do
      conn =
        patch(conn, "/v1/businesses/me", %{
          "about" => "Strength and nutrition coaching",
          "default_weight_unit" => "lbs",
          "name" => "Strong Coaching"
        })

      assert %{"data" => data} = json_response(conn, 200)
      assert data["id"] == business.id
      assert data["name"] == "Strong Coaching"
      assert data["handle"] == business.handle
      assert data["about"] == "Strength and nutrition coaching"
      assert data["default_weight_unit"] == "lbs"
      assert data["dashboard_setup_hidden_at"] == nil
      assert data["dashboard_setup_hidden_reason"] == nil
      assert data["inserted_at"] == DateTime.to_iso8601(business.inserted_at)
      assert data["updated_at"]
    end

    test "rejects unexpected body fields", %{owner_conn: conn} do
      conn = patch(conn, "/v1/businesses/me", %{"unexpected" => true})

      assert json_response(conn, 422)
    end
  end

  defp authenticate_user(conn, user) do
    token =
      Joken.generate_and_sign!(
        Token.token_config(),
        %{
          business_id: nil,
          coach_id: nil,
          is_owner: false,
          role: "guest",
          session_id: UUID.generate(),
          user_id: user.id
        },
        Token.signer()
      )

    put_req_header(conn, "authorization", "Bearer #{token}")
  end
end
