defmodule Easy.Nutrition.CanonicalSchemaTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{Diary, DiaryEntry, Food, Programming, Recipe}

  describe "canonical Nutrition Programming constraints" do
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

    test "Day Pattern positions are nonnegative and unique within a plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_day_patterns", [
          timestamps(%{
            id: dump_uuid(),
            name: "Invalid",
            position: -1,
            business_id: dump_uuid(coach.business_id),
            nutrition_plan_id: dump_uuid(plan.id)
          })
        ])
      end

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_day_patterns", [pattern_row(coach, plan, position: 0)])
      end
    end

    test "a schedule row cannot point at a Day Pattern from another plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, first} = Programming.create_template(ctx, %{"name" => "First"})
      assert {:ok, second} = Programming.create_template(ctx, %{"name" => "Second"})
      pattern = hd(first.day_patterns)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_week_schedule", [
          timestamps(%{
            id: dump_uuid(),
            weekday: "monday",
            business_id: dump_uuid(coach.business_id),
            nutrition_plan_id: dump_uuid(second.id),
            nutrition_day_pattern_id: dump_uuid(pattern.id)
          })
        ])
      end
    end

    test "a plan has at most one Day Pattern per weekday" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      pattern = hd(plan.day_patterns)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_week_schedule", [
          schedule_row(coach, plan, pattern, weekday: "monday")
        ])
      end
    end

    test "Meal positions are nonnegative and unique within a plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meals", [meal_row(coach, plan, position: -1)])
      end

      Repo.insert_all("nutrition_meals", [meal_row(coach, plan, position: 0)])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meals", [meal_row(coach, plan, position: 0)])
      end
    end

    test "a Menu Item cannot belong to a Meal from another plan" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, first} = Programming.create_template(ctx, %{"name" => "First"})
      assert {:ok, second} = Programming.create_template(ctx, %{"name" => "Second"})
      food = insert(:food, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, first)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, second, meal_id, food, nutrition_plan_id: dump_uuid(second.id))
        ])
      end
    end

    test "a Menu Item requires exactly one of food_id or recipe_id" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, plan, meal_id, food, food_id: nil, recipe_id: nil)
        ])
      end

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, plan, meal_id, food,
            food_id: dump_uuid(food.id),
            recipe_id: dump_uuid(recipe.id)
          )
        ])
      end
    end

    test "gram Portions require positive grams and null serving fields" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, plan, meal_id, food, weight_g: 0)
        ])
      end

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, plan, meal_id, food, amount: 1.0, unit: "cup")
        ])
      end
    end

    test "Menu Item positions are unique within a Meal" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])

      Repo.insert_all("nutrition_meal_items", [meal_item_row(coach, plan, meal_id, food)])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [meal_item_row(coach, plan, meal_id, food)])
      end
    end

    test "nutrient columns reject negative values" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      food = insert(:food, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_items", [
          meal_item_row(coach, plan, meal_id, food, calories: -1.0)
        ])
      end
    end

    test "the database rejects an incomplete Week Schedule at transaction commit" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})

      assert_raise Postgrex.Error, fn ->
        Repo.transaction(fn ->
          Repo.query!("SET CONSTRAINTS ALL IMMEDIATE")

          Repo.delete_all(from(row in "nutrition_week_schedule", where: row.nutrition_plan_id == ^dump_uuid(plan.id)))
        end)
      end
    end

    test "Meal Options use the closed Meal Slot vocabulary and unique Meal plus position per slot" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      pattern = hd(plan.day_patterns)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_options", [
          option_row(coach, plan, pattern, meal_id, meal_slot: "brunch")
        ])
      end

      Repo.insert_all("nutrition_meal_options", [option_row(coach, plan, pattern, meal_id)])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_options", [option_row(coach, plan, pattern, meal_id, position: 1)])
      end

      {1, [%{id: other_meal_id}]} =
        Repo.insert_all("nutrition_meals", [meal_row(coach, plan, position: 1)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_options", [
          option_row(coach, plan, pattern, other_meal_id, position: 0)
        ])
      end
    end

    test "a schedule row cannot carry another business's tenant id" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      other_business = insert(:business)

      assert_raise Postgrex.Error, fn ->
        Repo.query!(
          """
          UPDATE nutrition_week_schedule
          SET business_id = $1
          WHERE nutrition_plan_id = $2 AND weekday = 'monday'
          """,
          [dump_uuid(other_business.id), dump_uuid(plan.id)]
        )
      end
    end

    test "a Meal Option cannot carry another business's tenant id" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      pattern = hd(plan.day_patterns)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])
      other_business = insert(:business)

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_options", [
          option_row(coach, plan, pattern, meal_id, business_id: dump_uuid(other_business.id))
        ])
      end
    end

    test "a Meal Option cannot reference a Meal from another plan, and a slot has no option-count limit" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, first} = Programming.create_template(ctx, %{"name" => "First"})
      assert {:ok, second} = Programming.create_template(ctx, %{"name" => "Second"})
      pattern = hd(first.day_patterns)
      {1, [%{id: foreign_meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, second)], returning: [:id])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_meal_options", [
          option_row(coach, first, pattern, foreign_meal_id, nutrition_plan_id: dump_uuid(first.id))
        ])
      end

      meal_ids =
        Enum.map(0..3, fn position ->
          {1, [%{id: meal_id}]} =
            Repo.insert_all("nutrition_meals", [meal_row(coach, first, position: position)], returning: [:id])

          meal_id
        end)

      Enum.with_index(meal_ids, fn meal_id, position ->
        {1, _} =
          Repo.insert_all("nutrition_meal_options", [
            option_row(coach, first, pattern, meal_id, position: position)
          ])
      end)

      assert Repo.aggregate(
               from(option in "nutrition_meal_options", where: option.nutrition_plan_id == ^dump_uuid(first.id)),
               :count
             ) == 4
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

  describe "Library structural foreign keys" do
    test "Menu Items and Recipe Ingredients restrict Food deletion" do
      coach = insert(:coach)
      food = insert(:food, business: coach.business, creator: coach)
      recipe = insert(:recipe, business: coach.business, creator: coach)
      insert(:recipe_ingredient, business: coach.business, recipe: recipe, food: food, weight_g: 100.0)

      assert_raise Ecto.ConstraintError, fn ->
        Repo.delete!(Repo.get!(Food, food.id))
      end

      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])
      unused = insert(:food, business: coach.business, creator: coach)
      Repo.insert_all("nutrition_meal_items", [meal_item_row(coach, plan, meal_id, unused)])

      assert_raise Ecto.ConstraintError, fn ->
        Repo.delete!(Repo.get!(Food, unused.id))
      end
    end

    test "Menu Items restrict Recipe deletion" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, plan} = Programming.create_template(ctx, %{"name" => "Cut"})
      recipe = insert(:recipe, business: coach.business, creator: coach)
      {1, [%{id: meal_id}]} = Repo.insert_all("nutrition_meals", [meal_row(coach, plan)], returning: [:id])

      Repo.insert_all("nutrition_meal_items", [
        meal_item_row(coach, plan, meal_id, recipe,
          food_id: nil,
          recipe_id: dump_uuid(recipe.id)
        )
      ])

      assert_raise Ecto.ConstraintError, fn ->
        Repo.delete!(Repo.get!(Recipe, recipe.id))
      end
    end

    test "Diary entries nullify Food deletion" do
      coach = insert(:coach)
      client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)
      food = insert(:food, business: coach.business, creator: coach, name: "Banana", calories_per_100g: 90.0)
      today = Date.utc_today()

      client_ctx = %Easy.Ctx{business_id: client.business_id, user_id: client.user_id, client_id: client.id}

      assert {:ok, day} =
               Diary.add_client_extra(
                 client_ctx,
                 today,
                 %{meal_slot: :breakfast, food_id: food.id, portion: %{kind: :gram, grams: 100.0}},
                 Ecto.UUID.generate()
               )

      entry = hd(day.slots).rows |> Enum.find(& &1.entry) |> Map.fetch!(:entry)
      Repo.delete!(Repo.get!(Food, food.id))
      kept = Repo.get!(DiaryEntry, entry.id)
      assert kept.food_id == nil
      assert kept.display_name == "Banana"
    end
  end

  describe "canonical Nutrition Diary constraints" do
    test "the database rejects a duplicate Diary Slot identity" do
      client = insert(:client)
      today = Date.utc_today()

      Repo.insert_all("nutrition_diary_slots", [diary_slot_row(client, today)])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_diary_slots", [diary_slot_row(client, today)])
      end
    end

    test "the database rejects a duplicate idempotency key for one client" do
      client = insert(:client)
      key = dump_uuid()

      Repo.insert_all("nutrition_diary_command_ledger", [ledger_row(client, key)])

      assert_raise Postgrex.Error, fn ->
        Repo.insert_all("nutrition_diary_command_ledger", [ledger_row(client, key)])
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
          revision: 1,
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
  end

  defp plan_row(coach, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          kind: "template",
          name: "Row",
          revision: 1,
          business_id: dump_uuid(coach.business_id),
          creator_id: dump_uuid(coach.user_id)
        },
        Map.new(overrides)
      )
    )
  end

  defp pattern_row(coach, plan, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          name: "Extra",
          position: 0,
          business_id: dump_uuid(coach.business_id),
          nutrition_plan_id: dump_uuid(plan.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp schedule_row(coach, plan, pattern, overrides) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          weekday: "monday",
          business_id: dump_uuid(coach.business_id),
          nutrition_plan_id: dump_uuid(plan.id),
          nutrition_day_pattern_id: dump_uuid(pattern.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp meal_row(coach, plan, overrides \\ []) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          name: "Breakfast",
          position: 0,
          business_id: dump_uuid(coach.business_id),
          nutrition_plan_id: dump_uuid(plan.id)
        },
        Map.new(overrides)
      )
    )
  end

  defp meal_item_row(coach, plan, meal_id, food, overrides \\ []) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          portion_kind: "gram",
          weight_g: 50.0,
          amount: nil,
          unit: nil,
          serving_label: nil,
          position: 0,
          complete: false,
          food_id: dump_uuid(food.id),
          recipe_id: nil,
          business_id: dump_uuid(coach.business_id),
          nutrition_plan_id: dump_uuid(plan.id),
          nutrition_meal_id: meal_id
        },
        Map.new(overrides)
      )
    )
  end

  defp option_row(coach, plan, pattern, meal_id, overrides \\ []) do
    timestamps(
      Map.merge(
        %{
          id: dump_uuid(),
          meal_slot: "breakfast",
          position: 0,
          business_id: dump_uuid(coach.business_id),
          nutrition_plan_id: dump_uuid(plan.id),
          nutrition_day_pattern_id: dump_uuid(pattern.id),
          nutrition_meal_id: meal_id
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

  defp ledger_row(client, key) do
    now = DateTime.utc_now(:second)

    timestamps(%{
      id: dump_uuid(),
      idempotency_key: key,
      fingerprint: "abc",
      expires_at: DateTime.add(now, 30, :day),
      business_id: dump_uuid(client.business_id),
      client_id: dump_uuid(client.id)
    })
  end

  defp dump_uuid(uuid \\ Ecto.UUID.generate()), do: Ecto.UUID.dump!(uuid)
end
