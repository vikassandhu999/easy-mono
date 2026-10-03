defmodule Easy.ClientAccountTest do
  use Easy.DataCase, async: true

  alias Easy.ClientAccount
  alias Easy.Clients.Client
  alias Easy.Ctx

  test "profile operations reject missing and cross-business client identities without writing" do
    client = insert(:client)
    ctx = context(client)

    for denied <- [
          %{ctx | client_id: nil},
          %{ctx | client_id: Ecto.UUID.generate()},
          %{ctx | business_id: insert(:business).id}
        ] do
      assert {:error, :not_found} = ClientAccount.get_client_account(denied)
      assert {:error, :not_found} = ClientAccount.get_client_calendar(denied)
      assert {:error, :not_found} = ClientAccount.get_client_account_profile(denied)
      assert {:error, :not_found} = ClientAccount.update_client_account_profile(denied, %{full_name: "Unexpected"})
    end

    assert Repo.get!(Client, client.id).full_name == client.full_name
  end

  test "client calendar follows the stored timezone on either side of UTC midnight" do
    for {timezone, now, expected} <- [
          {"Pacific/Kiritimati", ~U[2026-09-19 12:00:00Z], ~D[2026-09-20]},
          {"America/Los_Angeles", ~U[2026-09-19 00:30:00Z], ~D[2026-09-18]},
          {"America/Los_Angeles", ~U[2026-03-08 09:59:59Z], ~D[2026-03-08]},
          {"America/Los_Angeles", ~U[2026-03-08 10:00:00Z], ~D[2026-03-08]}
        ] do
      client = insert(:client, timezone: timezone)
      assert {:ok, calendar} = ClientAccount.get_client_calendar(context(client), now)
      assert calendar == %{timezone: timezone, local_date: expected}
    end
  end

  test "client calendar falls back to the business timezone" do
    business = insert(:business, timezone: "Pacific/Kiritimati")
    client = insert(:client, business: business, timezone: nil)

    assert {:ok, %{timezone: "Pacific/Kiritimati", local_date: ~D[2026-09-20]}} =
             ClientAccount.get_client_calendar(context(client), ~U[2026-09-19 12:00:00Z])
  end

  test "self-service changes names, phone and units while preserving trusted and coach-managed fields" do
    client = insert(:client, notes: "Coach note", timezone: "Asia/Kolkata")

    assert {:ok, %{client: updated, unit_system: :imperial}} =
             ClientAccount.update_client_account_profile(context(client), %{
               full_name: "Updated Client",
               preferred_name: "Updated",
               phone: "555-1234",
               unit_system: "imperial",
               business_id: Ecto.UUID.generate(),
               user_id: Ecto.UUID.generate(),
               coach_id: Ecto.UUID.generate(),
               timezone: "Europe/London",
               email: "unexpected@example.test",
               notes: "Unexpected"
             })

    assert updated.full_name == "Updated Client"
    assert updated.preferred_name == "Updated"
    assert updated.phone == "555-1234"
    assert Repo.get!(Client, client.id).unit_system == :imperial

    for field <- [:business_id, :user_id, :coach_id, :timezone, :email, :notes] do
      assert Map.get(updated, field) == Map.get(client, field)
    end
  end

  test "accepted membership permits active, joined and ended clients but stays tenant scoped" do
    business = insert(:business)
    today = Date.utc_today()
    ended_term = build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, -1))

    for client <- [
          insert(:client, business: business),
          insert(:client, business: business, terms: []),
          insert(:client, business: business, terms: [ended_term], timezone: "Etc/UTC")
        ] do
      ctx = Ctx.new(business.id, client.user_id)
      assert {:ok, %{id: id}} = ClientAccount.get_accepted_client(ctx)
      assert id == client.id
      assert {:error, :not_found} = ClientAccount.get_accepted_client(%{ctx | business_id: Ecto.UUID.generate()})
      assert {:error, :not_found} = ClientAccount.get_accepted_client(%{ctx | user_id: Ecto.UUID.generate()})
    end
  end

  test "joined and ended profiles remain readable" do
    today = Date.utc_today()
    ended_term = build(:coaching_term, starts_on: Date.add(today, -30), ends_on: Date.add(today, -1))

    for client <- [insert(:client, terms: []), insert(:client, terms: [ended_term], timezone: "Etc/UTC")] do
      ctx = context(client)
      assert {:ok, %{client: profile}} = ClientAccount.get_client_account_profile(ctx)
      assert profile.full_name == client.full_name
      assert Repo.get!(Client, client.id).full_name == client.full_name
    end
  end

  test "invitation and coach edits enforce the same stored-string limits" do
    client = build(:client)
    sent_at = DateTime.utc_now(:second)

    for {field, limit} <- [email: 255, full_name: 255, preferred_name: 255, phone: 255, notes: 2000],
        length <- [limit, limit + 1] do
      value = if field == :email, do: String.duplicate("x", length - 10) <> "@test.test", else: String.duplicate("x", length)
      attrs = Map.put(%{email: "client@example.test", full_name: "Client"}, field, value)
      invited = Client.insert_changeset(Ecto.UUID.generate(), Ecto.UUID.generate(), sent_at, attrs)
      updated = Client.update_changeset(client, attrs)
      expected = if length > limit, do: ["should be at most #{limit} character(s)"], else: []

      assert Map.get(errors_on(invited), field, []) == expected
      assert Map.get(errors_on(updated), field, []) == expected
    end
  end

  test "oversized self-service profile fields return validation errors without changing the client" do
    client = insert(:client)
    too_long = String.duplicate("x", 256)

    for field <- [:full_name, :preferred_name, :phone] do
      assert {:error, changeset} = ClientAccount.update_client_account_profile(context(client), %{field => too_long})
      assert errors_on(changeset)[field] == ["should be at most 255 character(s)"]
      assert Map.get(Repo.get!(Client, client.id), field) == Map.get(client, field)
    end
  end

  defp context(client), do: %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}
end
