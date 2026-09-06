defmodule Easy.Nutrition.CutoverTest do
  alias Easy.Nutrition.DiaryFixtures
  import Easy.Nutrition.ProgrammingMenuFixtures, only: [uuid: 1]
  use Easy.SchemaCase, async: false
  alias Easy.LocalCalendar
  alias Easy.Nutrition.{Library, Programming, WeekSchedule}
  alias Easy.Repo

  @legacy_tables [
    "nutrition_meal_logs",
    "nutrition_food_log_entries",
    "nutrition_plan_days",
    "nutrition_day_meals",
    "nutrition_weekday_assignments"
  ]
  @retained_tables [
    "nutrition_foods",
    "nutrition_recipes",
    "library_media",
    "businesses",
    "clients"
  ]
  @legacy_files [
    "lib/easy/meal_logs.ex",
    "lib/easy/meal_slot.ex",
    "lib/easy/macro_calc.ex",
    "lib/easy/nutrition/meal_log.ex",
    "lib/easy/nutrition/food_log_entry.ex",
    "lib/easy/nutrition/plan_day.ex",
    "lib/easy/nutrition/day_meal.ex",
    "lib/easy_web/controllers/clients/meal_log_controller.ex",
    "lib/easy_web/controllers/coaches/meal_log_controller.ex",
    "lib/easy_web/controllers/clients/food_log_entry_controller.ex",
    "lib/easy_web/open_api/schemas/logging.ex"
  ]
  test "legacy Programming and Diary tables are gone while Library rows remain" do
    coach = insert(:coach)
    food = insert(:food, business: coach.business, creator: coach, name: "Kept oats")
    recipe = insert(:recipe, business: coach.business, creator: coach)
    media = insert(:library_media, business: coach.business, uploaded_by_id: coach.user_id)
    assert Repo.get!(Easy.Nutrition.Food, food.id).name == "Kept oats"
    assert Repo.get!(Easy.Nutrition.Recipe, recipe.id).id == recipe.id
    assert Repo.get!(Easy.LibraryMedia.Media, media.id).id == media.id
    assert Repo.get!(Easy.Orgs.Business, coach.business_id).id == coach.business_id
    assert Repo.get!(Easy.Orgs.Coach, coach.id).id == coach.id

    for table <- @legacy_tables do
      assert {:ok, %{rows: [[false]]}} = Repo.query("SELECT to_regclass($1) IS NOT NULL", [table]),
             table
    end

    for table <- @retained_tables do
      assert {:ok, %{rows: [[true]]}} = Repo.query("SELECT to_regclass($1) IS NOT NULL", [table]),
             table
    end
  end

  test "replaced MealLogs, child-route, and raw-log modules are deleted" do
    for path <- @legacy_files do
      refute File.exists?(Path.join(File.cwd!(), path)), path
    end
  end

  test "factories and public modules rebuild Library, Programming, and Diary without discarded ids" do
    coach = insert(:coach)
    client = insert(:client, business: coach.business, creator: coach, assigned_coach: coach)

    food =
      insert(:food,
        business: coach.business,
        creator: coach,
        name: "Oats",
        calories_per_100g: 389.0
      )

    extra = insert(:food, business: coach.business, creator: coach, name: "Banana")
    recipe = insert(:recipe, business: coach.business, creator: coach)

    insert(:recipe_ingredient,
      business: coach.business,
      recipe: recipe,
      food: food,
      weight_g: 80.0
    )

    ctx = trainer_ctx(coach)

    client_ctx = %Easy.Ctx{
      business_id: client.business_id,
      user_id: client.user_id,
      client_id: client.id
    }

    today = local_today(client)
    assert {:ok, _library_food} = Library.get_food(ctx, food.id)
    assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
    pattern = hd(template.day_patterns)

    menu = %{
      meals: [
        %{
          id: uuid("breakfast"),
          name: "Oats",
          position: 0,
          meal_items: [
            %{
              id: uuid("oats"),
              kind: :food,
              food_id: food.id,
              position: 0,
              portion: %{kind: :gram, grams: 50.0}
            }
          ]
        }
      ],
      day_patterns: [
        %{
          id: pattern.id,
          name: pattern.name,
          position: 0,
          slots: [
            %{
              meal_slot: :breakfast,
              options: [%{id: uuid("opt"), nutrition_meal_id: uuid("breakfast")}]
            }
          ]
        }
      ],
      schedule: Map.new(WeekSchedule.weekdays(), &{&1, pattern.id})
    }

    assert {:ok, source} = Programming.replace_menu(ctx, template.id, 1, menu)

    assert {:ok, plan} =
             Programming.assign_template_to_client(ctx, client.id, source.id, 2, %{
               "start_date" => Date.to_iso8601(today),
               "end_date" => nil
             })

    item_id = hd(hd(plan.meals).meal_items).id

    assert {:ok, planned} =
             DiaryFixtures.save_extra(
               client_ctx,
               today,
               %{
                 meal_slot: :breakfast,
                 planned_item_ref: item_id,
                 portion: %{kind: :gram, grams: 50.0}
               }
             )

    assert hd(planned.slots).rows |> Enum.any?(&(&1.status == :as_planned))

    assert {:ok, with_extra} =
             DiaryFixtures.save_extra(
               client_ctx,
               today,
               %{meal_slot: :breakfast, food_id: extra.id, portion: %{kind: :gram, grams: 80.0}}
             )

    assert Enum.any?(hd(with_extra.slots).rows, &(&1.status == :added))
    uncovered = Date.add(today, -1)

    assert {:ok, recorded} =
             DiaryFixtures.save_extra(
               client_ctx,
               uncovered,
               %{meal_slot: :lunch, food_id: extra.id, portion: %{kind: :gram, grams: 40.0}}
             )

    assert Enum.any?(recorded.slots, fn slot ->
             slot.meal_slot == :lunch and Enum.any?(slot.rows, &(&1.status == :recorded))
           end)

    assert %DateTime{} = Easy.Repo.reload(client).last_active_at
  end

  defp local_today(client) do
    timezone =
      LocalCalendar.applied_timezone(client.timezone, client.business && client.business.timezone)

    LocalCalendar.to_local_date(DateTime.utc_now(), timezone)
  end
end
