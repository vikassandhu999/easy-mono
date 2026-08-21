defmodule Easy.LocalCalendarTest do
  use Easy.SchemaCase

  alias Easy.Clients.Client
  alias Easy.LocalCalendar
  alias Easy.Orgs.Business

  describe "applied timezone fallback" do
    test "uses the client timezone when present and the business timezone otherwise" do
      assert LocalCalendar.applied_timezone("America/New_York", "Asia/Kolkata") ==
               "America/New_York"

      assert LocalCalendar.applied_timezone(nil, "Europe/London") == "Europe/London"
      assert LocalCalendar.applied_timezone("", "Europe/London") == "Europe/London"
    end
  end

  describe "UTC instants and local dates" do
    test "converts a UTC instant to a calendar date in the applied timezone" do
      utc = ~U[2026-08-16 20:00:00Z]

      assert LocalCalendar.to_local_date(utc, "Asia/Kolkata") == ~D[2026-08-17]
      assert LocalCalendar.to_local_date(utc, "America/New_York") == ~D[2026-08-16]
      assert utc.time_zone == "Etc/UTC"
    end
  end

  describe "creation stamping" do
    test "business creation stamps Asia/Kolkata and ignores an unvalidated timezone" do
      user = insert(:user)

      changeset =
        Business.insert_changeset(user, %{
          name: "Calendar Gym",
          handle: "calendar-gym-#{System.unique_integer([:positive])}",
          timezone: "Not/AZone"
        })

      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :timezone) == "Asia/Kolkata"

      assert {:ok, business} = Repo.insert(changeset)
      assert business.timezone == "Asia/Kolkata"
      assert %DateTime{time_zone: "Etc/UTC"} = business.inserted_at
    end

    test "client invitation stamps Asia/Kolkata and ignores an unvalidated timezone" do
      coach = insert(:coach)

      changeset =
        Client.invite_changeset(coach, %{
          email: "calendar-#{System.unique_integer([:positive])}@test.com",
          first_name: "Local",
          last_name: "Date",
          timezone: "Not/AZone"
        })

      assert changeset.valid?
      assert Ecto.Changeset.get_field(changeset, :timezone) == "Asia/Kolkata"

      assert {:ok, client} = Repo.insert(changeset)
      assert client.timezone == "Asia/Kolkata"
      assert %DateTime{time_zone: "Etc/UTC"} = client.inserted_at
    end

    test "database defaults retained rows to Asia/Kolkata when timezone is omitted" do
      owner = insert(:user)
      id = Ecto.UUID.generate()
      now = DateTime.utc_now(:second)

      Repo.insert_all(Business, [
        %{id: id, owner_id: owner.id, name: "Default timezone", handle: "timezone-#{id}", inserted_at: now, updated_at: now}
      ])

      assert Repo.get!(Business, id).timezone == "Asia/Kolkata"
    end
  end
end
