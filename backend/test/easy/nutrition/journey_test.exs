defmodule Easy.Nutrition.JourneyTest do
  alias Easy.Nutrition.DiaryFixtures
  import Easy.Nutrition.ProgrammingMenuFixtures, only: [uuid: 1]
  use Easy.SchemaCase, async: false
  alias Easy.LocalCalendar
  alias Easy.Nutrition.{Library, Menu, Programming}

  test "a coach builds a menu, assigns it, and the client records intake" do
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
      portion: %{kind: :gram, grams: 80.0}
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
    pattern = hd(template.menu.day_patterns)

    menu = %{
      meals: [
        %{
          id: uuid("breakfast"),
          name: "Oats",
          meal_items: [
            %{id: uuid("oats"), kind: :food, food_id: food.id, portion: %{kind: :gram, grams: 50.0}}
          ]
        }
      ],
      day_patterns: [
        %{id: pattern.id, name: pattern.name, slots: [%{meal_slot: :breakfast, meal_ids: [uuid("breakfast")]}]}
      ],
      schedule: Map.new(Menu.weekdays(), &{&1, pattern.id})
    }

    assert {:ok, source} = Programming.replace_menu(ctx, template.id, 1, menu)

    assert {:ok, plan} =
             Programming.assign_template_to_client(ctx, client.id, source.id, %{
               "start_date" => Date.to_iso8601(today),
               "end_date" => nil
             })

    item_id = hd(hd(plan.menu.meals).meal_items).id

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
