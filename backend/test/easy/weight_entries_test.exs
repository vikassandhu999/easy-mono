defmodule Easy.WeightEntriesTest do
  use Easy.DataCase, async: true

  alias Easy.WeightEntries

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

    test "adherence returns :not_found for a client assigned to another trainer", %{
      trainer_a: trainer_a,
      client_b: client_b
    } do
      assert {:error, :not_found} = WeightEntries.adherence(trainer_ctx(trainer_a), client_b.id)
    end

    test "owner ctx succeeds on both", %{business: business, client_b: client_b} do
      ctx = owner_ctx(business)

      assert {:ok, %{entries: [_]}} = WeightEntries.list_entries_for_client(ctx, client_b.id)
      assert {:ok, %{logged_days: 1}} = WeightEntries.adherence(ctx, client_b.id)
    end
  end
end
