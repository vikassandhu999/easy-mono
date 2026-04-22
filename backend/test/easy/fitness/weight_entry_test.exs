defmodule Easy.Fitness.WeightEntryTest do
  use Easy.DataCase

  alias Easy.Error
  alias Easy.Fitness.WeightEntry

  describe "insert_changeset/3" do
    test "is valid with required fields" do
      client = insert_client()

      changeset =
        WeightEntry.insert_changeset(client.id, client.business_id, %{
          date: ~D[2026-04-22],
          value: Decimal.new("91.40"),
          unit: :kg,
          note: "morning weigh-in"
        })

      assert changeset.valid?
      assert get_change(changeset, :client_id) == client.id
      assert get_change(changeset, :business_id) == client.business_id
    end

    test "is invalid without required fields" do
      client = insert_client()
      changeset = WeightEntry.insert_changeset(client.id, client.business_id, %{})

      refute changeset.valid?

      assert %{
               date: ["can't be blank"],
               value: ["can't be blank"],
               unit: ["can't be blank"]
             } = errors_on(changeset)
    end

    test "is invalid when value is out of range or note is too long" do
      client = insert_client()

      changeset =
        WeightEntry.insert_changeset(client.id, client.business_id, %{
          date: ~D[2026-04-22],
          value: Decimal.new("0"),
          unit: :kg,
          note: String.duplicate("a", 501)
        })

      refute changeset.valid?

      assert %{value: ["must be greater than 0"], note: ["should be at most 500 character(s)"]} =
               errors_on(changeset)
    end

    test "is invalid when date is too far in the future" do
      client = insert_client()

      changeset =
        WeightEntry.insert_changeset(client.id, client.business_id, %{
          date: Date.add(Date.utc_today(), 2),
          value: Decimal.new("91.40"),
          unit: :kg
        })

      refute changeset.valid?
      assert %{date: ["cannot be in the future"]} = errors_on(changeset)
    end
  end

  describe "update_changeset/2" do
    test "updates value, unit, and note" do
      entry = insert_weight_entry()

      changeset =
        WeightEntry.update_changeset(entry, %{
          value: Decimal.new("90.80"),
          unit: :lbs,
          note: "after travel"
        })

      assert changeset.valid?
    end
  end

  describe "query functions" do
    test "compose business, client, since, and ordered filters" do
      coach = insert(:coach)
      client = insert(:client, creator: coach, business: coach.business, user: insert(:user))

      older =
        insert_weight_entry(
          client: client,
          business: coach.business,
          date: ~D[2026-04-01],
          value: Decimal.new("95.20")
        )

      newer =
        insert_weight_entry(
          client: client,
          business: coach.business,
          date: ~D[2026-04-20],
          value: Decimal.new("91.40")
        )

      _other_client_entry =
        insert_weight_entry(
          client: insert(:client, creator: coach, business: coach.business, user: insert(:user)),
          business: coach.business,
          date: ~D[2026-04-21]
        )

      result_ids =
        WeightEntry
        |> WeightEntry.for_business(coach.business_id)
        |> WeightEntry.for_client(client.id)
        |> WeightEntry.since(~D[2026-04-10])
        |> WeightEntry.ordered()
        |> Repo.all()
        |> Enum.map(& &1.id)

      assert result_ids == [newer.id]
      refute older.id in result_ids
    end
  end

  describe "adherence/3" do
    test "counts entries in the last 30 days" do
      client = insert_client()
      today = Date.utc_today()

      insert_weight_entry(client: client, date: today)
      insert_weight_entry(client: client, date: Date.add(today, -10))
      insert_weight_entry(client: client, date: Date.add(today, -40))

      assert {:ok, %{logged_days: 2, window_days: 30}} =
               WeightEntry.adherence(client.business_id, client.id)
    end

    test "counts an upserted date only once" do
      client = insert_client()
      today = Date.utc_today()

      {:ok, _first} =
        WeightEntry.upsert(client.id, client.business_id, %{
          "date" => Date.to_iso8601(today),
          "value" => "90.00",
          "unit" => "kg"
        })

      {:ok, _second} =
        WeightEntry.upsert(client.id, client.business_id, %{
          "date" => Date.to_iso8601(today),
          "value" => "89.50",
          "unit" => "kg"
        })

      assert {:ok, %{logged_days: 1, window_days: 30}} =
               WeightEntry.adherence(client.business_id, client.id)
    end
  end

  describe "parse_since/1" do
    test "accepts nil, empty, and valid date strings" do
      assert {:ok, nil} = WeightEntry.parse_since(nil)
      assert {:ok, nil} = WeightEntry.parse_since("")
      assert {:ok, ~D[2026-04-01]} = WeightEntry.parse_since("2026-04-01")
    end

    test "rejects invalid date strings" do
      assert {:error, %Error{detail: %{fields: %{since: ["is invalid"]}}}} =
               WeightEntry.parse_since("bad-date")
    end
  end

  describe "upsert/3" do
    test "inserts a new entry" do
      client = insert_client()

      assert {:ok, entry} =
               WeightEntry.upsert(client.id, client.business_id, %{
                 "date" => "2026-04-22",
                 "value" => "91.40",
                 "unit" => "kg",
                 "note" => "morning"
               })

      assert entry.date == ~D[2026-04-22]
      assert Decimal.eq?(entry.value, Decimal.new("91.40"))
      assert entry.unit == :kg
      assert entry.note == "morning"
    end

    test "updates an existing entry for the same date" do
      client = insert_client()

      original =
        insert_weight_entry(
          client: client,
          date: ~D[2026-04-22],
          value: Decimal.new("92.10"),
          note: "first"
        )

      assert {:ok, updated} =
               WeightEntry.upsert(client.id, client.business_id, %{
                 "date" => "2026-04-22",
                 "value" => "91.40",
                 "unit" => "kg",
                 "note" => "updated"
               })

      assert updated.id == original.id
      assert Decimal.eq?(updated.value, Decimal.new("91.40"))
      assert updated.note == "updated"
    end

    test "returns validation error for invalid date" do
      client = insert_client()

      assert {:error, %Error{detail: %{fields: %{date: ["is invalid"]}}}} =
               WeightEntry.upsert(client.id, client.business_id, %{
                 "date" => "bad-date",
                 "value" => 91.4,
                 "unit" => "kg"
               })
    end

    test "returns validation error for a future date beyond the timezone buffer" do
      client = insert_client()

      assert {:error, %Error{detail: %{fields: %{date: ["cannot be in the future"]}}}} =
               WeightEntry.upsert(client.id, client.business_id, %{
                 "date" => Date.utc_today() |> Date.add(2) |> Date.to_iso8601(),
                 "value" => 91.4,
                 "unit" => "kg"
               })
    end
  end

  describe "delete/1" do
    test "deletes the entry" do
      entry = insert_weight_entry()

      assert {:ok, _deleted} = WeightEntry.delete(entry)
      assert Repo.get(WeightEntry, entry.id) == nil
    end
  end

  defp insert_client do
    coach = insert(:coach)
    insert(:client, creator: coach, business: coach.business, user: insert(:user))
  end

  defp insert_weight_entry(attrs \\ []) do
    client = Keyword.get(attrs, :client) || insert_client()
    business = Keyword.get(attrs, :business) || client.business
    insert(:weight_entry, Keyword.merge([client: client, business: business], attrs))
  end
end
