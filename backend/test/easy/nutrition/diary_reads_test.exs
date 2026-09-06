defmodule Easy.Nutrition.DiaryReadsTest do
  alias Easy.Nutrition.DiaryFixtures
  use Easy.DataCase, async: true
  alias Easy.LocalCalendar
  alias Easy.Nutrition.{Diary, Diary.DayAssembler, DiaryEntry, Library, Plan, Programming}
  alias Easy.Repo
  import Ecto.Query
  import Easy.Nutrition.DiaryFixtures

  describe("get_client_nutrition_day/2") do
    test "returns live offered Meals for an unstarted slot on the client's local day" do
      %{client: client, food: food, plan: plan} = covering_setup()
      today = local_today(client)
      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert day.date == today
      assert day.plan_id == plan.id
      assert day.write_eligible == true
      assert day.targets.calories == plan.target_calories
      assert Enum.any?(day.slots, fn slot -> Enum.any?(slot.rows, &(&1.status == :pending)) end)
      [slot] = day.slots
      assert slot.meal_slot == :breakfast
      assert Enum.all?(slot.rows, &(&1.status == :pending and is_nil(&1.entry_id)))
      [option] = slot.options
      assert option.meal_name == "Breakfast"
      [item] = option.items
      assert Map.has_key?(item, :planned_item_ref)
      refute Map.has_key?(item, :meal_item_id)
      assert item.name == food.name
      assert item.kind == :food
    end

    test "returns opaque planned item references in frozen guidance" do
      %{client: client, food: food} = covering_setup()
      today = local_today(client)

      assert {:ok, day} =
               DiaryFixtures.save_extra(
                 client_ctx(client),
                 today,
                 extra_attrs(food)
               )

      [item] = day.slots |> hd() |> Map.fetch!(:options) |> hd() |> Map.fetch!(:items)
      assert Map.has_key?(item, :planned_item_ref)
      refute Map.has_key?(item, :meal_item_id)
    end

    test "uses one captured clock across a read at local midnight" do
      %{client: client, food: food} = covering_setup()
      today = local_today(client)
      ctx = client_ctx(client)
      assert {:ok, _day} = DiaryFixtures.save_extra(ctx, today, extra_attrs(food))
      client = Repo.preload(client, :business)
      before_midnight = DateTime.new!(today, ~T[18:29:59], "Etc/UTC")
      after_midnight = DateTime.add(before_midnight, 2, :second)

      assert {:ok, before_day} =
               DayAssembler.assemble(ctx, client, today, :client, before_midnight)

      assert {:ok, after_day} = DayAssembler.assemble(ctx, client, today, :client, after_midnight)
      before_statuses = before_day.slots |> hd() |> Map.fetch!(:rows) |> Enum.map(& &1.status)
      after_statuses = after_day.slots |> hd() |> Map.fetch!(:rows) |> Enum.map(& &1.status)
      assert :pending in before_statuses
      refute :skipped in before_statuses
      assert :skipped in after_statuses
      refute :pending in after_statuses
    end

    test "returns a successful Nutrition Day with no live guidance when Coverage is missing" do
      client = insert(:client)
      today = local_today(client)
      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert day.date == today
      assert day.plan_id == nil

      assert day.targets == %{
               calories: nil,
               protein_g: nil,
               carbs_g: nil,
               fat_g: nil,
               fiber_g: nil
             }

      assert day.slots == []
      assert day.write_eligible == true
    end

    test "does not join mutable Programming for a past local date with no frozen Diary rows" do
      %{client: client, plan: plan} = covering_setup(start_offset: -7)
      past = Date.add(local_today(client), -1)
      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), past)
      assert day.date == past
      assert day.plan_id == nil
      assert day.slots == []
      assert day.write_eligible == true
      assert Repo.get!(Easy.Nutrition.Plan, plan.id).start_date != nil
    end

    test "orders ordinary Meal Slots before the workout group regardless of stored option order" do
      %{client: client} = covering_setup(menu: :ordered)
      today = local_today(client)
      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert Enum.map(day.slots, & &1.meal_slot) == [:breakfast, :post_workout]
    end

    test "lets a future local date be read as live guidance that is write-ineligible" do
      %{client: client, plan: plan} = covering_setup()
      future = Date.add(local_today(client), 1)
      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), future)
      assert day.plan_id == plan.id
      assert [%{meal_slot: :breakfast, rows: [%{status: :pending, entry_id: nil}]}] = day.slots
      assert day.write_eligible == false
    end

    test "identifies today from the Client timezone with Business fallback" do
      business = insert(:business, timezone: "Pacific/Kiritimati")
      coach = insert(:coach, business: business)

      client =
        insert(:client,
          business: business,
          creator: coach,
          assigned_coach: coach,
          timezone: "UTC"
        )

      utc_today = LocalCalendar.to_local_date(DateTime.utc_now(), "UTC")

      assert {:ok, %{count: 1, nutrition_days: [day]}} =
               Diary.list_client_nutrition_days(client_ctx(client), [])

      assert day.date == utc_today

      Repo.update_all(from(c in Easy.Clients.Client, where: c.id == ^client.id),
        set: [timezone: ""]
      )

      client = Repo.get!(Easy.Clients.Client, client.id) |> Repo.preload(:business)
      kiritimati_today = LocalCalendar.to_local_date(DateTime.utc_now(), "Pacific/Kiritimati")

      assert {:ok, %{nutrition_days: [fallback]}} =
               Diary.list_client_nutrition_days(client_ctx(client), [])

      assert fallback.date == kiritimati_today
    end

    test "does not reconstruct Nutrition Days from discarded Programming rows" do
      %{client: client} = covering_setup()
      today = local_today(client)
      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert [%{rows: [%{status: :pending, entry_id: nil}]}] = day.slots
    end
  end

  describe("coach and owner reads") do
    test "return the same Nutrition Day as the client" do
      %{client: client, coach: coach, plan: plan} = covering_setup()
      today = local_today(client)
      business = Repo.preload(coach.business, :owner)
      insert(:coach, user: business.owner, business: business)
      assert {:ok, client_day} = Diary.get_client_nutrition_day(client_ctx(client), today)

      assert {:ok, coach_day} =
               Diary.get_nutrition_day_for_client(trainer_ctx(coach), client.id, today)

      assert {:ok, owner_day} =
               Diary.get_nutrition_day_for_client(owner_ctx(business), client.id, today)

      assert client_day.plan_id == plan.id
      assert coach_day == client_day
      assert owner_day == client_day
    end

    test "conceals another tenant's client" do
      %{client: client} = covering_setup()
      other = insert(:coach)

      assert {:error, :not_found} =
               Diary.get_nutrition_day_for_client(
                 trainer_ctx(other),
                 client.id,
                 local_today(client)
               )
    end

    test "conceals a client the coach does not coach" do
      %{client: client, coach: coach} = covering_setup()
      peer = insert(:coach, business: coach.business)

      assert {:error, :not_found} =
               Diary.get_nutrition_day_for_client(
                 trainer_ctx(peer),
                 client.id,
                 local_today(client)
               )
    end

    test "paginates a bounded local-date range and reports the full count" do
      client = insert(:client)
      from_date = ~D[2026-08-01]
      to_date = ~D[2026-08-05]

      assert {:ok, %{count: 5, nutrition_days: days}} =
               Diary.list_client_nutrition_days(client_ctx(client),
                 from: from_date,
                 to: to_date,
                 offset: 1,
                 limit: 2
               )

      assert Enum.map(days, & &1.date) == [~D[2026-08-02], ~D[2026-08-03]]
    end

    test "rejects reversed, incomplete, and oversized local-date ranges" do
      client = insert(:client)
      ctx = client_ctx(client)

      assert {:error, :invalid_date_range} =
               Diary.list_client_nutrition_days(ctx, from: ~D[2026-08-10], to: ~D[2026-08-01])

      assert {:error, :incomplete_date_range} =
               Diary.list_client_nutrition_days(ctx, from: ~D[2026-08-01])

      assert {:error, :incomplete_date_range} =
               Diary.list_client_nutrition_days(ctx, to: ~D[2026-08-01])

      assert {:error, :date_range_too_wide} =
               Diary.list_client_nutrition_days(ctx, from: ~D[2026-08-01], to: ~D[2026-09-01])
    end

    test "past dates in a range never join mutable Programming" do
      %{client: client, plan: plan} = covering_setup(start_offset: -7)
      past = Date.add(local_today(client), -1)

      assert {:ok, %{nutrition_days: [day]}} =
               Diary.list_client_nutrition_days(client_ctx(client), from: past, to: past)

      assert day.date == past
      assert day.plan_id == nil
      assert day.slots == []
      assert Repo.get!(Plan, plan.id)
    end
  end

  describe("Nutrition Day summaries") do
    test "derive counts, totals, and adherence from the same frozen rows as detail" do
      %{client: client, coach: coach} = covering_setup()
      today = local_today(client)
      ctx = client_ctx(client)
      extra = insert(:food, business: coach.business, creator: coach, name: "Banana")
      planned_item_ref = live_planned_item_ref(client, today)

      assert {:ok, _} =
               DiaryFixtures.save_extra(
                 ctx,
                 today,
                 %{
                   meal_slot: :breakfast,
                   planned_item_ref: planned_item_ref,
                   portion: %{kind: :gram, grams: 50.0}
                 }
               )

      assert {:ok, day} =
               DiaryFixtures.save_extra(
                 ctx,
                 today,
                 extra_attrs(extra, grams: 50.0)
               )

      assert day.applied_timezone == LocalCalendar.default_timezone()
      assert day.summary.counts.as_planned == 1
      assert day.summary.counts.added == 1
      assert day.summary.counts.swapped == 0
      assert day.summary.counts.skipped == 0
      assert day.summary.has_intake
      assert day.summary.logged.calories == 200.0
      assert day.summary.planned.calories == 100.0
      assert day.summary.adherence == :under
      assert hd(day.slots).applied_timezone == day.applied_timezone
      assert hd(day.slots).logged_calories == day.summary.logged.calories

      assert {:ok, coach_day} =
               Diary.get_nutrition_day_for_client(trainer_ctx(coach), client.id, today)

      assert coach_day.summary == day.summary
      assert coach_day.applied_timezone == day.applied_timezone
      assert hd(coach_day.slots).rows == hd(day.slots).rows
    end

    test "calorie adherence is unavailable when calories are unknown while other nutrients remain" do
      %{client: client, coach: coach} = covering_setup()
      today = local_today(client)

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          name: "Mystery",
          calories_per_100g: nil,
          protein_g_per_100g: 20.0
        )

      assert {:ok, day} =
               DiaryFixtures.save_extra(
                 client_ctx(client),
                 today,
                 extra_attrs(food, grams: 50.0)
               )

      assert day.summary.has_intake
      assert day.summary.logged.calories == nil
      assert day.summary.logged.protein == 10.0
      assert day.summary.adherence == nil
      assert hd(day.slots).logged_calories == nil
    end

    test "calorie adherence is unavailable when the calorie target is zero" do
      %{client: client, food: food, plan: plan} = covering_setup()
      today = local_today(client)
      plan |> Ecto.Changeset.change(target_calories: 0.0) |> Repo.update!()

      assert {:ok, day} =
               DiaryFixtures.save_extra(
                 client_ctx(client),
                 today,
                 extra_attrs(food)
               )

      assert day.summary.has_intake
      assert day.targets.calories == 0.0
      assert day.summary.logged.calories
      assert day.summary.adherence == nil
    end

    test "a day without intake reports none adherence" do
      client = insert(:client)
      past = Date.add(local_today(client), -1)
      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), past)
      refute day.summary.has_intake
      assert day.summary.adherence == :none
      assert day.applied_timezone == LocalCalendar.default_timezone()
    end
  end

  describe("frozen history durability") do
    test "deleting a Nutrition Template leaves assigned Client Plans and Diary history" do
      %{client: client, coach: coach, food: food, plan: plan} = covering_setup()
      today = local_today(client)
      ctx = trainer_ctx(coach)
      template_id = plan.source_template_id

      assert {:ok, logged} =
               DiaryFixtures.save_extra(
                 client_ctx(client),
                 today,
                 extra_attrs(food)
               )

      template = Repo.get!(Plan, template_id)
      assert {:ok, _} = Programming.delete_template(ctx, template.id, template.revision)
      assert Repo.get(Plan, template.id) == nil
      kept = Repo.get!(Plan, plan.id)
      assert kept.source_template_id == nil
      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)

      assert hd(day.slots).rows |> Enum.find(& &1.entry_id) |> Map.fetch!(:id) ==
               hd(logged.slots).rows
               |> Enum.find(& &1.entry_id)
               |> Map.fetch!(:id)
    end

    test "deleting a Client Plan leaves Diary history unchanged" do
      %{client: client, coach: coach, food: food, plan: plan} = covering_setup()
      today = local_today(client)

      assert {:ok, logged} =
               DiaryFixtures.save_extra(
                 client_ctx(client),
                 today,
                 extra_attrs(food)
               )

      entry_id =
        hd(logged.slots).rows |> Enum.find(& &1.entry_id) |> Map.fetch!(:id)

      frozen_targets = logged.targets
      frozen_adherence = logged.summary.adherence
      assert {:ok, _} = Programming.delete_plan(trainer_ctx(coach), plan.id, plan.revision)
      assert Repo.get(Plan, plan.id) == nil
      assert {:ok, day} = Diary.get_client_nutrition_day(client_ctx(client), today)
      assert Enum.any?(hd(day.slots).rows, &(&1.entry_id && &1.id == entry_id))
      assert hd(day.slots).options != []
      assert day.targets == frozen_targets
      assert day.summary.adherence == frozen_adherence
    end

    test "deleting a Client Plan preserves frozen option identities and the active summary" do
      %{client: client, coach: coach, plan: plan} = covering_setup(menu: :two_options)
      today = local_today(client)
      ctx = client_ctx(client)
      extra = insert(:food, business: coach.business, creator: coach)

      assert {:ok, frozen} =
               DiaryFixtures.save_extra(ctx, today, extra_attrs(extra))

      [option_a, option_b] = hd(frozen.slots).options

      assert {:ok, switched} =
               DiaryFixtures.save_option(
                 ctx,
                 today,
                 %{meal_slot: :breakfast, meal_id: option_b.meal_id, expected_revision: 1}
               )

      planned_calories = hd(switched.slots).planned_calories
      assert {:ok, _} = Programming.delete_plan(trainer_ctx(coach), plan.id, plan.revision)
      assert {:ok, kept} = Diary.get_client_nutrition_day(ctx, today)

      assert Enum.map(hd(kept.slots).options, & &1.meal_id) == [
               option_a.meal_id,
               option_b.meal_id
             ]

      assert hd(kept.slots).meal_id == option_b.meal_id
      assert hd(kept.slots).planned_calories == planned_calories

      assert {:ok, switched_back} =
               DiaryFixtures.save_option(
                 ctx,
                 today,
                 %{
                   meal_slot: :breakfast,
                   meal_id: option_a.meal_id,
                   expected_revision: hd(kept.slots).revision
                 }
               )

      assert hd(switched_back.slots).meal_id == option_a.meal_id
    end

    test "Library deletion does not turn a substituted fulfilment into as-planned" do
      %{client: client, coach: coach, food: planned_food, plan: plan} = covering_setup()
      substitute = insert(:food, business: coach.business, creator: coach, name: "Eggs")
      today = local_today(client)
      ctx = client_ctx(client)
      planned_item_ref = live_planned_item_ref(client, today)

      assert {:ok, replaced} =
               DiaryFixtures.save_extra(
                 ctx,
                 today,
                 %{
                   meal_slot: :breakfast,
                   planned_item_ref: planned_item_ref,
                   food_id: substitute.id,
                   portion: %{kind: :gram, grams: 50.0},
                   expected_revision: 1
                 }
               )

      assert hd(replaced.slots).rows |> hd() |> Map.fetch!(:status) == :swapped
      coach_ctx = trainer_ctx(coach)
      template = Repo.get!(Plan, plan.source_template_id)
      assert {:ok, _} = Programming.delete_plan(coach_ctx, plan.id, plan.revision)
      assert {:ok, _} = Programming.delete_template(coach_ctx, template.id, template.revision)
      assert {:ok, _} = Library.delete_food(coach_ctx, planned_food.id, planned_food.revision)
      assert {:ok, _} = Library.delete_food(coach_ctx, substitute.id, substitute.revision)
      assert {:ok, reread} = Diary.get_client_nutrition_day(ctx, today)
      assert hd(reread.slots).rows |> hd() |> Map.fetch!(:status) == :swapped
    end

    test "deleting a Food or Recipe unused by Menus nulls the Diary reference and keeps frozen values" do
      %{client: client, coach: coach} = covering_setup()
      today = local_today(client)
      ctx = trainer_ctx(coach)

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          name: "Banana",
          calories_per_100g: 90.0
        )

      assert {:ok, food_day} =
               DiaryFixtures.save_extra(
                 client_ctx(client),
                 today,
                 extra_attrs(food, grams: 100.0)
               )

      food_entry = hd(food_day.slots).rows |> Enum.find(& &1.entry_id)
      assert food_entry.food_id == food.id
      assert {:ok, _} = Library.delete_food(ctx, food.id, food.revision)
      kept_food = Repo.get!(DiaryEntry, food_entry.id)
      assert kept_food.food_id == nil
      assert kept_food.display_name == "Banana"
      assert kept_food.calories == 90.0
      assert kept_food.complete
      assert {:ok, reread} = Diary.get_client_nutrition_day(client_ctx(client), today)
      row = Enum.find(hd(reread.slots).rows, &(&1.entry_id && &1.id == food_entry.id))
      assert row.food_id == nil
      assert row.name == "Banana"
      assert row.status == :added
      recipe_food = insert(:food, business: coach.business, creator: coach, name: "Rice")

      lone_recipe =
        insert(:recipe,
          business: coach.business,
          creator: coach,
          name: "Rice bowl",
          servings_count: 2
        )

      insert(:recipe_ingredient,
        business: coach.business,
        recipe: lone_recipe,
        food: recipe_food,
        weight_g: 100.0
      )

      assert {:ok, recipe_day} =
               DiaryFixtures.save_extra(
                 client_ctx(client),
                 today,
                 %{
                   meal_slot: :lunch,
                   recipe_id: lone_recipe.id,
                   portion: %{kind: :serving, amount: 1, unit: "serving", label: nil}
                 }
               )

      recipe_entry =
        recipe_day.slots
        |> Enum.flat_map(& &1.rows)
        |> Enum.find(&(&1.entry_id && &1.kind == :recipe))

      assert recipe_entry.recipe_id == lone_recipe.id
      assert {:ok, _} = Library.delete_recipe(ctx, lone_recipe.id, lone_recipe.revision)
      kept_recipe = Repo.get!(DiaryEntry, recipe_entry.id)
      assert kept_recipe.recipe_id == nil
      assert kept_recipe.display_name == "Rice bowl"
      assert kept_recipe.amount == 1.0
      assert kept_recipe.complete
      assert {:ok, reread_recipe} = Diary.get_client_nutrition_day(client_ctx(client), today)

      recipe_row =
        reread_recipe.slots
        |> Enum.flat_map(& &1.rows)
        |> Enum.find(&(&1.entry_id && &1.id == recipe_entry.id))

      assert recipe_row.status == :added
      assert recipe_row.name == "Rice bowl"
      assert recipe_row.recipe_id == nil
      assert recipe_row.nutrients.complete
    end
  end

  describe("inactive client access") do
    test "an inactive client cannot write, while an authorized coach can still read history" do
      %{client: client, coach: coach, food: food} = covering_setup()
      today = local_today(client)

      assert {:ok, logged} =
               DiaryFixtures.save_extra(
                 client_ctx(client),
                 today,
                 extra_attrs(food)
               )

      client
      |> Ecto.Changeset.change(status: :inactive, inactive_reason: :manual)
      |> Repo.update!()

      inactive = Repo.get!(Easy.Clients.Client, client.id)

      assert {:error, :client_inactive} =
               DiaryFixtures.save_extra(
                 client_ctx(inactive),
                 today,
                 extra_attrs(food)
               )

      assert {:ok, coach_day} =
               Diary.get_nutrition_day_for_client(trainer_ctx(coach), client.id, today)

      assert coach_day.summary.has_intake

      assert hd(coach_day.slots).rows
             |> Enum.find(& &1.entry_id)
             |> Map.fetch!(:id) ==
               hd(logged.slots).rows
               |> Enum.find(& &1.entry_id)
               |> Map.fetch!(:id)
    end
  end
end
