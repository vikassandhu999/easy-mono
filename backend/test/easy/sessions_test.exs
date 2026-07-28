defmodule Easy.SessionsTest do
  use Easy.DataCase, async: true

  alias Easy.Ctx
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

    test "list_sessions_for_client does not leak another business's sessions", %{business: business, client_b: client_b} do
      other = insert(:coach)
      other_client = insert(:client, business: other.business, creator: other)
      insert(:workout_session, business: other.business, client: other_client)

      assert {:ok, %{count: 1, sessions: [session]}} =
               Sessions.list_sessions_for_client(owner_ctx(business), client_b.id)

      assert session.client_id == client_b.id
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

      assert {:ok, %{count: 1, sessions: [_]}} = Sessions.list_sessions_for_client(ctx, client_b.id)
      assert {:ok, %{id: id}} = Sessions.get_session_for_client(ctx, client_b.id, session_b.id)
      assert id == session_b.id
    end
  end

  describe "session list pagination" do
    setup do
      business = insert(:business)
      insert(:coach, business: business, user: business.owner)
      coach = insert(:coach, business: business)
      client = insert(:client, business: business, creator: coach, assigned_coach: coach)

      for day <- 0..24 do
        insert(:workout_session,
          business: business,
          client: client,
          state: :completed,
          date: Date.add(Date.utc_today(), -day),
          started_at: DateTime.add(DateTime.utc_now(:second), -day, :day)
        )
      end

      %{business: business, client: client, client_ctx: %Ctx{business_id: business.id, user_id: client.user_id}}
    end

    test "defaults to 20 rows and reports the full count", %{business: business, client: client} do
      assert {:ok, %{count: 25, sessions: sessions}} =
               Sessions.list_sessions_for_client(owner_ctx(business), client.id)

      assert length(sessions) == 20
    end

    test "offset walks the newest-first page", %{business: business, client: client} do
      ctx = owner_ctx(business)

      {:ok, %{sessions: first}} = Sessions.list_sessions_for_client(ctx, client.id, limit: 5)
      {:ok, %{count: 25, sessions: second}} = Sessions.list_sessions_for_client(ctx, client.id, offset: 5, limit: 5)

      assert length(second) == 5
      assert Enum.map(first, & &1.date) == Enum.sort(Enum.map(first, & &1.date), {:desc, Date})
      assert MapSet.disjoint?(MapSet.new(first, & &1.id), MapSet.new(second, & &1.id))
    end

    test "limit is clamped to 100", %{business: business, client: client} do
      assert {:ok, %{count: 25, sessions: sessions}} =
               Sessions.list_sessions_for_client(owner_ctx(business), client.id, limit: 5000)

      assert length(sessions) == 25
    end

    test "from/to still filter, and count reflects the filter", %{business: business, client: client} do
      today = Date.utc_today()

      assert {:ok, %{count: 8, sessions: sessions}} =
               Sessions.list_sessions_for_client(owner_ctx(business), client.id,
                 from: Date.add(today, -7),
                 to: today
               )

      assert length(sessions) == 8
    end

    test "list_client_sessions paginates the client's own sessions", %{client_ctx: client_ctx} do
      assert {:ok, %{count: 25, sessions: sessions}} = Sessions.list_client_sessions(client_ctx, limit: 3)
      assert length(sessions) == 3
    end
  end
end
