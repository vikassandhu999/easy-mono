defmodule Easy.Nutrition.DiaryIdentityMigrationTest do
  use Easy.DataCase
  import Easy.Nutrition.DiaryFixtures
  alias Easy.Nutrition.{Diary, DiaryFrozenPlannedItem}
  alias Ecto.Migration.Runner

  test "migration repairs historical pending identities and prevents another missing identity" do
    %{client: client, today: today} = covering_setup()
    ctx = client_ctx(client)
    {:ok, live} = Diary.get_client_nutrition_day(ctx, today)
    {:ok, _} = Diary.save_client_nutrition_day(ctx, today, %{slots: [slot_draft(hd(live.slots))]})
    [item] = Repo.all(DiaryFrozenPlannedItem.for_business(client.business_id))

    Repo.query!("ALTER TABLE nutrition_diary_frozen_planned_items ALTER COLUMN source_meal_item_id DROP NOT NULL")
    Repo.update!(Ecto.Changeset.change(item, source_meal_item_id: nil))
    migration = Easy.Repo.Migrations.RequireFrozenPlannedItemIdentity

    unless Code.ensure_loaded?(migration) do
      Code.require_file("priv/repo/migrations/20260906110000_require_frozen_planned_item_identity.exs")
    end

    Runner.run(Repo, Repo.config(), 20_260_906_110_000, migration, :forward, :up, :up, log: false)

    assert Repo.get!(DiaryFrozenPlannedItem, item.id).source_meal_item_id == item.id
    assert {:ok, day} = Diary.get_client_nutrition_day(ctx, today)
    assert [%{rows: [%{id: id, planned_item_ref: id, status: :pending}]}] = day.slots
    assert id == item.id

    assert_raise Postgrex.Error, fn ->
      Repo.update!(Ecto.Changeset.change(item, source_meal_item_id: nil))
    end
  end

  test "migration repairs historical recipe servings before the strict portion contract reads them" do
    client = insert(:client)
    recipe = insert(:recipe, business: client.business, cooked_weight_g: nil)
    ctx = client_ctx(client)
    date = local_today(client)
    {:ok, day} = save_extra(ctx, date, %{meal_slot: :lunch, recipe_id: recipe.id, portion: %{kind: :serving, amount: 1, unit: "serving", label: nil}})
    [row] = hd(day.slots).rows

    for table <- ~w(nutrition_meal_items nutrition_diary_frozen_planned_items nutrition_diary_entries) do
      Repo.query!("ALTER TABLE #{table} DROP CONSTRAINT #{table}_canonical_portion_check")
    end

    entry = Repo.get!(Easy.Nutrition.DiaryEntry, row.entry_id)
    Repo.update!(Ecto.Changeset.change(entry, unit: nil))

    migration = Easy.Repo.Migrations.CanonicalizeNutritionPortions

    unless Code.ensure_loaded?(migration) do
      Code.require_file("priv/repo/migrations/20260906120000_canonicalize_nutrition_portions.exs")
    end

    Runner.run(Repo, Repo.config(), 20_260_906_120_000, migration, :forward, :up, :up, log: false)

    {:ok, day} = Diary.get_client_nutrition_day(ctx, date)
    assert hd(hd(day.slots).rows).portion == %{kind: :serving, amount: 1.0, unit: "serving", label: nil}
    draft = slot_draft(hd(day.slots))
    [command] = draft.entries

    command = %{command | portion: %{command.portion | amount: 2}}

    assert {:ok, corrected} =
             Diary.save_client_nutrition_day(ctx, date, %{slots: [%{draft | entries: [command]}]})

    assert hd(hd(corrected.slots).rows).portion.amount == 2.0
  end
end
