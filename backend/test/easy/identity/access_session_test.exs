defmodule Easy.Identity.AccessSessionTest do
  use Easy.DataCase, async: true

  import Easy.Factory

  alias Easy.Identity.{Token, UserSessions}
  alias EasyWeb.Plugs.Authenticate

  test "HTTP and socket authentication reject revoked access tokens, including after reactivation" do
    business = insert(:business)
    owner = insert(:coach, business: business, user: business.owner)
    coach = insert(:coach, business: business)
    user = Repo.get!(Easy.Identity.User, coach.user_id)
    session = insert(:user_session, user: user, business_id: business.id, coach_id: coach.id)
    token = Token.generate_access_token(user, session)
    ctx = Easy.Ctx.new(business.id, owner.user_id, owner.id, true)

    assert {:ok, _} = Token.authenticate_access_token(token)
    assert {:ok, _} = EasyWeb.UserSocket.connect(%{"token" => token}, %Phoenix.Socket{}, %{})
    Phoenix.PubSub.subscribe(Easy.PubSub, "user_socket:#{user.id}")
    assert {:ok, _} = Easy.Coaches.remove_coach(ctx, coach.id)
    assert_receive %Phoenix.Socket.Broadcast{event: "disconnect"}
    assert {:error, :invalid_token} = Token.authenticate_access_token(token)
    assert :error = EasyWeb.UserSocket.connect(%{"token" => token}, %Phoenix.Socket{}, %{})
    conn = Plug.Test.conn(:get, "/v1/coach/me") |> Plug.Conn.put_req_header("authorization", "Bearer #{token}")
    assert %{status: 403, halted: true} = Authenticate.call(conn, [])
    assert {:error, :invalid_token} = Token.authenticate_access_token(token)
  end

  test "missing, expired, malformed, and mismatched sessions are rejected" do
    user = insert(:user)
    session = insert(:user_session, user: user, role: :guest)
    token = Token.generate_access_token(user, session)
    assert {:ok, claims} = Token.authenticate_access_token(token)

    for attrs <- [
          %{"session_id" => Ecto.UUID.generate()},
          %{"session_id" => "invalid"},
          %{"user_id" => Ecto.UUID.generate()},
          %{"role" => "coach"},
          %{"business_id" => Ecto.UUID.generate()},
          %{"coach_id" => Ecto.UUID.generate()},
          %{"is_owner" => true}
        ] do
      assert {:error, :invalid_token} = UserSessions.validate_access(Map.merge(claims, attrs))
    end

    assert {:error, :invalid_token} = UserSessions.validate_access(%{})
    session |> Ecto.Changeset.change(expires_at: DateTime.add(DateTime.utc_now(:second), -60)) |> Repo.update!()
    assert {:error, :invalid_token} = Token.authenticate_access_token(token)
  end
end
