defmodule Easy.Clients.LastActiveTest do
  use Easy.SchemaCase

  alias Easy.Clients

  describe "list_clients/2 last_active_at" do
    test "returns the stored activity stamp instead of deriving activity from domain rows" do
      business = insert(:business)
      _coach = insert(:coach, business: business)
      stamped_at = ~U[2026-08-01 10:30:00Z]

      client =
        insert(:client,
          business: business,
          user: insert(:user),
          last_active_at: stamped_at
        )

      insert(:workout_session,
        business: business,
        client: client,
        state: :completed,
        date: ~D[2026-07-01]
      )

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business))
      assert listed.last_active_at == stamped_at
    end

    test "leaves clients without a stamp as never active" do
      business = insert(:business)
      _coach = insert(:coach, business: business)
      client = insert(:client, business: business, user: insert(:user))

      insert(:workout_session, business: business, client: client, state: :active, date: ~D[2026-07-20])

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business))
      assert is_nil(listed.last_active_at)
    end

    test "does not leak a stored stamp from another business" do
      business = insert(:business)
      _coach = insert(:coach, business: business)
      _client = insert(:client, business: business, user: insert(:user))

      other_business = insert(:business)
      _other_coach = insert(:coach, business: other_business)
      other_client = insert(:client, business: other_business, user: insert(:user))

      other_client
      |> Ecto.Changeset.change(last_active_at: ~U[2026-08-01 10:30:00Z])
      |> Easy.Repo.update!()

      assert {:ok, %{clients: [listed]}} = Clients.list_clients(owner_ctx(business))
      assert is_nil(listed.last_active_at)
    end
  end

  describe "list_clients/2 sort" do
    setup do
      business = insert(:business)
      _coach = insert(:coach, business: business)

      recent = insert(:client, business: business, user: insert(:user), full_name: "Recent")

      stale =
        insert(:client,
          business: business,
          user: insert(:user),
          full_name: "Stale",
          last_active_at: ~U[2026-06-01 10:00:00Z]
        )

      never = insert(:client, business: business, user: insert(:user), full_name: "Never")

      recent
      |> Ecto.Changeset.change(last_active_at: ~U[2026-07-20 10:00:00Z])
      |> Easy.Repo.update!()

      %{business: business, names: %{recent: recent.full_name, stale: stale.full_name, never: never.full_name}}
    end

    test "last_active puts the most recently active first and the never-active last", %{
      business: business,
      names: names
    } do
      assert {:ok, %{clients: clients}} =
               Clients.list_clients(owner_ctx(business), sort: :last_active)

      assert Enum.map(clients, & &1.full_name) == [names.recent, names.stale, names.never]
    end

    test "an unknown sort falls back to newest rather than failing", %{business: business} do
      assert {:ok, %{clients: clients}} = Clients.list_clients(owner_ctx(business), sort: :nonsense)
      assert length(clients) == 3
    end

    test "breaks identical activity timestamps deterministically by client id" do
      business = insert(:business)
      _coach = insert(:coach, business: business)
      timestamp = ~U[2026-08-01 10:30:00Z]
      inserted_at = ~U[2026-07-01 10:30:00Z]

      clients =
        for _ <- 1..2 do
          insert(:client,
            business: business,
            last_active_at: timestamp,
            inserted_at: inserted_at,
            updated_at: inserted_at
          )
        end

      assert {:ok, %{clients: listed}} =
               Clients.list_clients(owner_ctx(business), sort: :last_active)

      assert Enum.map(listed, & &1.id) == clients |> Enum.map(& &1.id) |> Enum.sort(:desc)
    end
  end

  test "last-active reads use a fixed number of queries and no activity tables" do
    small_business = insert(:business)
    insert(:client, business: small_business, last_active_at: ~U[2026-08-01 10:30:00Z])

    large_business = insert(:business)
    for _ <- 1..20, do: insert(:client, business: large_business)

    {small_result, small_queries} =
      capture_queries(fn -> Clients.list_clients(owner_ctx(small_business), sort: :last_active) end)

    {large_result, large_queries} =
      capture_queries(fn -> Clients.list_clients(owner_ctx(large_business), sort: :last_active) end)

    assert {:ok, %{clients: [_]}} = small_result
    assert {:ok, %{clients: clients}} = large_result
    assert length(clients) == 20
    assert length(small_queries) == length(large_queries)

    refute Enum.any?(small_queries ++ large_queries, fn query ->
             String.contains?(query, [
               ~s(FROM "training_sessions"),
               ~s(FROM "tracker_entries")
             ])
           end)
  end

  defp capture_queries(fun) do
    parent = self()
    handler_id = {__MODULE__, make_ref()}

    :telemetry.attach(
      handler_id,
      [:easy, :repo, :query],
      fn _event, _measurements, metadata, _config -> send(parent, {:query, metadata.query}) end,
      nil
    )

    try do
      {fun.(), received_queries()}
    after
      :telemetry.detach(handler_id)
    end
  end

  defp received_queries(queries \\ []) do
    receive do
      {:query, query} -> received_queries([query | queries])
    after
      0 -> Enum.reverse(queries)
    end
  end
end
