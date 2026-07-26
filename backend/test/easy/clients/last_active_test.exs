defmodule Easy.Clients.LastActiveTest do
  use Easy.SchemaCase

  alias Easy.Clients

  # `last_active_at` is the CLIENT's own activity — a completed session or a logged
  # meal — which is what the CL row's "2h ago" column and its sort both read.
  describe "list_clients/2 last_active_at" do
    test "is the latest of a completed session and a logged meal" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      client = insert(:client, business: business, creator: coach, user: insert(:user))

      insert(:workout_session,
        business: business,
        client: client,
        state: :completed,
        date: ~D[2026-07-01]
      )

      insert(:meal_log,
        business: business,
        client: client,
        date: ~D[2026-07-10],
        logged_calories: 500.0
      )

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business))
      assert listed.last_active_at == ~D[2026-07-10]
    end

    test "ignores a session that was never completed and a meal with nothing logged" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      client = insert(:client, business: business, creator: coach, user: insert(:user))

      insert(:workout_session, business: business, client: client, state: :active, date: ~D[2026-07-20])
      insert(:meal_log, business: business, client: client, date: ~D[2026-07-21], logged_calories: 0.0)

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business))
      assert is_nil(listed.last_active_at)
    end

    test "does not leak activity from another business" do
      business = insert(:business)
      coach = insert(:coach, business: business)
      _client = insert(:client, business: business, creator: coach, user: insert(:user))

      other_business = insert(:business)
      other_coach = insert(:coach, business: other_business)
      other_client = insert(:client, business: other_business, creator: other_coach, user: insert(:user))

      insert(:meal_log,
        business: other_business,
        client: other_client,
        date: ~D[2026-07-15],
        logged_calories: 300.0
      )

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business))
      assert is_nil(listed.last_active_at)
    end
  end

  describe "list_clients/2 sort" do
    setup do
      business = insert(:business)
      coach = insert(:coach, business: business)

      recent = insert(:client, business: business, creator: coach, user: insert(:user), first_name: "Recent")
      stale = insert(:client, business: business, creator: coach, user: insert(:user), first_name: "Stale")
      never = insert(:client, business: business, creator: coach, user: insert(:user), first_name: "Never")

      insert(:meal_log, business: business, client: stale, date: ~D[2026-06-01], logged_calories: 400.0)
      insert(:meal_log, business: business, client: recent, date: ~D[2026-07-20], logged_calories: 400.0)

      %{business: business, names: %{recent: recent.first_name, stale: stale.first_name, never: never.first_name}}
    end

    test "last_active puts the most recently active first and the never-active last", %{
      business: business,
      names: names
    } do
      assert {:ok, %{clients: clients}} =
               Clients.list_clients(owner_ctx(business), sort: :last_active)

      assert Enum.map(clients, & &1.first_name) == [names.recent, names.stale, names.never]
    end

    test "an unknown sort falls back to newest rather than failing", %{business: business} do
      assert {:ok, %{clients: clients}} = Clients.list_clients(owner_ctx(business), sort: :nonsense)
      assert length(clients) == 3
    end
  end
end
