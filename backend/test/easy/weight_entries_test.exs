defmodule Easy.WeightEntriesTest do
  use Easy.DataCase, async: true

  alias Easy.{Ctx, WeightEntries}

  test "client operations reject missing or cross-business membership without modifying entries" do
    client = insert(:client)
    other_business = insert(:business)
    entry = insert(:weight_entry, client: client, business: client.business, date: Date.utc_today())
    ctx = client_ctx(client)

    for invalid_ctx <- [%{ctx | client_id: nil}, %{ctx | business_id: other_business.id}] do
      assert {:error, :not_found} = WeightEntries.list_client_weight_entries(invalid_ctx)

      assert {:error, :not_found} =
               WeightEntries.upsert_client_weight_entry(invalid_ctx, %{
                 date: entry.date,
                 value: "99",
                 unit: "kg"
               })

      assert {:error, :not_found} = WeightEntries.delete_client_weight_entry(invalid_ctx, entry.id)
      assert Repo.reload!(entry).value == entry.value
    end
  end

  test "coach history and adherence reject a client from another business even for owners" do
    business = insert(:business)
    other_client = insert(:client)
    insert(:weight_entry, client: other_client, business: other_client.business, date: Date.utc_today())
    ctx = owner_ctx(business)

    assert {:error, :not_found} = WeightEntries.list_entries_for_client(ctx, other_client.id)
  end

  test "form weight recording requires matching tenant and client identities" do
    client = insert(:client)
    ctx = client_ctx(client)

    submission =
      build(:form_submission,
        business_id: client.business_id,
        client_id: client.id,
        question_snapshot: [],
        answers: %{}
      )

    assert {:ok, []} = WeightEntries.record_form_submission(ctx, client, submission)

    assert {:error, :not_found} =
             WeightEntries.record_form_submission(%{ctx | business_id: Ecto.UUID.generate()}, client, submission)

    assert {:error, :not_found} =
             WeightEntries.record_form_submission(ctx, client, %{submission | client_id: Ecto.UUID.generate()})

    assert {:error, :not_found} =
             WeightEntries.record_form_submission(ctx, client, %{submission | business_id: Ecto.UUID.generate()})
  end

  test "string-keyed writes preserve omitted fields and clear an explicit nil note" do
    client = insert(:client)
    ctx = client_ctx(client)
    date = Date.to_iso8601(Date.utc_today())

    assert {:ok, entry} =
             WeightEntries.upsert_client_weight_entry(ctx, %{
               "date" => date,
               "value" => "80.5",
               "unit" => "kg",
               "note" => "morning"
             })

    assert {:ok, updated} = WeightEntries.upsert_client_weight_entry(ctx, %{"date" => date, "note" => nil})
    assert updated.id == entry.id
    assert Decimal.equal?(updated.value, entry.value)
    assert updated.unit == :kg
    assert is_nil(updated.note)
  end

  test "required values cannot be cleared on an existing weight entry" do
    client = insert(:client)
    entry = insert(:weight_entry, client: client, business: client.business, date: Date.utc_today())

    for field <- [:value, :unit] do
      attrs = Map.put(%{date: entry.date}, field, nil)
      assert {:error, changeset} = WeightEntries.upsert_client_weight_entry(client_ctx(client), attrs)
      assert errors_on(changeset)[field] == ["can't be blank"]
      assert Repo.reload!(entry).value == entry.value
    end
  end

  test "self logging ignores caller-supplied ownership and submission linkage" do
    client = insert(:client)

    assert {:ok, entry} =
             WeightEntries.upsert_client_weight_entry(client_ctx(client), %{
               date: Date.utc_today(),
               value: "80",
               unit: "kg",
               business_id: Ecto.UUID.generate(),
               client_id: Ecto.UUID.generate(),
               form_submission_id: Ecto.UUID.generate()
             })

    assert entry.business_id == client.business_id
    assert entry.client_id == client.id
    assert is_nil(entry.form_submission_id)
  end

  defp client_ctx(client), do: %Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}

  describe "client visibility (trainer-team access control)" do
    setup do
      business = insert(:business)
      insert(:coach, business: business, user: business.owner)
      trainer_a = insert(:coach, business: business)
      trainer_b = insert(:coach, business: business)
      client_b = insert(:client, business: business, creator: trainer_b, assigned_coach: trainer_b)
      insert(:weight_entry, business: business, client: client_b, date: Date.utc_today())

      %{business: business, trainer_a: trainer_a, client_b: client_b}
    end

    test "list_entries_for_client returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b
    } do
      assert {:error, :not_found} = WeightEntries.list_entries_for_client(trainer_ctx(trainer_a), client_b.id)
    end

    test "owner history includes entries and adherence", %{business: business, client_b: client_b} do
      ctx = owner_ctx(business)

      assert {:ok, %{entries: [_], adherence: %{logged_days: 1}}} =
               WeightEntries.list_entries_for_client(ctx, client_b.id)
    end
  end
end
