defmodule Easy.SessionsTest do
  use Easy.DataCase, async: true

  alias Easy.Sessions

  describe "client visibility (trainer-team access control)" do
    setup do
      business = insert(:business)
      insert(:coach, business: business, user: business.owner)
      trainer_a = insert(:coach, business: business)
      trainer_b = insert(:coach, business: business)
      client_b = insert(:client, business: business, creator: trainer_b, assigned_coach: trainer_b)
      session_b = insert(:workout_session, business: business, client: client_b)

      %{
        business: business,
        trainer_a: trainer_a,
        client_b: client_b,
        session_b: session_b
      }
    end

    test "list_sessions_for_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b
    } do
      assert {:error, :not_found} = Sessions.list_sessions_for_client(trainer_ctx(trainer_a), client_b.id)
    end

    test "get_session_for_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b,
      session_b: session_b
    } do
      assert {:error, :not_found} =
               Sessions.get_session_for_client(trainer_ctx(trainer_a), client_b.id, session_b.id)
    end

    test "owner ctx succeeds on both", %{business: business, client_b: client_b, session_b: session_b} do
      ctx = owner_ctx(business)

      assert {:ok, [_]} = Sessions.list_sessions_for_client(ctx, client_b.id)
      assert {:ok, %{id: id}} = Sessions.get_session_for_client(ctx, client_b.id, session_b.id)
      assert id == session_b.id
    end
  end
end
