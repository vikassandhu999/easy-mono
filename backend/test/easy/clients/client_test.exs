defmodule Easy.Clients.ClientTest do
  use Easy.SchemaCase

  alias Easy.Clients.Client

  describe "newest/1" do
    test "uses id as a stable tie-breaker for clients created at the same time" do
      {sql, _params} = Ecto.Adapters.SQL.to_sql(:all, Repo, Client.newest())

      assert sql =~ ~s(ORDER BY c0."inserted_at" DESC, c0."id" DESC)
    end
  end

  describe "streamlined lifecycle changeset rules" do
    test "archived is no longer a valid status" do
      client = %Client{status: :active}
      changeset = Client.update_changeset(client, %{"status" => "archived"})
      refute changeset.valid?
    end

    test "deactivating stamps inactive_reason manual" do
      client = %Client{status: :active}
      changeset = Client.update_changeset(client, %{"status" => "inactive"})
      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :inactive_reason) == :manual
    end

    test "reactivating clears inactive_reason" do
      client = %Client{status: :inactive, inactive_reason: :manual}
      changeset = Client.update_changeset(client, %{"status" => "active"})
      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :inactive_reason) == nil
    end

    test "reactivation is blocked while subscription_ends_on is in the past" do
      client = %Client{
        status: :inactive,
        inactive_reason: :subscription_expired,
        subscription_ends_on: Date.add(Date.utc_today(), -1)
      }

      changeset = Client.update_changeset(client, %{"status" => "active"})
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
        Client.update_changeset(client, %{
          "status" => "active",
          "subscription_ends_on" => Date.to_iso8601(Date.add(Date.utc_today(), 90))
        })

      assert changeset.valid?
    end

    test "subscription_ends_on must be on or after subscription_started_on" do
      client = %Client{status: :active}

      changeset =
        Client.update_changeset(client, %{
          "subscription_started_on" => "2026-08-01",
          "subscription_ends_on" => "2026-07-01"
        })

      refute changeset.valid?
      assert %{subscription_ends_on: [_]} = errors_on(changeset)
    end

    test "stage can be overridden on an active client" do
      client = %Client{status: :active, stage: :onboarding}
      changeset = Client.update_changeset(client, %{"stage" => "coaching"})
      assert changeset.valid?
    end

    test "stage cannot change on a non-active client" do
      client = %Client{status: :inactive, inactive_reason: :manual, stage: :onboarding}
      changeset = Client.update_changeset(client, %{"stage" => "coaching"})
      refute changeset.valid?
      assert %{stage: [_]} = errors_on(changeset)
    end
  end
end
