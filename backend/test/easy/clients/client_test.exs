defmodule Easy.Clients.ClientTest do
  use Easy.SchemaCase

  alias Easy.Clients.Client
  alias Ecto.Adapters.SQL

  test "invitation uses trusted coach and tenant IDs and rejects missing references" do
    coach = insert(:coach)

    attrs = %{
      email: "schema-invite@test.com",
      creator_id: Ecto.UUID.generate(),
      assigned_coach_id: Ecto.UUID.generate(),
      business_id: Ecto.UUID.generate()
    }

    assert {:ok, client} = coach.business_id |> Client.invite_changeset(coach.id, DateTime.utc_now(:second), attrs) |> Repo.insert()
    assert client.business_id == coach.business_id
    assert client.creator_id == coach.id
    assert client.assigned_coach_id == coach.id

    for {business_id, coach_id, field} <- [
          {Ecto.UUID.generate(), coach.id, :business_id},
          {coach.business_id, Ecto.UUID.generate(), :creator_id}
        ] do
      assert {:error, changeset} =
               business_id |> Client.invite_changeset(coach_id, DateTime.utc_now(:second), %{email: "missing-parent@test.com"}) |> Repo.insert()

      assert "does not exist" in errors_on(changeset)[field]
    end

    changeset = Client.invite_changeset(nil, nil, DateTime.utc_now(:second), attrs)
    assert errors_on(changeset).business_id == ["can't be blank"]
    assert errors_on(changeset).creator_id == ["can't be blank"]
    assert errors_on(changeset).assigned_coach_id == ["can't be blank"]
  end

  test "reassignment returns a changeset error for a missing coach" do
    client = insert(:client)
    previous_coach_id = client.assigned_coach_id

    assert {:error, changeset} =
             client |> Client.reassign_changeset(Ecto.UUID.generate()) |> Repo.update()

    assert %{assigned_coach_id: ["does not exist"]} = errors_on(changeset)
    assert Repo.reload!(client).assigned_coach_id == previous_coach_id
  end

  describe "newest/1" do
    test "uses id as a stable tie-breaker for clients created at the same time" do
      {sql, _params} = SQL.to_sql(:all, Repo, Client.newest())

      assert sql =~ ~s(ORDER BY c0."inserted_at" DESC, c0."id" DESC)
    end
  end

  describe "search/2" do
    test "matches the displayed full name" do
      business = insert(:business)
      client = insert(:client, business: business, first_name: "Nora", last_name: "Field")

      assert [found] =
               Client
               |> Client.for_business(business.id)
               |> Client.search("Nora Field")
               |> Repo.all()

      assert found.id == client.id
    end
  end

  describe "last_active_stamp/4" do
    test "stores the greatest timestamp without crossing businesses" do
      business = insert(:business)
      client = insert(:client, business: business)
      older = ~U[2026-08-01 08:00:00Z]
      newer = ~U[2026-08-01 09:00:00Z]

      assert {1, nil} =
               Client
               |> Client.last_active_stamp(business.id, client.id, newer)
               |> Repo.update_all([])

      assert {1, nil} =
               Client
               |> Client.last_active_stamp(business.id, client.id, older)
               |> Repo.update_all([])

      assert Repo.reload(client).last_active_at == newer

      other_business = insert(:business)

      assert {0, nil} =
               Client
               |> Client.last_active_stamp(other_business.id, client.id, DateTime.add(newer, 60))
               |> Repo.update_all([])

      assert Repo.reload(client).last_active_at == newer
    end
  end

  describe "for_stage/2" do
    test "filters clients by stage" do
      business = insert(:business)
      insert(:client, business: business, stage: :onboarding)
      coaching = insert(:client, business: business, stage: :coaching)

      ids =
        Client
        |> Client.for_business(business.id)
        |> Client.for_stage(:coaching)
        |> Repo.all()
        |> Enum.map(& &1.id)

      assert ids == [coaching.id]
    end
  end

  describe "streamlined lifecycle changeset rules" do
    test "archived is no longer a valid status" do
      client = %Client{status: :active}
      changeset = Client.update_changeset(client, Date.utc_today(), %{"status" => "archived"})
      refute changeset.valid?
    end

    test "deactivating stamps inactive_reason manual" do
      client = %Client{status: :active}
      changeset = Client.update_changeset(client, Date.utc_today(), %{"status" => "inactive"})
      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :inactive_reason) == :manual
    end

    test "reactivating clears inactive_reason" do
      client = %Client{status: :inactive, inactive_reason: :manual}
      changeset = Client.update_changeset(client, Date.utc_today(), %{"status" => "active"})
      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :inactive_reason) == nil
    end

    test "reactivation uses the supplied date at the subscription boundary" do
      ends_on = Date.utc_today()
      client = %Client{status: :inactive, subscription_ends_on: ends_on}

      assert Client.update_changeset(client, ends_on, %{status: :active}).valid?

      changeset = Client.update_changeset(client, Date.add(ends_on, 1), %{status: :active})
      refute changeset.valid?
      assert %{status: [_]} = errors_on(changeset)
    end

    test "reactivation is blocked while subscription_ends_on is in the past" do
      client = %Client{
        status: :inactive,
        inactive_reason: :subscription_expired,
        subscription_ends_on: Date.add(Date.utc_today(), -1)
      }

      changeset = Client.update_changeset(client, Date.utc_today(), %{"status" => "active"})
      refute changeset.valid?
      assert %{status: [_]} = errors_on(changeset)
    end

    test "reactivation succeeds when the end date is extended in the same update" do
      client = %Client{
        status: :inactive,
        inactive_reason: :subscription_expired,
        subscription_ends_on: Date.add(Date.utc_today(), -1)
      }

      changeset =
        Client.update_changeset(client, Date.utc_today(), %{
          "status" => "active",
          "subscription_ends_on" => Date.to_iso8601(Date.add(Date.utc_today(), 90))
        })

      assert changeset.valid?
    end

    test "subscription_ends_on must be on or after subscription_started_on" do
      client = %Client{status: :active}

      changeset =
        Client.update_changeset(client, Date.utc_today(), %{
          "subscription_started_on" => "2026-08-01",
          "subscription_ends_on" => "2026-07-01"
        })

      refute changeset.valid?
      assert %{subscription_ends_on: [_]} = errors_on(changeset)
    end

    test "stage can be overridden on an active client" do
      client = %Client{status: :active, stage: :onboarding}
      changeset = Client.update_changeset(client, Date.utc_today(), %{"stage" => "coaching"})
      assert changeset.valid?
    end

    test "stage cannot change on a non-active client" do
      client = %Client{status: :inactive, inactive_reason: :manual, stage: :onboarding}
      changeset = Client.update_changeset(client, Date.utc_today(), %{"stage" => "coaching"})
      refute changeset.valid?
      assert %{stage: [_]} = errors_on(changeset)
    end
  end
end
