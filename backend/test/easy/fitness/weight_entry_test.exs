defmodule Easy.Fitness.WeightEntryTest do
  use Easy.DataCase

  alias Easy.Fitness.WeightEntry
  alias Easy.WeightEntries

  describe "insert_changeset/3" do
    test "is valid with required fields" do
      client = insert_client()

      changeset =
        WeightEntry.insert_changeset(client.business_id, client.id, %{
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
      changeset = WeightEntry.insert_changeset(client.business_id, client.id, %{})

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
        WeightEntry.insert_changeset(client.business_id, client.id, %{
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
        WeightEntry.insert_changeset(client.business_id, client.id, %{
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
        |> WeightEntry.for_client(coach.business_id, client.id)
        |> WeightEntry.since(~D[2026-04-10])
        |> WeightEntry.oldest()
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
      ctx = trainer_ctx(client.creator)

      insert_weight_entry(client: client, date: today)
      insert_weight_entry(client: client, date: Date.add(today, -10))
      insert_weight_entry(client: client, date: Date.add(today, -40))

      assert {:ok, %{logged_days: 2, window_days: 30}} =
               WeightEntries.adherence(ctx, client.id)
    end

    test "counts an upserted date only once" do
      client = insert_client()
      today = Date.utc_today()
      ctx = trainer_ctx(client.creator)

      {:ok, _first} =
        WeightEntries.upsert_client_weight_entry(client_ctx(client), %{
          date: Date.to_iso8601(today),
          value: "90.00",
          unit: "kg"
        })

      {:ok, _second} =
        WeightEntries.upsert_client_weight_entry(client_ctx(client), %{
          date: Date.to_iso8601(today),
          value: "89.50",
          unit: "kg"
        })

      assert {:ok, %{logged_days: 1, window_days: 30}} =
               WeightEntries.adherence(ctx, client.id)
    end
  end

  describe "list_client_weight_entries/2 since parsing" do
    test "accepts nil, empty, and valid date strings" do
      client = insert_client()

      assert {:ok, %{entries: []}} =
               WeightEntries.list_client_weight_entries(client_ctx(client), since: nil)

      assert {:ok, %{entries: []}} =
               WeightEntries.list_client_weight_entries(client_ctx(client), since: "")

      assert {:ok, %{entries: []}} =
               WeightEntries.list_client_weight_entries(client_ctx(client), since: "2026-04-01")
    end

    test "rejects invalid date strings" do
      client = insert_client()

      assert {:error, :invalid_since} =
               WeightEntries.list_client_weight_entries(client_ctx(client), since: "bad-date")
    end
  end

  describe "upsert_client_weight_entry/2" do
    test "inserts a new entry" do
      client = insert_client()

      assert {:ok, entry} =
               WeightEntries.upsert_client_weight_entry(client_ctx(client), %{
                 date: "2026-04-22",
                 value: "91.40",
                 unit: "kg",
                 note: "morning"
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
               WeightEntries.upsert_client_weight_entry(client_ctx(client), %{
                 date: "2026-04-22",
                 value: "91.40",
                 unit: "kg",
                 note: "updated"
               })

      assert updated.id == original.id
      assert Decimal.eq?(updated.value, Decimal.new("91.40"))
      assert updated.note == "updated"
    end

    test "self logging ignores a submission-backed entry on the same date" do
      client = insert_client()
      template = insert(:form_template, business: client.business)
      assignment = insert(:form_assignment, business: client.business, client: client, form_template: template)
      submission = insert(:form_submission, business: client.business, client: client, form_assignment: assignment)

      derived =
        insert_weight_entry(
          client: client,
          date: ~D[2026-04-22],
          value: Decimal.new("92.10"),
          form_submission_id: submission.id
        )

      assert {:ok, self_log} =
               WeightEntries.upsert_client_weight_entry(client_ctx(client), %{
                 date: "2026-04-22",
                 value: "91.40",
                 unit: "kg"
               })

      refute self_log.id == derived.id
      assert is_nil(self_log.form_submission_id)
      assert Repo.get!(WeightEntry, derived.id)
    end

    test "returns validation error for invalid date" do
      client = insert_client()

      assert {:error, :invalid_date} =
               WeightEntries.upsert_client_weight_entry(client_ctx(client), %{
                 date: "bad-date",
                 value: 91.4,
                 unit: "kg"
               })
    end

    test "returns validation error for a future date beyond the timezone buffer" do
      client = insert_client()

      assert {:error, :future_date} =
               WeightEntries.upsert_client_weight_entry(client_ctx(client), %{
                 date: Date.utc_today() |> Date.add(2) |> Date.to_iso8601(),
                 value: 91.4,
                 unit: "kg"
               })
    end
  end

  describe "delete_client_weight_entry/2" do
    test "deletes the entry" do
      entry = insert_weight_entry()

      assert {:ok, _deleted} =
               WeightEntries.delete_client_weight_entry(client_ctx(entry.client), entry.id)

      assert Repo.get(WeightEntry, entry.id) == nil
    end
  end

  defp insert_client do
    coach = insert(:coach)
    insert(:client, creator: coach, business: coach.business, user: insert(:user))
  end

  defp client_ctx(client), do: Easy.Ctx.new(client.business_id, client.user_id)

  defp insert_weight_entry(attrs \\ []) do
    client = Keyword.get(attrs, :client) || insert_client()
    business = Keyword.get(attrs, :business) || client.business
    insert(:weight_entry, Keyword.merge([client: client, business: business], attrs))
  end
end
