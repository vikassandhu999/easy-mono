defmodule Easy.Clients.LastActiveTest do
  use Easy.SchemaCase

  alias Easy.Clients

  describe "list_clients/2 last_active_at" do
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
end
