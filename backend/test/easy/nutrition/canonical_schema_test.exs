defmodule Easy.Nutrition.CanonicalSchemaTest do
  alias Easy.Nutrition.DiaryFixtures
  use Easy.DataCase, async: true
  alias Easy.Nutrition.{DiaryEntry, Food, Menu}

  describe("canonical Nutrition Programming constraints") do
    test "the database rejects client-plan fields on a template" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [
          plan_row(coach,
            kind: "template",
            client_id: dump_uuid(client.id),
            start_date: ~D[2026-08-15]
          )
        ])
      end
    end

    test "the database rejects an unknown plan kind" do
      coach = insert(:coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [plan_row(coach, kind: "program")])
      end
    end

    test "the database requires a menu document with its root collections" do
      coach = insert(:coach)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [plan_row(coach, menu: %{})])
      end
    end

    test "an active client has at most one incomplete Client Plan" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      insert(:plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: nil,
        end_date: nil
      )

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [
          plan_row(coach,
            kind: "client_plan",
            client_id: dump_uuid(client.id),
            start_date: nil,
            end_date: nil
          )
        ])
      end
    end

    test "unarchived Client Plan Coverage cannot overlap, including an open-ended range" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      insert(:plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: ~D[2026-08-01],
        end_date: ~D[2026-08-31]
      )

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_plans", [
          plan_row(coach,
            kind: "client_plan",
            client_id: dump_uuid(client.id),
            start_date: ~D[2026-08-15],
            end_date: nil
          )
        ])
      end
    end

    test "adjacent non-overlapping Coverage is accepted" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      insert(:plan,
        business: coach.business,
        creator: coach.user,
        client: client,
        kind: :client_plan,
        start_date: ~D[2026-08-01],
        end_date: ~D[2026-08-31]
      )

      {1, _} =
        Repo.insert_all("nutrition_plans", [
          plan_row(coach,
            kind: "client_plan",
            client_id: dump_uuid(client.id),
            start_date: ~D[2026-09-01],
            end_date: nil
          )
        ])
    end

    test "retained Library rows survive the Programming reset" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach, name: "Kept Food")
      recipe = insert(:recipe, business: coach.business, creator: coach, name: "Kept Recipe")
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      assert Repo.get!(Easy.Nutrition.Food, food.id).name == "Kept Food"
      assert Repo.get!(Easy.Nutrition.Recipe, recipe.id).name == "Kept Recipe"
      assert Repo.get!(Easy.Clients.Client, client.id)
      assert Repo.get!(Easy.Orgs.Business, coach.business_id)
    end
  end

  describe("Library structural foreign keys") do
    test "Recipe Ingredients restrict Food deletion" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)
      insert(:recipe_ingredient, business: coach.business, recipe: recipe, food: food, weight_g: 100.0)
      assert_raise Ecto.ConstraintError, fn -> Repo.delete!(Repo.get!(Food, food.id)) end
    end

    test "Diary entries nullify Food deletion" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

      food =
        insert(:food,
          business: coach.business,
          creator: coach,
          name: "Banana",
          calories_per_100g: 90.0
        )

      today = Date.utc_today()

      client_ctx = %Easy.Ctx{
        business_id: client.business_id,
        user_id: client.user_id,
        client_id: client.id
      }

      assert {:ok, day} =
               DiaryFixtures.save_extra(
                 client_ctx,
                 today,
                 %{meal_slot: :breakfast, food_id: food.id, portion: %{kind: :gram, grams: 100.0}}
               )

      entry = hd(day.slots).rows |> Enum.find(& &1.entry_id)
      Repo.delete!(Repo.get!(Food, food.id))
      kept = Repo.get!(DiaryEntry, entry.id)
      assert kept.food_id == nil
      assert kept.display_name == "Banana"
    end
  end

  describe("canonical Nutrition Diary constraints") do
    test "cascade and Diary lookup indexes cover their leading foreign-key filters" do
      rows =
        Repo.query!("SELECT indexname\nFROM pg_indexes\nWHERE schemaname = current_schema()\n  AND indexname IN (\n    'nutrition_diary_entries_business_slot_index'\n  )\n").rows

      assert MapSet.new(rows, fn [name] -> name end) ==
               MapSet.new([
                 "nutrition_diary_entries_business_slot_index"
               ])
    end

    test "the database rejects a duplicate Diary Slot identity" do
      client = insert(:client)
      today = Date.utc_today()
      Repo.insert_all("nutrition_diary_slots", [diary_slot_row(client, today)])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_diary_slots", [diary_slot_row(client, today)])
      end
    end

    test "the database rejects an active option that belongs to another Diary Slot" do
      client = insert(:client)
      today = Date.utc_today()
      slot_a = diary_slot_row(client, today)
      slot_b = diary_slot_row(client, today, meal_slot: "lunch")
      option_b = frozen_option_row(client, slot_b.id)
      Repo.insert_all("nutrition_diary_slots", [slot_a, slot_b])
      Repo.insert_all("nutrition_diary_frozen_options", [option_b])
      Repo.query!("SET CONSTRAINTS nutrition_diary_slots_active_option_fkey IMMEDIATE")

      assert_raise Postgrex.Error, fn ->
        Repo.query!(
          "UPDATE nutrition_diary_slots SET active_frozen_option_id = $1 WHERE id = $2",
          [option_b.id, slot_a.id]
        )
      end
    end

    test "the database rejects two fulfilments of one frozen planned item" do
      client = insert(:client)
      food = insert(:food, business: client.business)
      today = Date.utc_today()
      slot = diary_slot_row(client, today)
      option = frozen_option_row(client, slot.id)
      item_id = dump_uuid()
      Repo.insert_all("nutrition_diary_slots", [slot])
      Repo.insert_all("nutrition_diary_frozen_options", [option])

      Repo.insert_all("nutrition_diary_frozen_planned_items", [
        timestamps(%{
          id: item_id,
          source_meal_item_id: dump_uuid(),
          kind: "food",
          display_name: "Oats",
          portion_kind: "gram",
          weight_g: 50.0,
          complete: false,
          position: 0,
          business_id: dump_uuid(client.business_id),
          nutrition_diary_slot_id: slot.id,
          nutrition_diary_frozen_option_id: option.id,
          food_id: dump_uuid(food.id),
          source_food_id: dump_uuid(food.id)
        })
      ])

      entry = fn ->
        timestamps(%{
          id: dump_uuid(),
          kind: "food",
          display_name: "Oats",
          portion_kind: "gram",
          weight_g: 50.0,
          complete: false,
          business_id: dump_uuid(client.business_id),
          client_id: dump_uuid(client.id),
          nutrition_diary_slot_id: slot.id,
          frozen_planned_item_id: item_id,
          food_id: dump_uuid(food.id),
          source_food_id: dump_uuid(food.id)
        })
      end

      Repo.insert_all("nutrition_diary_entries", [entry.()])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_diary_entries", [entry.()])
      end
    end

    test "a Diary Entry cannot carry a different client from its Diary Slot" do
      business = insert(:business)
      slot_client = insert(:client, business: business)
      other_client = insert(:client, business: business)
      slot = diary_slot_row(slot_client, Date.utc_today())
      Repo.insert_all("nutrition_diary_slots", [slot])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_diary_entries", [diary_entry_row(other_client, slot.id)])
      end
    end

    test "a Diary Entry's frozen option must belong to its Diary Slot" do
      client = insert(:client)
      today = Date.utc_today()
      entry_slot = diary_slot_row(client, today)
      other_slot = diary_slot_row(client, today, meal_slot: "lunch")
      other_option = frozen_option_row(client, other_slot.id)
      Repo.insert_all("nutrition_diary_slots", [entry_slot, other_slot])
      Repo.insert_all("nutrition_diary_frozen_options", [other_option])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_diary_entries", [
          diary_entry_row(client, entry_slot.id, frozen_option_id: other_option.id)
        ])
      end
    end
  end

  defp plan_row(coach, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          kind: "template",
          name: "Row",
          menu: Menu.format(Menu.empty()),
          revision: 1,
          business_id: dump_uuid(coach.business_id),
          creator_id: dump_uuid(coach.user_id)
        },
        Map.new(overrides)
      )
    )
  end

  defp timestamps(attrs) do
    now = DateTime.utc_now(:second)
    Map.merge(%{inserted_at: now, updated_at: now}, attrs)
  end

  defp diary_slot_row(client, date, overrides \\ []) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          local_date: date,
          meal_slot: "breakfast",
          applied_timezone: "Asia/Kolkata",
          has_coverage: false,
          revision: 1,
          business_id: dump_uuid(client.business_id),
          client_id: dump_uuid(client.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp frozen_option_row(client, slot_id) do
    timestamps(%{
      id: dump_uuid(),
      position: 0,
      meal_name: "Lunch",
      source_meal_id: dump_uuid(),
      business_id: dump_uuid(client.business_id),
      nutrition_diary_slot_id: slot_id
    })
  end

  defp diary_entry_row(client, slot_id, overrides \\ []) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          kind: "food",
          display_name: "Oats",
          portion_kind: "gram",
          weight_g: 50.0,
          complete: false,
          business_id: dump_uuid(client.business_id),
          client_id: dump_uuid(client.id),
          nutrition_diary_slot_id: slot_id,
          source_food_id: dump_uuid()
        },
        Map.new(overrides)
      )
    )
  end

  defp dump_uuid(uuid \\ Ecto.UUID.generate()) do
    Ecto.UUID.dump!(uuid)
  end
end
