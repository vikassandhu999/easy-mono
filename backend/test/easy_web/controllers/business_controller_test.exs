defmodule EasyWeb.BusinessControllerTest do
  use Easy.ConnCase, async: true
  alias Easy.Billing.BusinessBilling
  alias Easy.Identity.{AuthTokens, SessionFactory, Token}
  alias Easy.Orgs.Coach

  setup %{conn: conn} do
    business = insert(:business, billing: build(:business_billing, business: nil, free_seats: 3))
    coach = insert(:coach, business: business, user: business.owner)
    %{conn: authenticate_coach(conn, coach), business: business}
  end

  test "business responses include handle and current term seat counts", %{conn: conn, business: business} do
    insert(:client, business: business)
    insert(:client, business: business, user: nil)
    assert %{"data" => data} = get(conn, "/v1/businesses/me") |> json_response(200)
    assert data["seats"] == %{"limit" => 3, "used" => 1}
    assert %{"data" => updated} = patch(conn, "/v1/businesses/me", %{handle: "new-studio", name: "Studio", timezone: "Europe/London"}) |> json_response(200)
    assert updated["handle"] == "new-studio"
    assert updated["timezone"] == "Europe/London"
  end

  test "availability checks validate syntax and ignore the owner's own handle", %{conn: conn, business: business} do
    assert %{"available" => true} = get(conn, "/v1/businesses/handle-availability", %{handle: business.handle}) |> json_response(200)

    for handle <- ["admin", "UPPER", "a--b", insert(:business).handle] do
      assert %{"available" => false} = get(conn, "/v1/businesses/handle-availability", %{handle: handle}) |> json_response(200)
    end
  end

  test "a signed-in guest can check handles before creating a business", %{business: business} do
    user = insert(:user)
    {:ok, session} = SessionFactory.create_session(user, %{role: :guest})
    token = Token.generate_access_token(user, session)
    conn = build_conn() |> put_req_header("authorization", "Bearer #{token}")
    assert %{"available" => true} = get(conn, "/v1/businesses/handle-availability", %{handle: "new-guest-studio"}) |> json_response(200)
    assert %{"available" => false} = get(conn, "/v1/businesses/handle-availability", %{handle: business.handle}) |> json_response(200)
  end

  test "trainers can see seats but only owner can edit business", %{business: business} do
    trainer = insert(:coach, business: business)
    conn = build_conn() |> authenticate_coach(trainer)
    assert %{"data" => %{"seats" => %{"limit" => 3}}} = get(conn, "/v1/businesses/me") |> json_response(200)
    assert patch(conn, "/v1/businesses/me", %{name: "No"}) |> json_response(403)
    assert patch(conn, "/v1/businesses/me", %{business_id: insert(:business).id}) |> json_response(422)
  end

  test "onboarding accepts an unnamed account and creates the submitted coach profile with ten seats" do
    user = insert(:user, full_name: "")
    conn = guest_conn(user)

    assert %{"data" => business} =
             post(conn, "/v1/businesses", %{name: "Studio", handle: "http-owner-setup", full_name: "Jordan Coach", preferred_name: "Jo"}) |> json_response(201)

    assert business["seats"] == %{"limit" => 10, "used" => 0}
    coach = Easy.Repo.get_by!(Coach, business_id: business["id"], user_id: user.id)
    assert coach.full_name == "Jordan Coach"
    assert coach.preferred_name == "Jo"
    assert Easy.Repo.get_by!(BusinessBilling, business_id: business["id"]).free_seats == 10
  end

  test "onboarding rejects missing, blank and overlong coach names without creating a business" do
    user = insert(:user, full_name: "Existing Name")

    invalid_profiles = [
      %{},
      %{full_name: ""},
      %{full_name: String.duplicate("x", 256)},
      %{full_name: "Coach", preferred_name: String.duplicate("x", 256)}
    ]

    for profile <- invalid_profiles do
      params = Map.merge(%{name: "Studio", handle: "http-invalid-name"}, profile)
      assert guest_conn(user) |> post("/v1/businesses", params) |> json_response(422)
      refute Easy.Repo.get_by(Easy.Orgs.Business, owner_user_id: user.id)
    end
  end

  test "authenticated responses include the existing user's full name for setup" do
    user = insert(:user, full_name: "Existing Name")
    {:ok, session} = SessionFactory.create_session(user, %{role: :guest})
    assert AuthTokens.build(user, session).full_name == "Existing Name"
  end

  defp guest_conn(user) do
    {:ok, session} = SessionFactory.create_session(user, %{role: :guest})
    token = Token.generate_access_token(user, session)
    build_conn() |> put_req_header("authorization", "Bearer #{token}")
  end
end
