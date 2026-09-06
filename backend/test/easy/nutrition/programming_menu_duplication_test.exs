defmodule Easy.Nutrition.ProgrammingMenuDuplicationTest do
  use Easy.DataCase, async: true

  alias Easy.Nutrition.{Library, Programming}

  import Easy.Nutrition.ProgrammingMenuFixtures

  describe "duplicate_template/2" do
    test "copies Meals, Menu Items, Day Patterns, and the Week Schedule onto the new Template" do
      coach = insert(:coach)
      ctx = trainer_ctx(coach)
      assert {:ok, template} = Programming.create_template(ctx, %{"name" => "Cut"})
      pattern = hd(template.menu.day_patterns)
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
                           meal_ids: [uuid("breakfast")]
                         }
                       ]
                     }
                   ],
                   schedule: schedule_for(pattern.id)
                 }
               )

      assert {:ok, copy} = Programming.duplicate_template(ctx, source.id)
      assert copy.id != source.id
      assert copy.revision == 1
      assert copy.menu == source.menu
      assert {:ok, _} = Library.update_food(ctx, food.id, food.revision, %{calories_per_100g: 999.0})
      assert {:ok, second_copy} = Programming.duplicate_template(ctx, source.id)
      {:ok, live_source} = Programming.get_template(ctx, source.id)
      assert second_copy.menu == live_source.menu
    end
  end
end
