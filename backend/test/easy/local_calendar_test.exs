defmodule Easy.LocalCalendarTest do
  use Easy.SchemaCase

  alias Easy.Clients.Client
  alias Easy.LocalCalendar
  alias Easy.Orgs.Business

  test "uses the client timezone, then business timezone, then default" do
    assert LocalCalendar.applied_timezone("America/New_York", "Asia/Kolkata") == "America/New_York"
    assert LocalCalendar.applied_timezone(nil, "Europe/London") == "Europe/London"
    assert LocalCalendar.applied_timezone("", "Europe/London") == "Europe/London"
    assert LocalCalendar.applied_timezone(nil, nil) == "Asia/Kolkata"
  end

  test "converts a UTC instant to a calendar date in the applied timezone" do
    utc = ~U[2026-08-16 20:00:00Z]
    assert LocalCalendar.to_local_date(utc, "Asia/Kolkata") == ~D[2026-08-17]
    assert LocalCalendar.to_local_date(utc, "America/New_York") == ~D[2026-08-16]
    assert utc.time_zone == "Etc/UTC"
  end

  test "business creation defaults to Asia/Kolkata and validates explicit timezones" do
    owner = insert(:user)
    attrs = %{name: "Calendar Gym", handle: "calendar-gym-#{System.unique_integer([:positive])}"}

    assert {:ok, business} = owner.id |> Business.insert_changeset(attrs) |> Repo.insert()
    assert business.timezone == "Asia/Kolkata"
    assert %DateTime{time_zone: "Etc/UTC"} = business.inserted_at

    invalid = Business.insert_changeset(owner.id, Map.put(attrs, :timezone, "Not/AZone"))
    assert errors_on(invalid).timezone == ["choose a valid time zone"]

    assert {:ok, updated} = business |> Business.update_changeset(%{timezone: "Europe/London"}) |> Repo.update()
    assert updated.timezone == "Europe/London"
  end

  test "client invitation keeps a nullable timezone and applies the business timezone" do
    business = insert(:business, timezone: "Pacific/Kiritimati")
    coach = insert(:coach, business: business)
    attrs = %{email: "calendar@test.com", full_name: "Local Date"}

    assert {:ok, client} =
             coach.business_id
             |> Client.insert_changeset(coach.id, DateTime.utc_now(:second), attrs)
             |> Repo.insert()

    assert client.timezone == nil
    assert client.unit_system == :metric
    assert %DateTime{time_zone: "Etc/UTC"} = client.inserted_at
    client = Repo.preload(client, :business)
    assert Client.applied_timezone(client) == "Pacific/Kiritimati"
    assert Client.local_date(client, ~U[2026-09-19 12:00:00Z]) == ~D[2026-09-20]

    invalid = Client.update_changeset(client, %{timezone: "Not/AZone"})
    assert errors_on(invalid).timezone == ["choose a valid time zone"]

    assert {:ok, updated} = client |> Client.update_changeset(%{timezone: "America/Los_Angeles"}) |> Repo.update()
    assert Client.local_date(updated, ~U[2026-09-19 12:00:00Z]) == ~D[2026-09-19]
    assert {:ok, reset} = updated |> Client.update_changeset(%{timezone: nil}) |> Repo.update()
    assert Client.local_date(reset, ~U[2026-09-19 12:00:00Z]) == ~D[2026-09-20]
  end

  test "database defaults businesses to Asia/Kolkata when timezone is omitted" do
    owner = insert(:user)
    id = Ecto.UUID.generate()
    now = DateTime.utc_now(:second)

    Repo.insert_all(Business, [
      %{id: id, owner_user_id: owner.id, name: "Default timezone", handle: "timezone-#{System.unique_integer([:positive])}", inserted_at: now, updated_at: now}
    ])

    assert Repo.get!(Business, id).timezone == "Asia/Kolkata"
  end
end
