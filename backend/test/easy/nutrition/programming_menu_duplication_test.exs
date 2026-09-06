defmodule Easy.Nutrition.ProgrammingMenuDuplicationTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.Programming

  import Easy.Nutrition.ProgrammingMenuFixtures

  describe "duplicate_template/3" do
    test "copies Meals, Menu Items, Meal Options, and the Week Schedule onto the new Template" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      pattern = hd(template.day_patterns)
      food = insert(:food, business: coach.business, creator: coach)

      assert {:ok, source} =
               Programming.replace_menu(
                 ctx,
                 template.id,
                 1,
                 %{
                   meals: [
                     meal_input("breakfast", "Breakfast", [
                       food_item("yogurt", food.id, %{kind: :gram, grams: 50})
                     ])
                   ],
                   day_patterns: [
                     %{
                       id: pattern.id,
                       name: pattern.name,
                       slots: [
                         %{
                           meal_slot: :breakfast,
                           options: [
                             %{id: uuid("opt"), nutrition_meal_id: uuid("breakfast")}
                           ]
                         }
                       ]
                     }
                   ],
                   schedule: schedule_for(pattern.id)
                 }
               )

      assert {:ok, copy} = Programming.duplicate_template(ctx, source.id, 2)
      assert [%{name: "Breakfast", id: copy_meal_id, meal_items: [item]}] = copy.meals
      assert copy_meal_id != hd(source.meals).id
      assert item.food_id == food.id
      assert item.weight_g == 50.0
      assert item.id != hd(hd(source.meals).meal_items).id
      assert [%{id: copy_pattern_id, meal_options: [option]}] = copy.day_patterns
      assert copy_pattern_id != hd(source.day_patterns).id
      assert option.nutrition_meal_id == copy_meal_id
      assert option.meal_slot == :breakfast
      assert option.position == 0
      assert option.id != hd(hd(source.day_patterns).meal_options).id
      assert Enum.all?(copy.week_schedule, &(&1.nutrition_day_pattern_id == copy_pattern_id))
    end
  end
end
